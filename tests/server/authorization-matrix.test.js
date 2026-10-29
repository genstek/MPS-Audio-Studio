import { writeFileSync } from 'node:fs';
import { afterAll, beforeAll, expect, test } from 'vitest';
import { TEST_RECIPIENT } from '../../server/config.js';
import { makeWav } from '../fixtures/wav.js';
import { client, signedInUser, startTestServer } from './helpers.js';

// LAS-25: every supported operation is tried by five callers. Destructive operations are tried by
// everyone else before the owner, and the owner's data must still be intact afterwards.
const PASSWORD = 'correct horse battery';
const CALLERS = ['anonymous', 'expired', 'revoked', 'other', 'owner'];
let server;
const as = {};
const ids = {};
const observed = [];
let ownerFilesDeleted = false;

beforeAll(async () => {
  server = await startTestServer({ externalRecipients: [TEST_RECIPIENT] });
  // Sessions that will be stale: one left idle for 24 h, one signed out.
  const idle = await signedInUser(server, 'owner@example.test', PASSWORD);
  const revoked = client(server);
  await revoked.request('/api/auth/login', { method: 'POST', body: { email: 'owner@example.test', password: PASSWORD } });
  const revokedCookie = revoked.cookie;
  await revoked.request('/api/auth/logout', { method: 'POST' });
  revoked.cookie = revokedCookie;
  await signedInUser(server, 'other@example.test', PASSWORD);
  server.clock.now += 24 * 60 * 60 * 1000; // the idle session (and every other one so far) expires
  as.expired = idle;
  as.revoked = revoked;
  as.anonymous = client(server);
  for (const [name, email] of [['owner', 'owner@example.test'], ['other', 'other@example.test']]) {
    as[name] = client(server);
    await as[name].request('/api/auth/login', { method: 'POST', body: { email, password: PASSWORD } });
    await as[name].request('/api/account/consents', { method: 'POST', body: { recipient: TEST_RECIPIENT.id } });
  }
  ids.project = (await as.owner.request('/api/projects', { method: 'POST', body: { name: 'Owner album' } })).data.id;
  ids.asset = (await as.owner.request(`/api/projects/${ids.project}/assets?name=a.wav`, { method: 'POST', body: makeWav({ seconds: 1 }), headers: { 'Content-Type': 'audio/wav' } })).data.id;
  ids.job = (await as.owner.request(`/api/assets/${ids.asset}/jobs`, { method: 'POST', body: { kind: 'levels' } })).data.id;
  ids.link = (await as.owner.request(`/api/assets/${ids.asset}/download-link`, { method: 'POST' })).data.url;
});

afterAll(async () => {
  if (process.env.MPS_MATRIX_OUT) {
    const rows = observed.map(row => `| ${row.operation} | ${CALLERS.map(caller => row[caller]).join(' | ')} |`);
    writeFileSync(process.env.MPS_MATRIX_OUT, [
      `| Operation | ${CALLERS.join(' | ')} |`, `| --- | ${CALLERS.map(() => '---').join(' | ')} |`, ...rows, '',
    ].join('\n'));
  }
  await server.stop();
});

const wav = () => ({ body: makeWav({ seconds: 1 }), headers: { 'Content-Type': 'audio/wav' } });
const D = { anonymous: 401, expired: 401, revoked: 401 }; // every stale or missing session is refused
const OPERATIONS = [
  ['GET /api/account', 'GET', () => '/api/account', {}, { ...D, other: 200, owner: 200 }],
  ['GET /api/projects (list)', 'GET', () => '/api/projects', {}, { ...D, other: 200, owner: 200 }],
  ['POST /api/projects', 'POST', () => '/api/projects', { body: { name: 'x' } }, { ...D, other: 201, owner: 201 }],
  ['GET /api/projects/:id', 'GET', () => `/api/projects/${ids.project}`, {}, { ...D, other: 404, owner: 200 }],
  ['PATCH /api/projects/:id', 'PATCH', () => `/api/projects/${ids.project}`, { body: { name: 'Owner album' } }, { ...D, other: 404, owner: 200 }],
  ['GET /api/projects/:id/assets', 'GET', () => `/api/projects/${ids.project}/assets`, {}, { ...D, other: 404, owner: 200 }],
  ['POST /api/projects/:id/assets (upload)', 'POST', () => `/api/projects/${ids.project}/assets?name=b.wav`, wav(), { ...D, other: 404, owner: 201 }],
  ['GET /api/assets/:id', 'GET', () => `/api/assets/${ids.asset}`, {}, { ...D, other: 404, owner: 200 }],
  ['POST /api/assets/:id/download-link', 'POST', () => `/api/assets/${ids.asset}/download-link`, {}, { ...D, other: 404, owner: 200 }],
  ['GET /api/download/:id (owner\'s signed link)', 'GET', () => ids.link, {}, { ...D, other: 404, owner: 200 }],
  ['POST /api/assets/:id/jobs', 'POST', () => `/api/assets/${ids.asset}/jobs`, { body: { kind: 'levels' } }, { ...D, other: 404, owner: 202 }],
  ['GET /api/jobs/:id', 'GET', () => `/api/jobs/${ids.job}`, {}, { ...D, other: 404, owner: 200 }],
  ['DELETE /api/jobs/:id (cancel)', 'DELETE', () => `/api/jobs/${ids.job}`, {}, { ...D, other: 404, owner: 200 }],
  ['POST /api/assets/:id/external-jobs (both have consent)', 'POST', () => `/api/assets/${ids.asset}/external-jobs`, { body: { recipient: TEST_RECIPIENT.id } }, { ...D, other: 404, owner: 202 }],
  ['GET /api/account/consents', 'GET', () => '/api/account/consents', {}, { ...D, other: 200, owner: 200 }],
  ['GET /api/external-recipients', 'GET', () => '/api/external-recipients', {}, { ...D, other: 200, owner: 200 }],
  ['DELETE /api/assets/:id', 'DELETE', () => `/api/assets/${ids.asset}`, {}, { ...D, other: 404, owner: 204 }],
  ['DELETE /api/projects/:id', 'DELETE', () => `/api/projects/${ids.project}`, {}, { ...D, other: 404, owner: 204 }],
  ['DELETE /api/account/consents/:recipient', 'DELETE', () => `/api/account/consents/${TEST_RECIPIENT.id}`, {}, { ...D, other: 204, owner: 204 }],
  ['DELETE /api/account (each caller can delete only their own)', 'DELETE', () => '/api/account', { body: { password: PASSWORD } }, { ...D, other: 204, owner: 204 }],
];

test.each(OPERATIONS)('%s', async (operation, method, path, options, expected) => {
  const row = { operation };
  for (const caller of CALLERS) {
    // Before the owner acts, nothing the others did may have touched the owner's file.
    if (caller === 'owner' && !ownerFilesDeleted) {
      const intact = await as.owner.request(`/api/projects/${ids.project}`);
      expect(intact.data.assets.map(asset => asset.id), `${operation}: owner's file intact`).toContain(ids.asset);
    }
    const response = await as[caller].request(path(), { method, ...options });
    row[caller] = response.status;
    if (caller === 'owner' && operation === 'DELETE /api/assets/:id') ownerFilesDeleted = true;
    expect(response.status, `${operation} as ${caller}`).toBe(expected[caller]);
    if (caller === 'other' && response.status === 200) {
      expect(JSON.stringify(response.data), `${operation}: no owner data for other`).not.toContain(ids.asset);
      expect(JSON.stringify(response.data)).not.toContain(ids.project);
    }
  }
  observed.push(row);
});
