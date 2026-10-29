import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { client, latestMail, linkToken, signedInUser, startTestServer } from './helpers.js';

let server;
beforeEach(async () => { server = await startTestServer(); });
afterEach(async () => { await server.stop(); });

const OLD = 'correct horse battery';
const NEW = 'a brand new password';
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

async function resetLink(email) {
  await client(server).request('/api/auth/recover', { method: 'POST', body: { email } });
  return linkToken(await latestMail(server, email), 'reset');
}

describe('LAS-22 password recovery', () => {
  test('a reset link changes the password and signs out every session', async () => {
    const laptop = await signedInUser(server, 'ada@example.test', OLD);
    const phone = client(server);
    await phone.request('/api/auth/login', { method: 'POST', body: { email: 'ada@example.test', password: OLD } });
    const token = await resetLink('ada@example.test');

    const reset = await client(server).request('/api/auth/reset', { method: 'POST', body: { token, password: NEW } });
    expect(reset).toMatchObject({ status: 200, data: { message: 'Password changed. Sign in with your new password. You were signed out everywhere else.' } });
    for (const device of [laptop, phone]) expect((await device.request('/api/account')).status).toBe(401);
    expect((await latestMail(server, 'ada@example.test')).subject).toBe('Your MPS Audio Studio password was changed');
    expect((await client(server).request('/api/auth/login', { method: 'POST', body: { email: 'ada@example.test', password: OLD } })).status).toBe(401);
    expect((await client(server).request('/api/auth/login', { method: 'POST', body: { email: 'ada@example.test', password: NEW } })).status).toBe(200);
  });

  test('reset links are single-use, expire after 30 minutes, are replaced by a newer request and cannot be forged', async () => {
    await signedInUser(server, 'bob@example.test', OLD);
    const used = await resetLink('bob@example.test');
    expect((await client(server).request('/api/auth/reset', { method: 'POST', body: { token: used, password: NEW } })).status).toBe(200);
    expect((await client(server).request('/api/auth/reset', { method: 'POST', body: { token: used, password: 'yet another password' } })).data.error).toBe('invalid_token');

    const replaced = await resetLink('bob@example.test');
    const newer = await resetLink('bob@example.test');
    expect((await client(server).request('/api/auth/reset', { method: 'POST', body: { token: replaced, password: 'yet another password' } })).status).toBe(400);
    server.clock.now += 30 * MINUTE;
    expect((await client(server).request('/api/auth/reset', { method: 'POST', body: { token: newer, password: 'yet another password' } })).status).toBe(400);
    expect((await client(server).request('/api/auth/reset', { method: 'POST', body: { token: 'forged', password: 'yet another password' } })).status).toBe(400);
    // The password from the first, valid reset still applies.
    expect((await client(server).request('/api/auth/login', { method: 'POST', body: { email: 'bob@example.test', password: NEW } })).status).toBe(200);
  });

  test('a too-short new password does not use up the link', async () => {
    await signedInUser(server, 'cy@example.test', OLD);
    const token = await resetLink('cy@example.test');
    expect((await client(server).request('/api/auth/reset', { method: 'POST', body: { token, password: 'short' } })).data.error).toBe('invalid_password');
    expect((await client(server).request('/api/auth/reset', { method: 'POST', body: { token, password: NEW } })).status).toBe(200);
  });

  test('recovery answers the same for unknown addresses and sends them nothing', async () => {
    await signedInUser(server, 'dee@example.test', OLD);
    const known = await client(server).request('/api/auth/recover', { method: 'POST', body: { email: 'dee@example.test' } });
    const unknown = await client(server).request('/api/auth/recover', { method: 'POST', body: { email: 'ghost@example.test' } });
    expect(unknown.status).toBe(known.status);
    expect(unknown.data).toEqual(known.data);
    expect(await latestMail(server, 'ghost@example.test')).toBeUndefined();
  });
});

describe('LAS-22 session expiry', () => {
  test('a session ends after 24 hours without activity', async () => {
    const user = await signedInUser(server, 'eve@example.test', OLD);
    server.clock.now += 24 * HOUR;
    expect((await user.request('/api/account')).status).toBe(401);
    expect((await user.request('/api/auth/session')).data).toEqual({ user: null });
  });

  test('activity keeps a session alive, but never longer than 7 days', async () => {
    const user = await signedInUser(server, 'fay@example.test', OLD);
    for (let step = 1; step <= 7; step++) {
      server.clock.now += 23 * HOUR; // up to 161 h after sign-in: still inside 7 days (168 h)
      expect((await user.request('/api/account')).status, `after ${step * 23} h`).toBe(200);
    }
    server.clock.now += 23 * HOUR; // 184 h: past the 7-day limit despite recent activity
    expect((await user.request('/api/account')).status).toBe(401);
  });
});

describe('LAS-22 abuse limits', () => {
  test('five failed sign-ins lock that address for 15 minutes, known or unknown, without revealing which', async () => {
    await signedInUser(server, 'gus@example.test', OLD);
    for (const email of ['gus@example.test', 'ghost@example.test']) {
      for (let attempt = 1; attempt <= 5; attempt++) {
        expect((await client(server).request('/api/auth/login', { method: 'POST', body: { email, password: 'wrong password!' } })).status, `${email} #${attempt}`).toBe(401);
      }
    }
    const lockedKnown = await client(server).request('/api/auth/login', { method: 'POST', body: { email: 'gus@example.test', password: OLD } });
    const lockedUnknown = await client(server).request('/api/auth/login', { method: 'POST', body: { email: 'ghost@example.test', password: OLD } });
    expect(lockedKnown).toMatchObject({ status: 429, data: { error: 'rate_limited', message: 'Too many attempts. Try again in 15 minutes.' } });
    expect(lockedKnown.headers.get('retry-after')).toBe('900');
    expect(lockedUnknown.data).toEqual(lockedKnown.data);
    // Another address is not affected, and the lock lifts after the window.
    await signedInUser(server, 'hal@example.test', OLD);
    server.clock.now += 15 * MINUTE;
    expect((await client(server).request('/api/auth/login', { method: 'POST', body: { email: 'gus@example.test', password: OLD } })).status).toBe(200);
  });

  test('recovery and verification mails are limited per address and per client', async () => {
    for (let request = 1; request <= 3; request++) {
      expect((await client(server).request('/api/auth/recover', { method: 'POST', body: { email: 'ivy@example.test' } })).status).toBe(202);
    }
    expect((await client(server).request('/api/auth/recover', { method: 'POST', body: { email: 'ivy@example.test' } })).status).toBe(429);
    expect((await client(server).request('/api/auth/resend-verification', { method: 'POST', body: { email: 'ivy@example.test' } })).status).toBe(429);
    for (let address = 1; address <= 17; address++) {
      expect((await client(server).request('/api/auth/recover', { method: 'POST', body: { email: `spray${address}@example.test` } })).status).toBe(202);
    }
    expect((await client(server).request('/api/auth/recover', { method: 'POST', body: { email: 'one-more@example.test' } })).status).toBe(429);
    server.clock.now += 60 * MINUTE;
    expect((await client(server).request('/api/auth/recover', { method: 'POST', body: { email: 'ivy@example.test' } })).status).toBe(202);
  });

  test('registration is limited per client', async () => {
    for (let n = 1; n <= 10; n++) {
      expect((await client(server).request('/api/auth/register', { method: 'POST', body: { email: `new${n}@example.test`, password: OLD } })).status).toBe(202);
    }
    expect((await client(server).request('/api/auth/register', { method: 'POST', body: { email: 'new11@example.test', password: OLD } })).status).toBe(429);
  });
});
