import { describe, expect, test } from 'vitest';
import { alignOffset, makeListeningSet } from '../../scripts/listening-set.js';
import { measureLoudness } from '../../src/dsp/loudness.js';
import { renderChain } from '../../src/dsp/chain.js';
import { FIXTURES } from '../fixtures/dsp-fixtures.js';
import { PRESETS } from '../harness/presets.js';
import { noise } from '../fixtures/signals.js';

describe('LAS-29 blind listening set', () => {
  const rate = 44100;
  const original = FIXTURES.programme(rate);
  const processed = renderChain(PRESETS.master, original, rate).channels;

  test('versions are matched to the quietest loudness by turning the louder ones down', () => {
    const set = makeListeningSet({ original, processed }, rate, { seed: 3 });
    const levels = Object.values(set.files).map(channels => measureLoudness(channels, rate).integratedLufs);
    expect(Math.abs(levels[0] - levels[1])).toBeLessThan(0.05);
    expect(Math.min(...Object.values(set.key.gainsDb))).toBeLessThan(-1); // the master is louder and is turned down
    expect(Math.max(...Object.values(set.key.gainsDb))).toBe(0);
    expect(set.files.A[0].length).toBe(original[0].length); // same segment length, same position
  });

  test('blind labels are shuffled reproducibly from the seed and recorded only in the key', () => {
    const first = makeListeningSet({ original, processed }, rate, { seed: 3 });
    expect(makeListeningSet({ original, processed }, rate, { seed: 3 }).key.labels).toEqual(first.key.labels);
    const seen = new Set(Array.from({ length: 12 }, (_, seed) => makeListeningSet({ original, processed }, rate, { seed: seed + 1 }).key.labels.A));
    expect(seen).toEqual(new Set(['original', 'processed']));
    expect(Object.keys(first.files)).toEqual(['A', 'B']);
  });

  test('a reference recording is found at its offset; an unrelated one correlates weakly', () => {
    const shift = Math.round(0.37 * rate);
    const reference = original.map(channel => { const late = new Float32Array(channel.length); late.set(channel.subarray(0, channel.length - shift).map(v => v * 0.7), shift); return late; });
    const found = alignOffset(original, reference, rate);
    expect(Math.abs(found.offsetSeconds - 0.37)).toBeLessThan(1.5 / rate);
    expect(found.correlation).toBeGreaterThan(0.8);
    const unrelated = [Float32Array.from(noise({ seconds: 4, rate, amplitude: 0.3, seed: 99 }))];
    expect(alignOffset(original, unrelated, rate).correlation).toBeLessThan(0.2);
  });

  test('silent segments are refused', () => {
    expect(() => makeListeningSet({ original: FIXTURES['silence-stereo'](rate), processed }, rate)).toThrow('silent or too short');
  });
});
