import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { analyze, ANALYSIS_VERSION, MEASUREMENTS } from '../../src/dsp/analysis.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { MIGRATIONS, openDatabase } from '../../server/db.js';
import { makeWav } from '../fixtures/wav.js';
import { signedInUser, startTestServer } from './helpers.js';

// LAS-30 reference profiles: owner-private, tied to the exact stored file and segment.
let server;
beforeEach(async () => { server = await startTestServer({ maxUploadBytes: 4 * 1024 * 1024 }); });
afterEach(async () => {
  expect(server.logs.filter(line => line.startsWith('error'))).toEqual([]);
  await server.stop();
});

const reference = makeWav({ seconds: 12, channels: 2, sampleRate: 44100, frequency: 440, dbfs: -12 });
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const upload = (user, projectId, bytes, kind = 'reference') =>
  user.request(`/api/projects/${projectId}/assets?kind=${kind}&name=ref.wav`, { method: 'POST', body: bytes, headers: { 'Content-Type': 'audio/wav' } });

// What the studio computes on the owner's device: the analysis of the segment plus the file identity.
function profileFor(bytes, start, end) {
  const decoded = decodeWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const report = analyze(decoded.samples, decoded.sampleRate, { start, end });
  report.input = { ...report.input, sha256: sha(bytes), name: 'ref.wav' };
  return { ...report, measurements: MEASUREMENTS };
}

async function ownerWithReference(email = 'ada@example.test', bytes = reference) {
  const owner = await signedInUser(server, email);
  const project = (await owner.request('/api/projects', { method: 'POST', body: { name: 'References' } })).data;
  const asset = (await upload(owner, project.id, bytes)).data;
  return { owner, project, asset };
}

const save = (user, asset, overrides = {}) => user.request('/api/profiles', {
  method: 'POST',
  body: { assetId: asset.id, name: 'Sadeness chorus', style: 'Enigma', sourceVersion: '1990 album', segment: { start: 2, end: 10 }, profile: profileFor(reference, 2, 10), ...overrides },
});

describe('LAS-30 reference profiles', () => {
  test('a profile records the source, segment, analysis version and measurement definitions', async () => {
    const { owner, asset } = await ownerWithReference();
    const created = await save(owner, asset);
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({
      assetId: asset.id, name: 'Sadeness chorus', style: 'Enigma', sourceVersion: '1990 album',
      segment: { start: 2, end: 10 }, analysisVersion: ANALYSIS_VERSION, sourceSha256: sha(reference),
    });
    expect(created.data.measurements.integratedLufs).toBe(profileFor(reference, 2, 10).loudness.integratedLufs);
    const full = (await owner.request(`/api/profiles/${created.data.id}`)).data;
    expect(full.profile.input).toMatchObject({ sha256: sha(reference), segment: { start: 2, end: 10 }, sampleRate: 44100, channels: 2 });
    expect(full.profile.measurements['loudness.integratedLufs']).toMatch(/^LUFS: ITU-R BS.1770-4/);
    expect((await owner.request('/api/profiles')).data.profiles.map(p => p.id)).toEqual([created.data.id]);
  });

  test('different source versions and styles stay separate profiles', async () => {
    const { owner, project, asset } = await ownerWithReference();
    const remaster = (await upload(owner, project.id, makeWav({ seconds: 12, channels: 2, sampleRate: 44100, frequency: 440, dbfs: -9 }))).data;
    await save(owner, asset);
    await owner.request('/api/profiles', { method: 'POST', body: { assetId: remaster.id, name: 'Sadeness chorus', style: 'Enigma', sourceVersion: '2003 remaster', segment: { start: 2, end: 10 }, profile: { ...profileFor(makeWav({ seconds: 12, channels: 2, sampleRate: 44100, frequency: 440, dbfs: -9 }), 2, 10) } } });
    await save(owner, asset, { name: 'Brother Louie', style: 'Modern Talking', sourceVersion: 'single' });
    const list = (await owner.request('/api/profiles')).data.profiles;
    expect(list.map(p => [p.style, p.sourceVersion])).toEqual([['Enigma', '1990 album'], ['Enigma', '2003 remaster'], ['Modern Talking', 'single']]);
    expect(new Set(list.map(p => p.sourceSha256)).size).toBe(2);
  });

  test.each([
    ['measurements of another file', { profile: { ...profileFor(reference, 2, 10), input: { ...profileFor(reference, 2, 10).input, sha256: 'f'.repeat(64) } } }, 'source_mismatch'],
    ['a segment outside the file', { segment: { start: 8, end: 14 } }, 'invalid_segment'],
    ['a segment shorter than 5 s', { segment: { start: 2, end: 5 }, profile: profileFor(reference, 2, 5) }, 'unsuitable_segment'],
    ['measurements of another segment', { segment: { start: 3, end: 11 } }, 'segment_mismatch'],
    ['another analysis version', { profile: { ...profileFor(reference, 2, 10), version: 'mps-analysis-0' } }, 'unsupported_analysis'],
  ])('%s is refused', async (_name, overrides, error) => {
    const { owner, asset } = await ownerWithReference();
    const refused = await save(owner, asset, overrides);
    expect(refused.status).toBe(422);
    expect(refused.data.error).toBe(error);
    expect((await owner.request('/api/profiles')).data.profiles).toEqual([]);
  });

  test('a silent segment is refused as unsuitable', async () => {
    const silent = Buffer.from(makeWav({ seconds: 8, channels: 1, sampleRate: 44100, dbfs: -200 }));
    const { owner, asset } = await ownerWithReference('ada@example.test', silent);
    const refused = await owner.request('/api/profiles', { method: 'POST', body: { assetId: asset.id, segment: { start: 1, end: 7 }, profile: profileFor(silent, 1, 7) } });
    expect(refused.status).toBe(422);
    expect(refused.data).toMatchObject({ error: 'unsuitable_segment', message: 'This segment is silent; choose one with music.' });
  });

  test('only reference files can have profiles', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    const project = (await owner.request('/api/projects', { method: 'POST', body: {} })).data;
    const source = (await upload(owner, project.id, reference, 'source')).data;
    const refused = await save(owner, source);
    expect(refused).toMatchObject({ status: 422, data: { error: 'not_reference' } });
  });

  test('another user cannot see, use or delete the profile or the reference', async () => {
    const { owner, asset } = await ownerWithReference();
    const profile = (await save(owner, asset)).data;
    const other = await signedInUser(server, 'bob@example.test');
    expect((await other.request('/api/profiles')).data.profiles).toEqual([]);
    expect((await other.request(`/api/profiles/${profile.id}`)).status).toBe(404);
    expect((await other.request(`/api/profiles/${profile.id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await save(other, asset)).status).toBe(404); // someone else's reference file
    expect((await owner.request(`/api/profiles/${profile.id}`)).status).toBe(200);
    const anonymous = await (await import('./helpers.js')).client(server).request('/api/profiles');
    expect(anonymous.status).toBe(401);
  });

  test('deleting the profile, the reference file or the account leaves no profile behind', async () => {
    const { owner, project, asset } = await ownerWithReference();
    const first = (await save(owner, asset)).data;
    expect((await owner.request(`/api/profiles/${first.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await owner.request(`/api/profiles/${first.id}`)).status).toBe(404);
    await save(owner, asset);
    expect((await owner.request(`/api/assets/${asset.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await owner.request('/api/profiles')).data.profiles).toEqual([]);
    const again = (await upload(owner, project.id, reference)).data;
    await save(owner, again);
    expect((await owner.request('/api/account', { method: 'DELETE', body: { password: 'correct horse battery' } })).status).toBe(204);
    const db = new DatabaseSync(join(server.dataDir, 'studio.sqlite'));
    expect(db.prepare('SELECT COUNT(*) AS n FROM reference_profiles').get().n).toBe(0);
    db.close();
  });

  test('reanalysing the same file and segment gives an identical profile', () => {
    expect(profileFor(reference, 2, 10)).toEqual(profileFor(Buffer.from(reference), 2, 10));
  });

  test('a database from sprint 02 (schema v3) upgrades to v4 in place', () => {
    const path = join(server.dataDir, 'old.db');
    const old = new DatabaseSync(path);
    MIGRATIONS.slice(0, 3).forEach((sql, i) => { old.exec(sql); old.exec(`PRAGMA user_version = ${i + 1}`); });
    old.close();
    const upgraded = openDatabase(path);
    expect(upgraded.prepare('PRAGMA user_version').get().user_version).toBe(MIGRATIONS.length);
    expect(upgraded.prepare("SELECT name FROM sqlite_master WHERE name = 'reference_profiles'").get()).toBeTruthy();
    upgraded.close();
  });
});
