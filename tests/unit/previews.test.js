import { describe, expect, test } from 'vitest';
import { createChain } from '../../src/dsp/chain.js';
import { defaultChain, validateChain } from '../../src/dsp/chain-params.js';
import { changedModules, compressorOutputDb, limiterOutputDb } from '../../src/previews.js';

// LAS-63: the card and editor previews draw static curves from the settings. These tests check that
// the drawn curve is what the running chain does with a steady signal, so a preview never shows a
// shape the processor does not have.
const rate = 48000;
function steadyOutputDb(params, inputDb) {
  const chain = createChain(params, rate, 1);
  const level = 10 ** (inputDb / 20);
  const block = 128;
  const input = [new Float32Array(block).fill(level)];
  const output = [new Float32Array(block)];
  for (let i = 0; i < (3 * rate) / block; i++) chain.process(input, output, block); // 3 s to settle
  return 20 * Math.log10(Math.abs(output[0][block - 1]));
}
const only = changes => {
  const p = defaultChain();
  return validateChain({ ...p, eq: { ...p.eq, enabled: false }, limiter: { ...p.limiter, enabled: false }, ...changes });
};

describe('LAS-63 previews match the processors', () => {
  test('compressor curve (threshold, ratio, soft knee, makeup) equals the chain at steady levels', () => {
    const compressor = { enabled: true, threshold: -24, ratio: 4, attack: 5, release: 50, knee: 8, makeup: 3, detector: 'peak' };
    const params = only({ compressor });
    for (const inputDb of [-48, -30, -27, -24, -21, -12, -3]) {
      expect(steadyOutputDb(params, inputDb), `${inputDb} dBFS in`).toBeCloseTo(compressorOutputDb(inputDb, compressor), 1);
    }
    // Hard knee and the ratio above the threshold.
    expect(compressorOutputDb(-12, { threshold: -24, ratio: 4, knee: 0, makeup: 0 })).toBeCloseTo(-21, 9);
    expect(compressorOutputDb(-30, { threshold: -24, ratio: 4, knee: 0, makeup: 0 })).toBe(-30);
  });

  test('limiter curve (input gain, ceiling) equals the chain at steady levels', () => {
    const limiter = { enabled: true, ceiling: -3, inputGain: 6, release: 50 };
    const params = only({ limiter });
    for (const inputDb of [-20, -12, -9, -6, -2]) {
      expect(steadyOutputDb(params, inputDb), `${inputDb} dBFS in`).toBeCloseTo(limiterOutputDb(inputDb, limiter), 1);
    }
  });

  test('"edited" marks exactly the modules that differ from the defaults', () => {
    expect(changedModules(defaultChain())).toEqual({ eq: false, compressor: false, space: false, limiter: false });
    const p = defaultChain();
    const edited = validateChain({ ...p, compressor: { ...p.compressor, enabled: true }, space: { ...p.space, mix: 30 } });
    expect(changedModules(edited)).toEqual({ eq: false, compressor: true, space: true, limiter: false });
  });
});
