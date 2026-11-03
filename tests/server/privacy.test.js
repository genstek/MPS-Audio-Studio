import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, test } from 'vitest';
import { TEST_RECIPIENT } from '../../server/config.js';
import { makeWav } from '../fixtures/wav.js';
import { client, latestMail, signedInUser, startTestServer } from './helpers.js';

const PASSWORD = 'correct horse battery';
let server;
afterEach(async () => { await server?.stop(); server = null; });

const upload = (user, projectId, kind, name, bytes = makeWav({ seconds: 1 })) =>
  user.request(`/api/projects/${projectId}/assets?kind=${kind}&name=${name}`, { method: 'POST', body: bytes, headers: { 'Content-Type': 'audio/wav' } });
const newProject = async (user, name) => (await user.request('/api/projects', { method: 'POST', body: { name } })).data;
const tick = () => new Promise(resolve => setImmediate(resolve));

describe('LAS-24 deletion', () => {
  test('deleting a project removes every kind of file, cancels its jobs and leaves other projects alone', async () => {
    let releaseJobs;
    server = await startTestServer({ jobGate: new Promise(resolve => { releaseJobs = resolve; }) });
    const owner = await signedInUser(server, 'ada@example.test', PASSWORD);
    const album = await newProject(owner, 'Album');
    const other = await newProject(owner, 'Other');
    const files = {};
    for (const kind of ['source', 'reference', 'stem', 'preview', 'export']) files[kind] = (await upload(owner, album.id, kind, `${kind}.wav`)).data;
    const kept = (await upload(owner, other.id, 'source', 'kept.wav')).data;
    const job = (await owner.request(`/api/assets/${files.source.id}/jobs`, { method: 'POST', body: { kind: 'levels' } })).data;
    const link = (await owner.request(`/api/assets/${files.stem.id}/download-link`, { method: 'POST' })).data;
    expect(readdirSync(join(server.dataDir, 'blobs'))).toHaveLength(6);

    expect((await owner.request(`/api/projects/${album.id}`, { method: 'DELETE' })).status).toBe(204);
    for (const asset of Object.values(files)) expect((await owner.request(`/api/assets/${asset.id}`)).status, asset.kind).toBe(404);
    expect((await owner.request(link.url)).status).toBe(404);
    expect((await owner.request(`/api/jobs/${job.id}`)).status).toBe(404);
    expect(server.db.prepare("SELECT 1 FROM audit WHERE event = 'job_cancelled' AND item_id = ?").get(job.id)).toBeTruthy();
    releaseJobs();
    await tick();
    expect(server.db.prepare('SELECT COUNT(*) AS n FROM jobs').get().n).toBe(0);
    expect(readdirSync(join(server.dataDir, 'blobs'))).toHaveLength(1);
    expect((await owner.request(`/api/assets/${kept.id}`)).status).toBe(200);
  });

  test('deleting the account needs the password, then removes everything it owns at once', async () => {
    server = await startTestServer({ externalRecipients: [TEST_RECIPIENT] });
    const owner = await signedInUser(server, 'bob@example.test', PASSWORD);
    const project = await newProject(owner, 'Album');
    await upload(owner, project.id, 'source', 'a.wav');
    await owner.request('/api/account/consents', { method: 'POST', body: { recipient: TEST_RECIPIENT.id } });
    const phone = client(server);
    await phone.request('/api/auth/login', { method: 'POST', body: { email: 'bob@example.test', password: PASSWORD } });
    const userId = server.db.prepare('SELECT id FROM users').get().id;

    const wrong = await owner.request('/api/account', { method: 'DELETE', body: { password: 'not my password' } });
    expect(wrong).toMatchObject({ status: 403, data: { error: 'wrong_password' } });
    expect((await owner.request('/api/account')).status).toBe(200);

    const deleted = await owner.request('/api/account', { method: 'DELETE', body: { password: PASSWORD } });
    expect(deleted.status).toBe(204);
    expect(owner.cookie).toBe('');
    expect((await phone.request('/api/account')).status).toBe(401);
    expect((await client(server).request('/api/auth/login', { method: 'POST', body: { email: 'bob@example.test', password: PASSWORD } })).status).toBe(401);
    for (const table of ['users', 'sessions', 'email_tokens', 'projects', 'assets', 'jobs', 'consents', 'external_transmissions']) {
      const column = table === 'users' ? 'id' : ['projects', 'assets', 'jobs'].includes(table) ? 'owner_id' : 'user_id';
      expect(server.db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${column} = ?`).get(userId).n, table).toBe(0);
    }
    expect(await latestMail(server, 'bob@example.test')).toBeUndefined();
    expect(readdirSync(join(server.dataDir, 'blobs'))).toEqual([]);
    expect(JSON.stringify(server.db.prepare('SELECT * FROM audit').all())).not.toContain('bob@example.test');
    // The address is free again: a new registration starts a new, empty account.
    const again = await signedInUser(server, 'bob@example.test', 'another password 2');
    expect((await again.request('/api/projects')).data.projects).toEqual([]);
  });
});

describe('LAS-24 consent for external processing', () => {
  test('nothing is sent without consent for that recipient; consent can be withdrawn', async () => {
    server = await startTestServer({ externalRecipients: [TEST_RECIPIENT] });
    const owner = await signedInUser(server, 'cy@example.test', PASSWORD);
    const asset = (await upload(owner, (await newProject(owner, 'A')).id, 'source', 'a.wav')).data;
    const send = recipient => owner.request(`/api/assets/${asset.id}/external-jobs`, { method: 'POST', body: { recipient } });
    const transmissions = () => server.db.prepare('SELECT * FROM external_transmissions').all();

    expect((await owner.request('/api/external-recipients')).data.recipients).toEqual([TEST_RECIPIENT]);
    expect(await send(TEST_RECIPIENT.id)).toMatchObject({ status: 403, data: { error: 'consent_required', message: 'Allow Local test recipient first. Nothing was sent.' } });
    expect((await send('somewhere-else')).status).toBe(400);
    expect(transmissions()).toEqual([]);

    expect((await owner.request('/api/account/consents', { method: 'POST', body: { recipient: TEST_RECIPIENT.id } })).status).toBe(201);
    expect((await send(TEST_RECIPIENT.id)).status).toBe(202);
    expect(transmissions()).toEqual([expect.objectContaining({ recipient: TEST_RECIPIENT.id, bytes: asset.size, sha256: asset.sha256 })]);

    expect((await owner.request(`/api/account/consents/${TEST_RECIPIENT.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await send(TEST_RECIPIENT.id)).status).toBe(403);
    expect(transmissions()).toHaveLength(1);

    // Another user's consent does not reach this user's files.
    const other = await signedInUser(server, 'mallory@example.test', PASSWORD);
    await other.request('/api/account/consents', { method: 'POST', body: { recipient: TEST_RECIPIENT.id } });
    expect((await other.request(`/api/assets/${asset.id}/external-jobs`, { method: 'POST', body: { recipient: TEST_RECIPIENT.id } })).status).toBe(404);
  });

  test('with no external service configured nothing can be consented to or sent', async () => {
    server = await startTestServer();
    const owner = await signedInUser(server, 'dee@example.test', PASSWORD);
    const asset = (await upload(owner, (await newProject(owner, 'A')).id, 'source', 'a.wav')).data;
    expect((await owner.request('/api/external-recipients')).data.recipients).toEqual([]);
    expect((await owner.request('/api/account/consents', { method: 'POST', body: { recipient: TEST_RECIPIENT.id } })).status).toBe(400);
    expect((await owner.request(`/api/assets/${asset.id}/external-jobs`, { method: 'POST', body: { recipient: TEST_RECIPIENT.id } })).status).toBe(400);
  });
});

describe('LAS-24 audit trail', () => {
  test('audit events hold no audio, credentials, emails or reusable links', async () => {
    server = await startTestServer({ externalRecipients: [TEST_RECIPIENT] });
    const owner = await signedInUser(server, 'eve@example.test', PASSWORD);
    const project = await newProject(owner, 'A');
    const asset = (await upload(owner, project.id, 'source', 'a.wav')).data;
    const link = (await owner.request(`/api/assets/${asset.id}/download-link`, { method: 'POST' })).data;
    await owner.request(link.url);
    await owner.request(`/api/assets/${asset.id}/jobs`, { method: 'POST', body: { kind: 'levels' } });
    await owner.request('/api/account/consents', { method: 'POST', body: { recipient: TEST_RECIPIENT.id } });
    await owner.request(`/api/assets/${asset.id}/external-jobs`, { method: 'POST', body: { recipient: TEST_RECIPIENT.id } });
    await owner.request('/api/account', { method: 'DELETE', body: { password: PASSWORD } });

    const rows = server.db.prepare('SELECT * FROM audit').all();
    expect(rows.map(row => row.event)).toEqual(expect.arrayContaining(['register', 'verify', 'login', 'project_created', 'asset_uploaded', 'asset_downloaded', 'consent_granted', 'external_transmission', 'account_deleted']));
    for (const row of rows) {
      expect(Object.keys(row).sort()).toEqual(['created_at', 'event', 'id', 'item_id', 'user_hash']);
      expect(row.user_hash).toMatch(/^[0-9a-f]{16}$/);
    }
    const text = JSON.stringify(rows);
    for (const secret of ['eve@example.test', PASSWORD, 'sig=', '/api/download', 'RIFF', owner.cookie.split('=')[1] ?? 'none']) expect(text).not.toContain(secret);
  });
});
