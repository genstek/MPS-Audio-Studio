import { describe, expect, test } from 'vitest';
import { encodeWav } from '../../src/dsp/wav-encode.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { renderChain } from '../../src/dsp/chain.js';
import { defaultChain, editBand } from '../../src/dsp/chain-params.js';
import { noise, sine } from '../fixtures/signals.js';

const f32 = signal => Float32Array.from(signal);

describe('LAS-28 WAV export encoding', () => {
  test('24-bit stereo: header and samples round-trip within half a step', () => {
    const left = f32(sine({ frequency: 997, dbfs: -3, seconds: 0.5, rate: 96000 }));
    const right = f32(noise({ seconds: 0.5, rate: 96000, amplitude: 0.5, seed: 4 }));
    const { bytes, clippedSamples } = encodeWav([left, right], 96000, { bitDepth: 24 });
    expect(clippedSamples).toBe(0);
    const view = new DataView(bytes);
    expect({ format: view.getUint16(20, true), channels: view.getUint16(22, true), rate: view.getUint32(24, true), bits: view.getUint16(34, true) })
      .toEqual({ format: 1, channels: 2, rate: 96000, bits: 24 });
    const decoded = decodeWav(bytes);
    expect(decoded).toMatchObject({ channels: 2, sampleRate: 96000, bitsPerSample: 24, frames: left.length });
    for (const [c, source] of [[0, left], [1, right]]) {
      let largest = 0;
      for (let n = 0; n < source.length; n++) largest = Math.max(largest, Math.abs(decoded.samples[c][n] - source[n]));
      expect(largest).toBeLessThanOrEqual(0.5 / 8388608 + 1e-12);
    }
  });

  test('samples beyond full scale are clipped and counted', () => {
    const { bytes, clippedSamples } = encodeWav([Float32Array.of(0, 1.5, -2, 1, -1, 0.25)], 44100);
    expect(clippedSamples).toBe(3); // 1.5, −2 and +1.0 (one step above the largest positive value)
    expect(Array.from(decodeWav(bytes).samples[0])).toEqual([0, 8388607 / 8388608, -1, 8388607 / 8388608, -1, 0.25]);
  });

  test('16-bit adds deterministic TPDF dither of at most ±1 step and keeps low-level signals', () => {
    const silence = new Float32Array(48000);
    const first = encodeWav([silence], 48000, { bitDepth: 16 });
    expect(new Uint8Array(first.bytes)).toEqual(new Uint8Array(encodeWav([silence], 48000, { bitDepth: 16 }).bytes));
    const steps = Array.from(decodeWav(first.bytes).samples[0], v => Math.round(v * 32768));
    expect(new Set(steps)).toEqual(new Set([-1, 0, 1]));
    expect(Math.abs(steps.reduce((a, b) => a + b, 0) / steps.length)).toBeLessThan(0.02);
    // A −80 dBFS tone (3.3 steps) keeps its level within 0.5 dB through dithered 16-bit.
    const quiet = f32(sine({ dbfs: -80, seconds: 1 }));
    const back = decodeWav(encodeWav([quiet], 48000, { bitDepth: 16 }).bytes).samples[0];
    const correlate = (a, b) => a.reduce((sum, v, n) => sum + v * b[n], 0);
    expect(20 * Math.log10(correlate(back, quiet) / correlate(quiet, quiet))).toBeCloseTo(0, 0);
  });

  test('other bit depths are refused', () => {
    expect(() => encodeWav([new Float32Array(4)], 48000, { bitDepth: 32 })).toThrow('24-bit and 16-bit');
  });

  test('an exported render equals the offline chain output within 24-bit rounding', () => {
    const input = [f32(sine({ frequency: 1000, dbfs: -12, seconds: 1 })), f32(noise({ seconds: 1, amplitude: 0.3, seed: 2 }))];
    const params = editBand(defaultChain(), 'left', 10, { enabled: true, frequency: 1000, gain: 6 });
    const rendered = renderChain(params, input, 48000);
    const exported = decodeWav(encodeWav(rendered.channels, 48000).bytes);
    expect(exported.frames).toBe(input[0].length); // same duration as the source
    for (let c = 0; c < 2; c++) {
      let largest = 0;
      for (let n = 0; n < exported.frames; n++) largest = Math.max(largest, Math.abs(exported.samples[c][n] - rendered.channels[c][n]));
      expect(largest).toBeLessThanOrEqual(0.5 / 8388608 + 1e-9);
    }
  });
});
