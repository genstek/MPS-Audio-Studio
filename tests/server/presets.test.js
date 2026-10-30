import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { analyze, MEASUREMENTS } from '../../src/dsp/analysis.js';
import { defaultChain, editBand, setEqMode } from '../../src/dsp/chain-params.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { defaultPreferences } from '../../src/presets.js';
import { PROPOSAL_VERSION } from '../../src/proposal.js';
import { MIGRATIONS, openDatabase } from '../../server/db.js';
import { makeWav } from '../fixtures/wav.js';
import { client, signedInUser, startTestServer } from './helpers.js';

// LAS-33 presets, preferences and remembered decisions: owner-private settings, no audio.
let server;
beforeEach(async () => { server = await startTestServer({ maxUploadBytes: 4 * 1024 * 1024 }); });
afterEach(async () => {
  expect(server.logs.filter(line => line.startsWith('error'))).toEqual([]);
  await server.stop();
});

// A customised chain: independent L/R bands, compressor and limiter changes.
function customChain() {
  let chain = setEqMode(defaultChain(), 'independent');
  chain = editBand(chain, 'left', 3, { enabled: true, type: 'low-shelf', frequency: 90, gain: 2.5, q: 0.8 });
  chain = editBand(chain, 'right', 17, { enabled: true, type: 'bell', frequency: 3150, gain: -3, q: 2 });
  chain = editBand(chain, 'right', 23, { enabled: true, type: 'low-pass', frequency: 18000, gain: 0, q: 0.707 });
  return { ...chain, compressor: { ...chain.compressor, enabled: true, threshold: -22, ratio: 2.5 }, limiter: { ...chain.limiter, inputGain: 3.5, ceiling: -0.8 } };
}
const savePreset = (user, overrides = {}) => user.request('/api/presets', { method: 'POST', body: { name: 'Warm master', chain: customChain(), origin: 'manual', ...overrides } });
const decisionBody = (overrides = {}) => ({ decision: 'accepted', rating: 4, strength: 80, proposalVersion: PROPOSAL_VERSION, summary: { modules: [{ module: 'EQ', status: 'proposed', values: ['8 kHz bell, +2.0 dB'] }] }, ...overrides });

describe('presets', () => {
  test('save, list, read back the complete chain, rename and delete', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    const created = await savePreset(owner);
    expect(created.status).toBe(201);
    expect(created.data).toMatchObject({ name: 'Warm master', origin: 'manual', chainVersion: 1, analysisVersion: null, proposalVersion: null });
    const read = await owner.request(`/api/presets/${created.data.id}`);
    expect(read.data).toMatchObject({ schema: 'mps-preset', version: 1 });
    expect(read.data.chain).toEqual(customChain()); // all 24 bands per channel, mode, order, compressor, limiter
    expect(read.data.chain.eq.left).toHaveLength(24);
    expect(read.data.chain.eq.right).toHaveLength(24);
    const renamed = await owner.request(`/api/presets/${created.data.id}`, { method: 'PATCH', body: { name: '  Warm master v2  ' } });
    expect(renamed.data.name).toBe('Warm master v2');
    expect((await owner.request('/api/presets')).data.presets.map(p => p.name)).toEqual(['Warm master v2']);
    expect((await owner.request(`/api/presets/${created.data.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await owner.request('/api/presets')).data.presets).toEqual([]);
  });

  test('a proposal preset keeps its analysis and proposal versions and strength', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    const created = await savePreset(owner, { origin: 'proposal', analysisVersion: 'mps-analysis-1', proposalVersion: PROPOSAL_VERSION, strength: 75 });
    expect(created.data).toMatchObject({ origin: 'proposal', analysisVersion: 'mps-analysis-1', proposalVersion: PROPOSAL_VERSION, strength: 75 });
  });

  test('invalid, newer-version and oversized presets are refused and nothing is stored', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    const tooMany = { ...customChain(), eq: { ...customChain().eq, left: [...customChain().eq.left, customChain().eq.left[0]] } };
    for (const chain of [tooMany, { ...customChain(), version: 2 }, { ...customChain(), order: ['limiter', 'eq', 'compressor'] }, null]) {
      const refused = await savePreset(owner, { chain });
      expect(refused.status).toBe(422);
      expect(refused.data.error).toBe('invalid_preset');
    }
    expect((await savePreset(owner, { origin: 'downloaded' })).status).toBe(422);
    expect((await savePreset(owner, { strength: 150 })).status).toBe(422);
    const big = await owner.request('/api/presets', { method: 'POST', body: { name: 'x'.repeat(70 * 1024), chain: customChain() } });
    expect(big.status).toBe(413);
    expect((await owner.request('/api/presets')).data.presets).toEqual([]);
  });

  test('another account cannot list, read, rename or delete them; signed out gets 401', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    const other = await signedInUser(server, 'bob@example.test');
    const { data: preset } = await savePreset(owner);
    expect((await other.request('/api/presets')).data.presets).toEqual([]);
    expect((await other.request(`/api/presets/${preset.id}`)).status).toBe(404);
    expect((await other.request(`/api/presets/${preset.id}`, { method: 'PATCH', body: { name: 'mine' } })).status).toBe(404);
    expect((await other.request(`/api/presets/${preset.id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await client(server).request('/api/presets')).status).toBe(401);
    expect((await owner.request(`/api/presets/${preset.id}`)).data.name).toBe('Warm master');
  });

  test('state changes need the studio request header (CSRF rule)', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    const { data: preset } = await savePreset(owner);
    const response = await fetch(`${server.url}/api/presets/${preset.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Cookie: owner.cookie }, body: JSON.stringify({ name: 'forged' }) });
    expect(response.status).toBe(403);
    expect((await owner.request(`/api/presets/${preset.id}`)).data.name).toBe('Warm master');
  });
});

describe('preferences', () => {
  test('defaults until saved; save, read, reset; validated; owner-only', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    const other = await signedInUser(server, 'bob@example.test');
    expect((await owner.request('/api/preferences')).data).toEqual({ preferences: defaultPreferences(), saved: false });
    const mine = { ...defaultPreferences(), highShelfDb: 1.5, lowShelfDb: -1, strength: 70 };
    expect((await owner.request('/api/preferences', { method: 'PUT', body: mine })).data).toEqual({ preferences: mine, saved: true });
    expect((await owner.request('/api/preferences')).data.preferences).toEqual(mine);
    expect((await other.request('/api/preferences')).data).toEqual({ preferences: defaultPreferences(), saved: false });
    for (const bad of [{ ...mine, highShelfDb: 9 }, { ...mine, version: 2 }, { ...mine, schema: 'x' }, { ...mine, strength: 'loud' }]) {
      expect((await owner.request('/api/preferences', { method: 'PUT', body: bad })).status).toBe(422);
    }
    expect((await owner.request('/api/preferences')).data.preferences).toEqual(mine);
    expect((await owner.request('/api/preferences', { method: 'DELETE' })).data).toEqual({ preferences: defaultPreferences(), saved: false });
    expect((await owner.request('/api/preferences')).data.saved).toBe(false);
  });
});

describe('remembered decisions', () => {
  test('stored only when sent, listed, forgotten one by one or all; owner-only', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    const other = await signedInUser(server, 'bob@example.test');
    expect((await owner.request('/api/decisions')).data.decisions).toEqual([]);
    const accepted = await owner.request('/api/decisions', { method: 'POST', body: decisionBody() });
    expect(accepted.status).toBe(201);
    await owner.request('/api/decisions', { method: 'POST', body: decisionBody({ decision: 'rejected', rating: null, strength: 100 }) });
    expect((await owner.request('/api/decisions')).data.decisions.map(d => d.decision).sort()).toEqual(['accepted', 'rejected']);
    expect((await other.request('/api/decisions')).data.decisions).toEqual([]);
    expect((await other.request(`/api/decisions/${accepted.data.id}`, { method: 'DELETE' })).status).toBe(404);
    expect((await owner.request(`/api/decisions/${accepted.data.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await owner.request('/api/decisions', { method: 'DELETE' })).data).toEqual({ forgotten: 1 });
    expect((await owner.request('/api/decisions')).data.decisions).toEqual([]);
  });

  test('bad decisions are refused: unknown decision, rating, strength, version, oversized or missing summary', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    for (const body of [decisionBody({ decision: 'maybe' }), decisionBody({ rating: 6 }), decisionBody({ strength: -1 }), decisionBody({ proposalVersion: 'mps-proposal-0' }), decisionBody({ summary: { notes: 'x'.repeat(9000) } }), decisionBody({ summary: null })]) {
      expect((await owner.request('/api/decisions', { method: 'POST', body })).status).toBe(422);
    }
    expect((await owner.request('/api/decisions')).data.decisions).toEqual([]);
  });
});

describe('links to reference profiles and deletion', () => {
  const reference = makeWav({ seconds: 8, channels: 2, sampleRate: 44100, frequency: 440, dbfs: -12 });
  async function withProfile(owner) {
    const project = (await owner.request('/api/projects', { method: 'POST', body: { name: 'References' } })).data;
    const asset = (await owner.request(`/api/projects/${project.id}/assets?kind=reference&name=ref.wav`, { method: 'POST', body: reference, headers: { 'Content-Type': 'audio/wav' } })).data;
    const decoded = decodeWav(reference.buffer.slice(reference.byteOffset, reference.byteOffset + reference.byteLength));
    const report = analyze(decoded.samples, decoded.sampleRate, { start: 1, end: 7 });
    report.input = { ...report.input, sha256: createHash('sha256').update(reference).digest('hex') };
    return (await owner.request('/api/profiles', { method: 'POST', body: { assetId: asset.id, segment: { start: 1, end: 7 }, profile: { ...report, measurements: MEASUREMENTS } } })).data;
  }

  test('only your own reference profile can be linked; deleting it keeps presets and decisions but forgets the link', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    const other = await signedInUser(server, 'bob@example.test');
    const profile = await withProfile(owner);
    expect((await savePreset(other, { referenceProfileId: profile.id })).status).toBe(404);
    expect((await other.request('/api/decisions', { method: 'POST', body: decisionBody({ referenceProfileId: profile.id }) })).status).toBe(404);
    const preset = (await savePreset(owner, { origin: 'proposal', referenceProfileId: profile.id })).data;
    await owner.request('/api/decisions', { method: 'POST', body: decisionBody({ referenceProfileId: profile.id }) });
    expect(preset.referenceProfileId).toBe(profile.id);
    expect((await owner.request(`/api/profiles/${profile.id}`, { method: 'DELETE' })).status).toBe(204);
    expect((await owner.request(`/api/presets/${preset.id}`)).data.referenceProfileId).toBeNull();
    expect((await owner.request('/api/decisions')).data.decisions[0].referenceProfileId).toBeNull();
  });

  test('deleting the account deletes its presets, preferences and decisions (0 rows left)', async () => {
    const owner = await signedInUser(server, 'ada@example.test');
    await savePreset(owner);
    await owner.request('/api/preferences', { method: 'PUT', body: { ...defaultPreferences(), highShelfDb: 1 } });
    await owner.request('/api/decisions', { method: 'POST', body: decisionBody() });
    expect((await owner.request('/api/account', { method: 'DELETE', body: { password: 'correct horse battery' } })).status).toBe(204);
    const db = new DatabaseSync(join(server.dataDir, 'studio.sqlite'));
    for (const table of ['presets', 'preferences', 'decisions']) expect(db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n, table).toBe(0);
    db.close();
  });

  test('a database from sprint 05 (schema v4) upgrades to v5 in place', () => {
    const path = join(server.dataDir, 'old.db');
    const old = new DatabaseSync(path);
    MIGRATIONS.slice(0, 4).forEach((sql, i) => { old.exec(sql); old.exec(`PRAGMA user_version = ${i + 1}`); });
    old.close();
    const upgraded = openDatabase(path);
    expect(upgraded.prepare('PRAGMA user_version').get().user_version).toBe(5);
    for (const table of ['presets', 'preferences', 'decisions']) expect(upgraded.prepare('SELECT name FROM sqlite_master WHERE name = ?').get(table), table).toBeTruthy();
    upgraded.close();
  });
});
