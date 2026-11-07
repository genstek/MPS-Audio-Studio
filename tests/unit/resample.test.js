import { describe, expect, test } from 'vitest';
import { resample, resampledFrames, checkConversion, ResampleError, MAX_OUTPUT_BYTES } from '../../src/dsp/resample.js';
import { encodeWav } from '../../src/dsp/wav-encode.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { sine } from '../fixtures/signals.js';

// LAS-127: deterministic synthetic fixtures only. These tests prove the converter's signal
// behaviour (length, pitch, anti-aliasing, continuity, channel order, PCM bytes); they do not
// prove listening quality.
const f32 = signal => Float32Array.from(signal);
const tone = (frequency, rate, seconds = 0.5, dbfs = -6) => f32(sine({ frequency, rate, seconds, dbfs }));
const rms = (signal, from, to) => {
  let sum = 0;
  for (let n = from; n < to; n++) sum += signal[n] ** 2;
  return Math.sqrt(sum / (to - from));
};
const peak = signal => signal.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
const MARGIN = 6000; // frames ignored at each edge (filter run-in / run-out)

describe('LAS-127 sample-rate conversion', () => {
  test.each([[44100, 96000], [48000, 96000], [96000, 44100], [96000, 48000], [44100, 48000], [88200, 44100]])(
    '%i → %i Hz: frame count is round(frames × ratio), so duration is kept',
    (from, to) => {
      const input = tone(1000, from, 0.37);
      const [out] = resample([input], from, to);
      expect(out.length).toBe(Math.round((input.length * to) / from));
      expect(out.length).toBe(resampledFrames(input.length, from, to));
      expect(Math.abs(out.length / to - input.length / from)).toBeLessThanOrEqual(0.5 / to + 1e-12);
    },
  );

  test.each([[44100, 96000], [48000, 96000], [96000, 44100], [96000, 48000]])(
    '%i → %i Hz keeps a 1 kHz tone at the same pitch and level (matches an ideal sine at the new rate)',
    (from, to) => {
      const [out] = resample([tone(1000, from, 0.6)], from, to);
      const ideal = tone(1000, to, 0.6);
      let worst = 0;
      for (let n = MARGIN; n < out.length - MARGIN; n++) worst = Math.max(worst, Math.abs(out[n] - ideal[n]));
      expect(worst).toBeLessThan(2e-4);
    },
  );

  test('downsampling 96 → 44.1 kHz removes a 30 kHz tone (> 80 dB down) instead of aliasing it', () => {
    const [out] = resample([tone(30000, 96000, 0.6, -6)], 96000, 44100);
    const residual = rms(out, MARGIN / 2, out.length - MARGIN / 2);
    expect(20 * Math.log10(residual / (0.5 / Math.SQRT2))).toBeLessThan(-80);
  });

  test('a 15 kHz tone passes a 96 → 44.1 kHz conversion within 0.05 dB', () => {
    const [out] = resample([tone(15000, 96000, 0.6, -6)], 96000, 44100);
    const level = 20 * Math.log10(rms(out, MARGIN / 2, out.length - MARGIN / 2) / (0.5 / Math.SQRT2));
    expect(Math.abs(level)).toBeLessThan(0.05);
  });

  test('audio is continuous: no step or click larger than the sine slope allows', () => {
    const [out] = resample([tone(1000, 44100, 0.6, -6)], 44100, 96000);
    const maxStep = 10 ** (-6 / 20) * 2 * Math.PI * 1000 / 96000;
    let largest = 0;
    // The tone itself ends abruptly (a real step), so the check covers the steady interior.
    for (let n = MARGIN; n < out.length - MARGIN; n++) largest = Math.max(largest, Math.abs(out[n] - out[n - 1]));
    expect(largest).toBeLessThan(maxStep * 1.02);
  });

  test('stereo channel order is kept (left tone, silent right) and mono gives the same samples', () => {
    const left = tone(2000, 48000, 0.4), right = new Float32Array(left.length);
    const [l, r] = resample([left, right], 48000, 96000);
    expect(rms(l, MARGIN, l.length - MARGIN)).toBeGreaterThan(0.3);
    expect(peak(r)).toBe(0);
    const [mono] = resample([left], 48000, 96000);
    expect(mono).toEqual(l);
  });

  test('same rate returns an equal copy; the input is never modified', () => {
    const input = tone(1000, 48000, 0.1), before = Float32Array.from(input);
    const [same] = resample([input], 48000, 48000);
    expect(same).toEqual(input);
    expect(same).not.toBe(input);
    resample([input], 48000, 96000);
    expect(input).toEqual(before);
  });

  test('a one-sample and an empty input convert without error', () => {
    expect(resample([Float32Array.of(0.5)], 44100, 96000)[0].length).toBe(2);
    expect(resample([new Float32Array(0)], 44100, 96000)[0].length).toBe(0);
  });

  test('reports monotonic progress ending at 1', () => {
    const seen = [];
    resample([tone(1000, 44100, 2), tone(1000, 44100, 2)], 44100, 96000, { onProgress: value => seen.push(value) });
    expect(seen.at(-1)).toBe(1);
    for (let i = 1; i < seen.length; i++) expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
  });

  test('unsupported rates and oversized outputs are refused with a clear message', () => {
    expect(() => resample([new Float32Array(10)], 44100, 1000)).toThrow(ResampleError);
    const frames = Math.ceil(MAX_OUTPUT_BYTES / 6) + 1;
    expect(() => checkConversion({ frames, channels: 2, inRate: 96000, outRate: 96000, bitDepth: 24 })).toThrow(/export limit/);
    expect(() => checkConversion({ frames: 1000, channels: 2, inRate: 44100, outRate: 96000, bitDepth: 24 })).not.toThrow();
  });
});

describe('LAS-127 96 kHz / 24-bit WAV output', () => {
  test('an upsampled 44.1 kHz source encodes to a real 96 kHz / 24-bit PCM file that an independent parse reads back', () => {
    const out = resample([tone(997, 44100, 0.5, -3), tone(1500, 44100, 0.5, -9)], 44100, 96000);
    const { bytes, clippedSamples } = encodeWav(out, 96000, { bitDepth: 24 });
    expect(clippedSamples).toBe(0);
    const view = new DataView(bytes);
    const frames = out[0].length;
    expect(String.fromCharCode(...new Uint8Array(bytes, 0, 4))).toBe('RIFF');
    expect([view.getUint16(20, true), view.getUint16(22, true), view.getUint32(24, true), view.getUint32(28, true), view.getUint16(32, true), view.getUint16(34, true)])
      .toEqual([1, 2, 96000, 96000 * 6, 6, 24]);
    expect(view.getUint32(40, true)).toBe(frames * 6);
    expect(bytes.byteLength).toBe(44 + frames * 6);
    const sample = offset => (view.getUint8(offset) | (view.getUint8(offset + 1) << 8) | (view.getInt8(offset + 2) << 16)) / 8388608;
    const at = 44 + 6 * 1000;
    expect(decodeWav(bytes)).toMatchObject({ channels: 2, sampleRate: 96000, bitsPerSample: 24, frames });
    expect(Math.abs(sample(at) - out[0][1000])).toBeLessThanOrEqual(0.5 / 8388608 + 1e-7);
    expect(Math.abs(sample(at + 3) - out[1][1000])).toBeLessThanOrEqual(0.5 / 8388608 + 1e-7);
    // the low byte carries information, so this is not 16-bit data padded to 24 bits
    let lowByteNonZero = 0;
    for (let n = 0; n < 2000; n++) if (view.getUint8(44 + n * 6) !== 0) lowByteNonZero++;
    expect(lowByteNonZero).toBeGreaterThan(1500);
  });

  test('16-bit output is 2 bytes per sample with TPDF dither of at most ±1 step on silence', () => {
    const out = resample([new Float32Array(4410)], 44100, 48000);
    const { bytes } = encodeWav(out, 48000, { bitDepth: 16 });
    const view = new DataView(bytes);
    expect(bytes.byteLength).toBe(44 + out[0].length * 2);
    let largest = 0;
    for (let n = 0; n < out[0].length; n++) largest = Math.max(largest, Math.abs(view.getInt16(44 + n * 2, true)));
    expect(largest).toBeLessThanOrEqual(1);
  });

  test('filter overshoot above full scale is clipped and counted, never wrapped', () => {
    const square = Float32Array.from({ length: 4800 }, (_, n) => (Math.floor(n / 24) % 2 ? -1 : 1));
    const out = resample([square], 48000, 96000);
    expect(Math.max(...out[0])).toBeGreaterThan(1);
    const { bytes, clippedSamples } = encodeWav(out, 96000, { bitDepth: 24 });
    expect(clippedSamples).toBeGreaterThan(0);
    const decoded = decodeWav(bytes);
    expect(Math.max(...decoded.samples[0])).toBeLessThanOrEqual(1);
    expect(Math.min(...decoded.samples[0])).toBeGreaterThanOrEqual(-1);
  });
});
