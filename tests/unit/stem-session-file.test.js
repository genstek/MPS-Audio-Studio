import { expect, test } from 'vitest';
import { defaultChain, editBand } from '../../src/dsp/chain-params.js';
import { bypassChain } from '../../src/dsp/stem-render.js';
import { matchStems, parseStemSession, serializeStemSession } from '../../src/stem-session-file.js';

const sha = c => c.repeat(64);
const stems = [
  { id: 1, name: 'drums.wav', sha256: sha('a'), offset: 0, gainDb: -2, pan: 0, mute: false, solo: false, chainLabel: 'copy of master settings', params: editBand(defaultChain(), 'left', 4, { enabled: true, gain: 3 }) },
  { id: 2, name: 'bass.wav', sha256: sha('b'), offset: 0.0125, gainDb: 0, pan: -0.25, mute: true, solo: false, chainLabel: 'bypass', params: bypassChain() },
];

test('a stem session round-trips with every strip setting and chain', () => {
  const text = serializeStemSession(stems, defaultChain());
  const { master, stems: saved } = parseStemSession(text);
  expect(master).toEqual(defaultChain());
  expect(saved).toEqual(stems.map(({ name, sha256, offset, gainDb, pan, mute, solo, chainLabel, params }) => ({ name, sha256, offset, gainDb, pan, mute, solo, chainLabel, chain: params, width: { enabled: false, width: 1, crossoverHz: 150 } }))); // files without a width load as off
  expect(text).not.toMatch(/RIFF|data:audio/); // settings only
});

test('recall applies only to stems with the same checksum; the rest are reported', () => {
  const { stems: saved } = parseStemSession(serializeStemSession(stems, defaultChain()));
  const loaded = [{ id: 7, name: 'drums (copy).wav', sha256: sha('a') }, { id: 8, name: 'other.wav', sha256: sha('c') }];
  expect(matchStems(saved, loaded)).toEqual({ matched: [{ loadedId: 7, saved: saved[0] }], missing: ['bass.wav'] });
});

test('newer, foreign, broken and out-of-range files are refused with a reason', () => {
  const good = JSON.parse(serializeStemSession(stems, defaultChain()));
  const refuse = value => { try { parseStemSession(typeof value === 'string' ? value : JSON.stringify(value)); } catch (failure) { return failure.message; } throw new Error('accepted'); };
  expect(refuse({ ...good, version: 2 })).toBe('This session was saved by a newer studio (mps-stem-session v2); update the studio to open it.');
  expect(refuse({ schema: 'mps-chain' })).toBe('The file is not an MPS stem session.');
  expect(refuse('{oops')).toBe('The file is not valid JSON.');
  expect(refuse({ ...good, stems: [{ ...good.stems[0], gainDb: 40 }] })).toBe('Stem 1 has an offset, gain or pan outside the supported range.');
  expect(refuse({ ...good, stems: [{ ...good.stems[0], sha256: 'x' }] })).toBe('Stem 1 has no valid checksum.');
  expect(refuse({ ...good, master: { ...good.master, order: ['limiter'] } })).toMatch(/^The session's settings are invalid: /);
});
