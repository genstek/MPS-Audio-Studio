import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decision, random, song } from './data.js';
import { chainFromLabels, curveErrorDb, labels, octaveGains } from './features.js';
import { bootstrap, leakageReport, nearest, ridge, scaler, splitByItem, splitBySong } from './protocol.js';

const items = [];
for (let s = 1; s <= 6; s++) for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) items.push({ key: `${s}:${k}:${j}`, song: s, features: [s, k, j] });
const groupsOf = (split, pick) => Object.fromEntries(Object.entries(split).map(([name, ids]) => [name, items.filter(item => pick(ids, item))]));

test('the song split keeps every song in one split, and the leakage check confirms it', () => {
  const split = splitBySong([1, 2, 3, 4, 5, 6], { train: 3, validation: 1 }, 39);
  assert.equal(new Set([...split.train, ...split.validation, ...split.test]).size, 6);
  assert.deepEqual(leakageReport(groupsOf(split, (ids, item) => ids.includes(item.song))), { sharedSongs: [], duplicateFeatures: [], clean: true });
});

test('the item split leaks songs across splits and the check reports it', () => {
  const split = splitByItem(items, { train: 12, validation: 4 }, 39);
  const report = leakageReport(groupsOf(split, (keys, item) => keys.includes(item.key)));
  assert.equal(report.clean, false);
  assert.ok(report.sharedSongs.length > 0);
});

test('duplicate feature vectors across splits are reported', () => {
  const report = leakageReport({ train: [{ song: 1, features: [1, 2] }], test: [{ song: 2, features: [1, 2] }] });
  assert.deepEqual(report.duplicateFeatures, [{ splits: ['train', 'test'], items: 1 }]);
});

test('ridge recovers a known linear map; nearest copies the closest labels', () => {
  const rnd = random(5);
  const X = Array.from({ length: 50 }, () => [rnd() * 4 - 2, rnd() * 4 - 2]);
  const Y = X.map(([a, b]) => [3 * a - 2 * b + 1, -a]);
  const model = ridge(X, Y, 1e-9);
  model([0.5, -1]).forEach((v, i) => assert.ok(Math.abs(v - [4.5, -0.5][i]) < 1e-6));
  assert.deepEqual(nearest(X, Y)(X[7]), Y[7]);
  const scale = scaler([[1, 10], [3, 30]]);
  assert.deepEqual(scale([2, 20]), [0, 0]);
});

test('labels of a flat decision are zero and its chain has no EQ bands', () => {
  const flat = { eq: [{ enabled: true, type: 'bell', frequency: 1000, gain: 0, q: 1 }], inputGain: 0 };
  assert.ok(labels(flat).every(v => Math.abs(v) < 1e-9));
  const params = chainFromLabels(labels(flat));
  assert.equal(params.eq.left.filter(band => band.enabled).length, 0);
  assert.equal(params.limiter.inputGain, 0);
});

test('the true labels reproduce the true EQ closely through the proposal fitter', () => {
  const choice = decision(17);
  const params = chainFromLabels(labels(choice));
  assert.ok(curveErrorDb(params.eq.left.filter(band => band.enabled), choice.eq) < 0.8);
  assert.ok(octaveGains(choice.eq).every(Number.isFinite));
});

test('songs and decisions are deterministic per seed and differ between seeds', () => {
  assert.deepEqual(decision(3), decision(3));
  assert.notDeepEqual(decision(3), decision(4));
  const a = song(2), b = song(2), c = song(3);
  assert.equal(a[0][44100], b[0][44100]);
  assert.notEqual(a[0][44100], c[0][44100]);
});

test('the song-level bootstrap interval contains the mean', () => {
  const ci = bootstrap([1, 2, 3, 4], 1, 500);
  assert.equal(ci.mean, 2.5);
  assert.ok(ci.low <= ci.mean && ci.mean <= ci.high);
});

test('the shape-only curve error ignores a broadband offset', () => {
  const offset = [{ enabled: true, type: 'high-shelf', frequency: 10, gain: 2, q: 0.707 }]; // ≈ +2 dB above 40 Hz
  assert.ok(curveErrorDb(offset, []) > 1.9);
  assert.ok(curveErrorDb(offset, [], { removeOffset: true }) < 0.05);
});
