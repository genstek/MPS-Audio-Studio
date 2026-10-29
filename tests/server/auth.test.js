import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { SCRYPT_COST, hashPassword } from '../../server/security.js';
import { client, latestMail, linkToken, startTestServer } from './helpers.js';

let server;
beforeEach(async () => { server = await startTestServer(); });
afterEach(async () => { await server.stop(); });

const PASSWORD = 'correct horse battery';

describe('LAS-21 registration, verification, login and logout', () => {
  test('register, verify by link, sign in, reach a protected endpoint, sign out', async () => {
    const user = client(server);
    const registered = await user.request('/api/auth/register', { method: 'POST', body: { email: 'Ada@Example.test ', password: PASSWORD } });
    expect(registered.status).toBe(202);
    const mail = await latestMail(server, 'ada@example.test');
    expect(mail.subject).toBe('Verify your MPS Audio Studio email');
    expect(mail.body).toContain('http://studio.test/#verify='); // fragment: never sent to a server

    const verified = await user.request('/api/auth/verify', { method: 'POST', body: { token: linkToken(mail, 'verify') } });
    expect(verified).toMatchObject({ status: 200, data: { verified: true } });

    const login = await user.request('/api/auth/login', { method: 'POST', body: { email: 'ada@example.test', password: PASSWORD } });
    expect(login.status).toBe(200);
    expect(login.headers.get('set-cookie')).toMatch(/^mps_session=[\w-]{43}; HttpOnly; SameSite=Lax; Path=\/; Max-Age=604800$/);
    expect((await user.request('/api/auth/session')).data).toEqual({ user: { email: 'ada@example.test' } });
    expect(await user.request('/api/account')).toMatchObject({ status: 200, data: { email: 'ada@example.test' } });

    const stolen = user.cookie;
    expect((await user.request('/api/auth/logout', { method: 'POST' })).status).toBe(204);
    expect(user.cookie).toBe('');
    // The old cookie no longer works anywhere, not just in the UI.
    const replay = client(server);
    replay.cookie = stolen;
    expect((await replay.request('/api/account')).status).toBe(401);
    expect((await replay.request('/api/auth/session')).data).toEqual({ user: null });
  });

  test('unknown email and wrong password get the same answer; unverified is only revealed after the right password', async () => {
    const user = client(server);
    await user.request('/api/auth/register', { method: 'POST', body: { email: 'bob@example.test', password: PASSWORD } });
    const unknown = await user.request('/api/auth/login', { method: 'POST', body: { email: 'nobody@example.test', password: PASSWORD } });
    const wrong = await user.request('/api/auth/login', { method: 'POST', body: { email: 'bob@example.test', password: 'wrong password!' } });
    expect(unknown).toMatchObject({ status: 401, data: { error: 'invalid_credentials', message: 'Email or password is incorrect.' } });
    expect(wrong.status).toBe(unknown.status);
    expect(wrong.data).toEqual(unknown.data);
    const unverified = await user.request('/api/auth/login', { method: 'POST', body: { email: 'bob@example.test', password: PASSWORD } });
    expect(unverified).toMatchObject({ status: 403, data: { error: 'unverified' } });
    expect(user.cookie).toBe('');
    expect((await user.request('/api/account')).status).toBe(401);
  });

  test('registering an existing address answers the same and changes nothing', async () => {
    const first = client(server);
    await first.request('/api/auth/register', { method: 'POST', body: { email: 'cy@example.test', password: PASSWORD } });
    await first.request('/api/auth/verify', { method: 'POST', body: { token: linkToken(await latestMail(server, 'cy@example.test'), 'verify') } });
    const again = await client(server).request('/api/auth/register', { method: 'POST', body: { email: 'cy@example.test', password: 'another password 2' } });
    expect(again.status).toBe(202);
    expect((await latestMail(server, 'cy@example.test')).subject).toBe('Someone tried to register with your email');
    expect((await first.request('/api/auth/login', { method: 'POST', body: { email: 'cy@example.test', password: PASSWORD } })).status).toBe(200);
    expect((await client(server).request('/api/auth/login', { method: 'POST', body: { email: 'cy@example.test', password: 'another password 2' } })).status).toBe(401);
  });

  test('verification links work once, expire after 24 hours and are replaced by a resend', async () => {
    const user = client(server);
    await user.request('/api/auth/register', { method: 'POST', body: { email: 'dee@example.test', password: PASSWORD } });
    const first = linkToken(await latestMail(server, 'dee@example.test'), 'verify');
    await user.request('/api/auth/resend-verification', { method: 'POST', body: { email: 'dee@example.test' } });
    const second = linkToken(await latestMail(server, 'dee@example.test'), 'verify');
    expect((await user.request('/api/auth/verify', { method: 'POST', body: { token: first } })).status).toBe(400);
    server.clock.now += 24 * 60 * 60 * 1000;
    expect((await user.request('/api/auth/verify', { method: 'POST', body: { token: second } })).status).toBe(400);

    await user.request('/api/auth/resend-verification', { method: 'POST', body: { email: 'dee@example.test' } });
    const third = linkToken(await latestMail(server, 'dee@example.test'), 'verify');
    expect((await user.request('/api/auth/verify', { method: 'POST', body: { token: third } })).status).toBe(200);
    expect((await user.request('/api/auth/verify', { method: 'POST', body: { token: third } })).status).toBe(400);
    expect((await user.request('/api/auth/verify', { method: 'POST', body: { token: 'forged-token' } })).status).toBe(400);
  });

  test('state changes need the studio header and an allowed origin', async () => {
    const body = { email: 'eve@example.test', password: PASSWORD };
    expect((await client(server, { studioHeader: false }).request('/api/auth/register', { method: 'POST', body })).status).toBe(403);
    expect((await client(server, { origin: 'https://evil.example' }).request('/api/auth/register', { method: 'POST', body })).status).toBe(403);
    expect((await client(server).request('/api/auth/register', { method: 'POST', body, headers: { 'Sec-Fetch-Site': 'cross-site' } })).status).toBe(403);
    expect((await latestMail(server, 'eve@example.test'))).toBeUndefined();
    expect((await client(server, { studioHeader: false }).request('/api/auth/session')).status).toBe(200);
  });

  test('invalid input is rejected with clear errors', async () => {
    const user = client(server);
    expect((await user.request('/api/auth/register', { method: 'POST', body: { email: 'not-an-email', password: PASSWORD } })).data.error).toBe('invalid_email');
    expect((await user.request('/api/auth/register', { method: 'POST', body: { email: 'f@example.test', password: 'short' } })).data.error).toBe('invalid_password');
    expect((await user.request('/api/auth/register', { method: 'POST', body: { email: 'f@example.test', password: 'x'.repeat(129) } })).data.error).toBe('invalid_password');
    expect((await user.request('/api/auth/register', { method: 'POST', body: Buffer.from('{}'), headers: { 'Content-Type': 'text/plain' } })).status).toBe(415);
    expect((await user.request('/api/auth/register', { method: 'POST', body: { email: 'f@example.test', password: 'x'.repeat(70000) } })).status).toBe(413);
  });

  test('secrets are not stored, logged or exposed in plain form', async () => {
    const user = client(server);
    await user.request('/api/auth/register', { method: 'POST', body: { email: 'gil@example.test', password: PASSWORD } });
    const token = linkToken(await latestMail(server, 'gil@example.test'), 'verify');
    await user.request(`/api/auth/verify?debug=${token}`, { method: 'POST', body: { token } });
    await user.request('/api/auth/login', { method: 'POST', body: { email: 'gil@example.test', password: PASSWORD } });
    const sessionToken = user.cookie.split('=')[1];

    const userRow = server.db.prepare('SELECT * FROM users').get();
    expect(Object.values(userRow).join(' ')).not.toContain(PASSWORD);
    expect(userRow.password_hash).toMatch(/^1024\$[0-9a-f]{128}$/);
    const tables = ['sessions', 'email_tokens', 'audit'].map(table => JSON.stringify(server.db.prepare(`SELECT * FROM ${table}`).all())).join(' ');
    expect(tables).not.toContain(sessionToken);
    expect(tables).not.toContain(token);
    expect(tables).not.toContain('gil@example.test');
    const logText = server.logs.join('\n');
    for (const secret of [PASSWORD, token, sessionToken, 'debug=']) expect(logText).not.toContain(secret);
    expect(server.logs).toContain('POST /api/auth/verify 200 0ms');
    expect(statSync(join(server.dataDir, 'server-secret')).mode & 0o777).toBe(0o600);
    expect(readFileSync(join(server.dataDir, 'server-secret'), 'utf8')).toHaveLength(43);
  });

  test('production password hashing uses scrypt N=2^15', async () => {
    expect(SCRYPT_COST).toBe(32768);
    expect((await hashPassword(PASSWORD)).hash).toMatch(/^32768\$[0-9a-f]{128}$/);
  });

  test('development endpoints exist only when enabled', async () => {
    const plain = await startTestServer({ devEndpoints: false });
    expect((await client(plain).request('/api/dev/outbox?to=a@example.test')).status).toBe(404);
    await plain.stop();
  });
});
