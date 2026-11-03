import { readdirSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { join } from 'node:path';
import { afterEach, expect, test } from 'vitest';
import { configFromEnv } from '../../server/config.js';
import { DEFAULT_MAX_UPLOAD_BYTES } from '../../server/library.js';
import { MAX_AUDIO_FILE_BYTES } from '../../src/file-limits.js';
import { signedInUser, startTestServer } from './helpers.js';
import { chunk, fmtChunk, riff } from './wav-builder.js';

// LAS-71: the per-file upload limit of the private library follows the studio's 250 MiB
// (262,144,000 bytes) file limit. A file of exactly the limit is stored; one byte more is refused
// with a clean 413 answer, declared or streamed, and nothing is left behind.
let server;
afterEach(async () => {
  if (!server) return;
  expect(server.logs.filter(line => line.startsWith('error'))).toEqual([]);
  await server.stop();
  server = null;
});

// A structurally valid 16-bit mono WAV of exactly `size` bytes (size must be even).
function wavOfSize(size) {
  const header = 12 + 24 + 8; // RIFF/WAVE, fmt chunk, data chunk header
  const data = Buffer.alloc(size - header);
  for (let i = 0; i < data.length; i += 2) data.writeInt16LE(Math.round(8000 * Math.sin(i / 20)), i);
  const bytes = riff([fmtChunk({}), chunk('data', data)]);
  expect(bytes.length).toBe(size);
  return bytes;
}

const upload = (user, projectId, bytes) => user.request(`/api/projects/${projectId}/assets?kind=source&name=limit.wav`, { method: 'POST', body: bytes, headers: { 'Content-Type': 'audio/wav' } });

test('the default limit is 250 MiB = 262,144,000 bytes in the server configuration and the library', () => {
  expect(MAX_AUDIO_FILE_BYTES).toBe(262_144_000);
  expect(configFromEnv({}).maxUploadBytes).toBe(262_144_000);
  expect(DEFAULT_MAX_UPLOAD_BYTES).toBe(262_144_000);
  expect(configFromEnv({ MPS_MAX_UPLOAD_BYTES: '1048576' }).maxUploadBytes).toBe(1_048_576);
});

test('limit - 2, limit and limit + 1 bytes at the server gate (2 MiB test limit)', async () => {
  const limit = 2 * 1024 * 1024;
  server = await startTestServer({ maxUploadBytes: limit });
  const owner = await signedInUser(server, 'limit@example.test');
  const project = (await owner.request('/api/projects', { method: 'POST', body: {} })).data;
  const below = await upload(owner, project.id, wavOfSize(limit - 2));
  expect(below.status).toBe(201);
  const exact = await upload(owner, project.id, wavOfSize(limit));
  expect(exact.status).toBe(201);
  expect(exact.data.size).toBe(limit);
  const over = await upload(owner, project.id, Buffer.concat([wavOfSize(limit), Buffer.alloc(1)]));
  expect(over.status).toBe(413);
  expect(over.data).toMatchObject({ error: 'too_large', message: 'Files can be at most 2 MiB (2,097,152 bytes).' });
  expect(readdirSync(join(server.dataDir, 'tmp'))).toEqual([]);
  expect((await owner.request(`/api/projects/${project.id}/assets`)).data.assets.map(a => a.size)).toEqual([limit - 2, limit]);
});

test('with the default configuration, a declared 262,144,001-byte upload gets a clean 413 before any body is sent', async () => {
  server = await startTestServer();
  const owner = await signedInUser(server, 'big@example.test');
  const project = (await owner.request('/api/projects', { method: 'POST', body: {} })).data;
  const answer = await new Promise((resolve, reject) => {
    const request = httpRequest(`${server.url}/api/projects/${project.id}/assets?name=huge.wav`, {
      method: 'POST',
      headers: { Cookie: owner.cookie, 'X-MPS-Request': '1', Origin: 'http://studio.test', 'Content-Type': 'audio/wav', 'Content-Length': String(MAX_AUDIO_FILE_BYTES + 1) },
    }, response => {
      let text = '';
      response.on('data', part => { text += part; });
      response.on('end', () => { resolve({ status: response.statusCode, body: JSON.parse(text) }); request.destroy(); });
    });
    request.on('error', reject);
    request.flushHeaders(); // headers only: the refusal must not depend on receiving 250 MiB
  });
  expect(answer).toEqual({ status: 413, body: { error: 'too_large', message: 'Files can be at most 250 MiB (262,144,000 bytes).' } });
  expect(readdirSync(join(server.dataDir, 'tmp'))).toEqual([]);
});
