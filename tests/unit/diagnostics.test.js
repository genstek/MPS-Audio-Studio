import { expect, test } from 'vitest';
import { createDiagnostics, eqSummary, fingerprint } from '../../src/diagnostics.js';
import { defaultChain } from '../../src/dsp/chain-params.js';

test('is off by default and records nothing', () => {
  const d = createDiagnostics();
  d.record('x', { a: 1 });
  d.count('resets');
  expect(JSON.parse(d.export()).events).toEqual([]);
  expect(JSON.parse(d.export()).counters.resets).toBe(0);
});

test('keeps a bounded ring buffer and counts dropped events', () => {
  let t = 0;
  const d = createDiagnostics({ capacity: 3, enabled: true, now: () => t++, wall: () => 1000, buildSha: 'abc123' });
  for (let i = 0; i < 5; i++) d.record('tick', { i });
  const out = JSON.parse(d.export());
  expect(out.events.map(e => e.i)).toEqual([2, 3, 4]);
  expect(out.dropped).toBe(2);
  expect(out.buildSha).toBe('abc123');
  expect(out.events[0]).toMatchObject({ type: 'tick', wall: 1000 });
});

test('drops file names, paths, messages and non-scalar values', () => {
  const d = createDiagnostics({ enabled: true });
  d.record('x', { name: 'my song.wav', path: '/Users/me/song.wav', message: 'Unable to decode this WAV', ok: 'processed', n: 2, flag: true, spectrum: [1, 2, 3], nested: { a: 1 } });
  const [event] = JSON.parse(d.export()).events;
  expect(event).toMatchObject({ ok: 'processed', n: 2, flag: true });
  for (const key of ['name', 'path', 'message', 'spectrum', 'nested']) expect(event).not.toHaveProperty(key);
});

test('worklet counters only grow', () => {
  const d = createDiagnostics({ enabled: true });
  d.setCounter('resets', 3);
  d.setCounter('resets', 1);
  expect(JSON.parse(d.export()).counters.resets).toBe(3);
});

test('fingerprint and eq summary carry no band values', () => {
  const flat = defaultChain();
  const edited = structuredClone(flat);
  edited.eq.left[3].enabled = true;
  edited.eq.left[3].gain = 6;
  expect(fingerprint(flat)).not.toBe(fingerprint(edited));
  expect(fingerprint(flat)).toBe(fingerprint(structuredClone(flat)));
  expect(eqSummary(edited)).toEqual({ eqEnabled: true, activeBandsL: 1, activeBandsR: 0 });
});
