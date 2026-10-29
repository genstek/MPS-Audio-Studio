import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { createServer, request as httpRequest } from 'node:http';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { makeWav } from '../fixtures/wav.js';
import { client, signedInUser, startTestServer } from './helpers.js';
import { chunk, fmtChunk, riff, samples, wav } from './wav-builder.js';

let server;
beforeEach(async () => { server = await startTestServer({ maxUploadBytes: 2 * 1024 * 1024 }); });
afterEach(async () => {
  // No request may end in an unexpected server error.
  expect(server.logs.filter(line => line.startsWith('error'))).toEqual([]);
  await server.stop();
});

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const upload = (user, projectId, bytes, query = 'kind=source&name=tone.wav') =>
  user.request(`/api/projects/${projectId}/assets?${query}`, { method: 'POST', body: bytes, headers: { 'Content-Type': 'audio/wav' } });

async function ownerWithAsset(email = 'ada@example.test') {
  const owner = await signedInUser(server, email);
  const project = (await owner.request('/api/projects', { method: 'POST', body: { name: 'Album' } })).data;
  const asset = (await upload(owner, project.id, makeWav())).data;
  return { owner, project, asset };
}

const waitForJob = async (user, id) => {
  for (let attempt = 0; attempt < 200; attempt++) {
    const job = (await user.request(`/api/jobs/${id}`)).data;
    if (!['queued', 'running'].includes(job.status)) return job;
    await new Promise(resolve => setImmediate(resolve));
  }
  throw new Error('job did not finish');
};

describe('LAS-23 private library for the owner', () => {
  test('upload, list, inspect, download byte-for-byte and delete', async () => {
    const { owner, project, asset } = await ownerWithAsset();
    expect(asset).toMatchObject({
      kind: 'source', name: 'tone.wav', size: makeWav().length, sha256: sha(makeWav()),
      format: { encoding: 'pcm', channels: 1, sampleRate: 44100, bitsPerSample: 16, frames: 132300, duration: 3 },
    });
    expect((await owner.request('/api/projects')).data.projects).toEqual([expect.objectContaining({ id: project.id, name: 'Album', assetCount: 1 })]);
    expect((await owner.request(`/api/projects/${project.id}`)).data.assets.map(a => a.id)).toEqual([asset.id]);

    const link = (await owner.request(`/api/assets/${asset.id}/download-link`, { method: 'POST' })).data;
    const download = await owner.request(link.url);
    expect(download.status).toBe(200);
    expect(download.headers.get('content-disposition')).toBe('attachment; filename="tone.wav"');
    expect(sha(download.data)).toBe(asset.sha256);

    expect(readdirSync(join(server.dataDir, 'blobs'))).toHaveLength(1);
    expect((await owner.request(`/api/assets/${asset.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await owner.request(`/api/assets/${asset.id}`)).status).toBe(404);
    expect(readdirSync(join(server.dataDir, 'blobs'))).toEqual([]);
  });

  test('supported formats are accepted: 24-bit stereo extensible PCM and 32-bit float', async () => {
    const owner = await signedInUser(server, 'bob@example.test');
    const project = (await owner.request('/api/projects', { method: 'POST', body: {} })).data;
    expect(project.name).toBe('My library');
    const extensible = await upload(owner, project.id, riff([fmtChunk({ channels: 2, bits: 24, rate: 48000, subTag: 1 }), chunk('LIST', Buffer.alloc(31)), chunk('data', samples({ channels: 2, bits: 24, rate: 48000 }))]));
    expect(extensible).toMatchObject({ status: 201, data: { format: { encoding: 'pcm', channels: 2, bitsPerSample: 24, sampleRate: 48000 } } });
    const float = await upload(owner, project.id, wav({ tag: 3, bits: 32, float: true }));
    expect(float).toMatchObject({ status: 201, data: { format: { encoding: 'float', bitsPerSample: 32 } } });
  });
});

describe('LAS-23 another user cannot reach the owner\'s data', () => {
  test('every operation with guessed or reused ids answers 404 and changes nothing', async () => {
    const { owner, project, asset } = await ownerWithAsset();
    const job = (await owner.request(`/api/assets/${asset.id}/jobs`, { method: 'POST', body: { kind: 'levels' } })).data;
    const link = (await owner.request(`/api/assets/${asset.id}/download-link`, { method: 'POST' })).data;
    const other = await signedInUser(server, 'mallory@example.test');

    expect((await other.request('/api/projects')).data.projects).toEqual([]);
    const attempts = [
      ['GET', `/api/projects/${project.id}`], ['PATCH', `/api/projects/${project.id}`, { name: 'mine now' }],
      ['GET', `/api/projects/${project.id}/assets`], ['POST', `/api/projects/${project.id}/assets?name=x.wav`, makeWav()],
      ['GET', `/api/assets/${asset.id}`], ['POST', `/api/assets/${asset.id}/download-link`], ['GET', link.url],
      ['POST', `/api/assets/${asset.id}/jobs`, { kind: 'levels' }], ['GET', `/api/jobs/${job.id}`], ['DELETE', `/api/jobs/${job.id}`],
      ['DELETE', `/api/assets/${asset.id}`], ['DELETE', `/api/projects/${project.id}`],
    ];
    for (const [method, path, body] of attempts) {
      const response = await other.request(path, { method, body, headers: Buffer.isBuffer(body) ? { 'Content-Type': 'audio/wav' } : {} });
      expect(response.status, `${method} ${path}`).toBe(404);
    }
    expect((await owner.request(`/api/projects/${project.id}`)).data).toMatchObject({ name: 'Album', assets: [expect.objectContaining({ id: asset.id })] });
    expect(sha((await owner.request(link.url)).data)).toBe(asset.sha256);
  });

  test('anonymous requests are rejected everywhere, even with a valid download link', async () => {
    const { owner, project, asset } = await ownerWithAsset();
    const link = (await owner.request(`/api/assets/${asset.id}/download-link`, { method: 'POST' })).data;
    const anonymous = client(server);
    for (const [method, path] of [['GET', '/api/projects'], ['POST', '/api/projects'], ['GET', `/api/projects/${project.id}`], ['DELETE', `/api/projects/${project.id}`],
      ['GET', `/api/assets/${asset.id}`], ['POST', `/api/assets/${asset.id}/download-link`], ['GET', link.url], ['POST', `/api/assets/${asset.id}/jobs`]]) {
      expect((await anonymous.request(path, { method, body: method === 'GET' ? undefined : {} })).status, `${method} ${path}`).toBe(401);
    }
  });

  test('download links expire after 5 minutes and cannot be altered or moved to another file', async () => {
    const { owner, project, asset } = await ownerWithAsset();
    const second = (await upload(owner, project.id, makeWav({ seconds: 1 }))).data;
    const link = (await owner.request(`/api/assets/${asset.id}/download-link`, { method: 'POST' })).data;
    const url = new URL(link.url, 'http://x');
    expect((await owner.request(link.url.replace(asset.id, second.id))).status).toBe(403);
    expect((await owner.request(`${url.pathname}?exp=${Number(url.searchParams.get('exp')) + 60000}&sig=${url.searchParams.get('sig')}`)).status).toBe(403);
    expect((await owner.request(`${url.pathname}?exp=${url.searchParams.get('exp')}&sig=forged`)).status).toBe(403);
    server.clock.now += 5 * 60 * 1000;
    expect((await owner.request(link.url)).status).toBe(403);
  });
});

describe('LAS-23 uploads are checked by content, size and name', () => {
  const broken = {
    'text renamed to .wav': Buffer.from('this is not audio at all, just text that is long enough to pass the size check'),
    'MP3 bytes': Buffer.concat([Buffer.from([0x49, 0x44, 0x33, 4, 0, 0, 0, 0, 0, 0]), Buffer.alloc(100)]),
    'too short': Buffer.from('RIFF\x24\x00\x00\x00WAVE', 'latin1'),
    'chunk longer than the file': riff([fmtChunk({}), Buffer.concat([Buffer.from('data', 'latin1'), Buffer.from([0xff, 0xff, 0xff, 0x7f]), Buffer.alloc(64)])]),
    'data before fmt': riff([chunk('data', samples({})), fmtChunk({})]),
    'no data in the first 64 chunks': riff([fmtChunk({}), ...Array.from({ length: 70 }, () => chunk('junk', Buffer.alloc(2))), chunk('data', samples({}))]),
    'unsupported ADPCM encoding': wav({ tag: 2 }),
    'zero channels': riff([fmtChunk({ channels: 0, blockAlign: 2, byteRate: 88200 }), chunk('data', samples({}))]),
    '4 kHz sample rate': wav({ rate: 4000 }),
    'inconsistent block align': riff([fmtChunk({ blockAlign: 4 }), chunk('data', samples({}))]),
    '12-bit samples': riff([fmtChunk({ bits: 12, blockAlign: 2, byteRate: 88200 }), chunk('data', samples({}))]),
    'partial last frame': riff([fmtChunk({ channels: 2 }), chunk('data', Buffer.alloc(6))]),
    'empty audio': riff([fmtChunk({}), chunk('data', Buffer.alloc(0)), chunk('pad ', Buffer.alloc(20))]),
  };

  test.each(Object.entries(broken))('%s is rejected with 422 and leaves no file behind', async (_name, bytes) => {
    const owner = await signedInUser(server, 'cy@example.test');
    const project = (await owner.request('/api/projects', { method: 'POST', body: {} })).data;
    const response = await upload(owner, project.id, bytes);
    expect(response.status).toBe(422);
    expect(response.data.error).toBe('invalid_audio');
    expect(readdirSync(join(server.dataDir, 'tmp'))).toEqual([]);
    expect(readdirSync(join(server.dataDir, 'blobs'))).toEqual([]);
    expect((await owner.request(`/api/projects/${project.id}`)).data.assets).toEqual([]);
  });

  test('files over the size limit are refused, declared or streamed', async () => {
    const owner = await signedInUser(server, 'dee@example.test');
    const project = (await owner.request('/api/projects', { method: 'POST', body: {} })).data;
    const big = wav({ frames: 1_100_000 }); // 2.2 MB, over the 2 MiB test limit
    expect((await upload(owner, project.id, big)).status).toBe(413);
    // Without Content-Length the server counts while streaming and stops at the limit.
    const streamed = await fetch(`${server.url}/api/projects/${project.id}/assets?name=big.wav`, {
      method: 'POST', duplex: 'half',
      headers: { Cookie: owner.cookie, 'X-MPS-Request': '1', Origin: 'http://studio.test', 'Content-Type': 'audio/wav' },
      body: new ReadableStream({ start(controller) { controller.enqueue(big); controller.close(); } }),
    });
    expect(streamed.status).toBe(413);
    expect(readdirSync(join(server.dataDir, 'tmp'))).toEqual([]);
    expect(readdirSync(join(server.dataDir, 'blobs'))).toEqual([]);
  });

  test('file names are display text only: no folders, no control characters', async () => {
    const owner = await signedInUser(server, 'eve@example.test');
    const project = (await owner.request('/api/projects', { method: 'POST', body: {} })).data;
    const asset = (await upload(owner, project.id, makeWav(), `name=${encodeURIComponent('../../etc/evil\u0000\u0007name.wav')}`)).data;
    expect(asset.name).toBe('evilname.wav');
    const [blob] = readdirSync(join(server.dataDir, 'blobs'));
    expect(blob).toMatch(/^[\w-]{32}$/);
    expect(readdirSync(server.dataDir).sort()).toEqual(['blobs', 'server-secret', 'studio.sqlite', 'studio.sqlite-shm', 'studio.sqlite-wal', 'tmp']);
  });
});

describe('LAS-23 level analysis jobs', () => {
  test('measures peak and RMS of the stored file', async () => {
    const { owner, asset } = await ownerWithAsset();
    const job = (await owner.request(`/api/assets/${asset.id}/jobs`, { method: 'POST', body: { kind: 'levels' } })).data;
    expect(job.status).toBe('queued');
    const done = await waitForJob(owner, job.id);
    // makeWav(): 440 Hz sine with amplitude 1000/32768 → peak −30.31 dBFS, RMS 3.01 dB lower.
    expect(done).toMatchObject({ status: 'done', result: { frames: 132300, channels: [{ peakDbfs: -30.31, rmsDbfs: -33.32 }] } });
  });

  test('a cancelled job never runs, and the time limit stops a slow one', async () => {
    const { owner, asset } = await ownerWithAsset();
    const job = (await owner.request(`/api/assets/${asset.id}/jobs`, { method: 'POST', body: { kind: 'levels' } })).data;
    expect((await owner.request(`/api/jobs/${job.id}`, { method: 'DELETE' })).data.status).toBe('cancelled');
    expect((await waitForJob(owner, job.id)).status).toBe('cancelled');

    const limited = await startTestServer({ jobTimeLimitMs: 0 });
    const user = await signedInUser(limited, 'fay@example.test');
    const project = (await user.request('/api/projects', { method: 'POST', body: {} })).data;
    const stored = (await user.request(`/api/projects/${project.id}/assets?name=a.wav`, { method: 'POST', body: makeWav(), headers: { 'Content-Type': 'audio/wav' } })).data;
    const slow = (await user.request(`/api/assets/${stored.id}/jobs`, { method: 'POST', body: { kind: 'levels' } })).data;
    expect(await waitForJob(user, slow.id)).toMatchObject({ status: 'failed', error: 'The analysis took too long.' });
    await limited.stop();
  });
});

// A pass-through proxy like Vite's dev proxy: it streams the request body to the server and
// answers 502 if the server cuts the connection before the body is sent.
async function startProxy(target) {
  const proxy = createServer((incoming, outgoing) => {
    const upstream = httpRequest(`${target}${incoming.url}`, { method: incoming.method, headers: { ...incoming.headers, connection: 'close' } }, answer => {
      outgoing.writeHead(answer.statusCode, answer.headers);
      answer.pipe(outgoing);
    });
    upstream.on('error', () => {
      if (!outgoing.headersSent) outgoing.writeHead(502);
      outgoing.end();
    });
    incoming.pipe(upstream);
  });
  await new Promise(resolve => proxy.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${proxy.address().port}`,
    close: () => new Promise(resolve => { proxy.closeAllConnections(); proxy.close(resolve); }),
  };
}

describe('LAS-23 refused uploads still get their answer', () => {
  // The server refuses before reading the body; it must still read and discard it, or the
  // connection is cut while the proxy is sending and the browser gets 502 instead of 401/404.
  test('through a proxy, an unauthenticated or misdirected upload receives 401/404', async () => {
    const { owner, project } = await ownerWithAsset();
    const proxy = await startProxy(server.url);
    const viaProxy = { url: proxy.url };
    const body = wav({ frames: 900_000 }); // 1.8 MB, inside the limit
    try {
      for (let attempt = 0; attempt < 5; attempt++) {
        expect((await upload(client(viaProxy), project.id, body)).status, `anonymous #${attempt}`).toBe(401);
        const misdirected = client(viaProxy);
        misdirected.cookie = owner.cookie;
        expect((await upload(misdirected, 'no-such-project', body)).status, `missing project #${attempt}`).toBe(404);
      }
    } finally {
      await proxy.close();
    }
  });
});
