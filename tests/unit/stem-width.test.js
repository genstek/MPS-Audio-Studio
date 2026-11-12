import { describe, expect, test } from 'vitest';
import { bypassChain, renderStemMix } from '../../src/dsp/stem-render.js';
import {
  applyStemWidth, DEFAULT_WIDTH, highpassCoefficients, measureLowBand, measureStereo, stereoWarnings, StemWidthError, validateStemWidth,
} from '../../src/dsp/stem-width.js';
import { biquadResponseDb } from '../../src/dsp/biquad.js';
import { serializeStemSession, parseStemSession } from '../../src/stem-session-file.js';

const RATE = 48000;
const FRAMES = RATE; // 1 s
const tone = (frequency, amplitude = 0.3, phase = 0, frames = FRAMES) => Float32Array.from({ length: frames }, (_, n) => amplitude * Math.sin(2 * Math.PI * frequency * n / RATE + phase));
const on = (width, crossoverHz = 150) => ({ enabled: true, width, crossoverHz });
// RMS over the settled second half (the filter has no start-up transient left).
const rms = a => { let s = 0; const start = a.length >> 1; for (let n = start; n < a.length; n++) s += a[n] * a[n]; return Math.sqrt(s / (a.length - start)); };
const mid = ([l, r]) => Float32Array.from(l, (v, n) => (v + r[n]) / 2);
const side = ([l, r]) => Float32Array.from(l, (v, n) => (v - r[n]) / 2);
// A pure side signal of one frequency: L = +x, R = −x (M = 0, S = x).
const sideOnly = (frequency, amplitude = 0.3) => { const x = tone(frequency, amplitude); return [x, x.map(v => -v)]; };
const sideGain = (frequency, settings) => rms(side(applyStemWidth(sideOnly(frequency), settings, RATE))) / rms(side(sideOnly(frequency)));
const stem = (channels, overrides = {}) => ({ name: 'a', sampleRate: RATE, channels, offsetFrames: 0, gainDb: 0, pan: 0, mute: false, solo: false, params: bypassChain(), ...overrides });

describe('settings schema', () => {
  test('defaults are off and neutral; missing fields (old files) load as off; bounds are refused', () => {
    expect(DEFAULT_WIDTH).toEqual({ enabled: false, width: 1, crossoverHz: 150 });
    expect(validateStemWidth(undefined)).toEqual(DEFAULT_WIDTH);
    expect(validateStemWidth({ width: 1.5 })).toEqual({ enabled: false, width: 1.5, crossoverHz: 150 });
    for (const bad of [{ width: -0.1 }, { width: 2.1 }, { width: NaN }, { crossoverHz: 59 }, { crossoverHz: 401 }, { enabled: 1 }, { width: '1' }]) {
      expect(() => validateStemWidth(bad), JSON.stringify(bad)).toThrow(StemWidthError);
    }
  });
});

describe('stereo matrix (above the crossover)', () => {
  test('width 1, and the stage switched off at any width, return the very same samples (identity)', () => {
    const stereo = [tone(2000), tone(3100, 0.2)];
    expect(applyStemWidth(stereo, on(1), RATE)).toBe(stereo);
    expect(applyStemWidth(stereo, { enabled: false, width: 1.8, crossoverHz: 150 }, RATE)).toBe(stereo);
    expect(applyStemWidth(stereo, undefined, RATE)).toBe(stereo);
  });

  test('width scales side only; mid is untouched at every width', () => {
    const stereo = [tone(2000, 0.3), tone(3100, 0.2, 0.7)];
    for (const w of [0, 0.5, 1.5, 2]) {
      const out = applyStemWidth(stereo, on(w), RATE);
      const m0 = mid(stereo), m1 = mid(out);
      let worst = 0;
      for (let n = 0; n < m0.length; n++) worst = Math.max(worst, Math.abs(m0[n] - m1[n]));
      expect(worst, `width ${w}`).toBeLessThan(1e-6);
    }
  });

  test('width 0 folds to mono (L = R = M); width 2 doubles the side level at 5 kHz; width 0.5 halves it', () => {
    const stereo = [tone(2000, 0.3), tone(3100, 0.2, 0.7)];
    const [l, r] = applyStemWidth(stereo, on(0), RATE);
    const m = mid(stereo);
    for (let n = 0; n < FRAMES; n += 97) { expect(l[n]).toBeCloseTo(m[n], 6); expect(r[n]).toBeCloseTo(m[n], 6); }
    expect(sideGain(5000, on(2))).toBeCloseTo(2, 2);
    expect(sideGain(5000, on(0.5))).toBeCloseTo(0.5, 3);
  });

  test('mono source (one channel, or identical channels) is unchanged: no side signal', () => {
    const mono = [tone(1000)];
    expect(applyStemWidth(mono, on(2), RATE)).toBe(mono);
    const dual = [tone(1000), tone(1000)];
    const [l, r] = applyStemWidth(dual, on(2), RATE);
    for (let n = 0; n < FRAMES; n += 53) { expect(l[n]).toBeCloseTo(dual[0][n], 6); expect(r[n]).toBeCloseTo(dual[1][n], 6); }
  });

  test('left/right order is kept: swapping the inputs swaps the outputs; left-only stays left-heavy', () => {
    const a = tone(2500, 0.4), b = tone(1700, 0.1, 1);
    const [l1, r1] = applyStemWidth([a, b], on(1.7), RATE);
    const [l2, r2] = applyStemWidth([b, a], on(1.7), RATE);
    for (let n = 0; n < FRAMES; n += 31) { expect(l1[n]).toBeCloseTo(r2[n], 6); expect(r1[n]).toBeCloseTo(l2[n], 6); }
    const out = applyStemWidth([a, new Float32Array(FRAMES)], on(2), RATE);
    expect(rms(out[0])).toBeGreaterThan(rms(out[1]));
  });
});

describe('low-bass protection (mono crossover)', () => {
  test('below the crossover side is not widened; narrowing still narrows; above it widens fully', () => {
    expect(sideGain(40, on(2, 150))).toBeLessThan(1.05); // ~1.9 octaves below: widening is only a few percent
    expect(sideGain(40, on(2, 150))).toBeGreaterThan(0.9);
    expect(sideGain(40, on(0, 150))).toBeLessThan(0.01); // width 0 removes the bass side too
    expect(sideGain(40, on(0.5, 150))).toBeCloseTo(0.5, 3); // narrowing is full band
    expect(sideGain(2000, on(2, 150))).toBeCloseTo(2, 1);
  });

  test('documented slope: the LR2 highpass is −6 dB at the crossover and 12 dB/oct below it; the side gain never exceeds width and dips ≤ 1.2 dB', () => {
    const hp = highpassCoefficients(150, RATE);
    expect(biquadResponseDb(hp, 150, RATE)).toBeCloseTo(-6.02, 1);
    const octave = biquadResponseDb(hp, 10, RATE) - biquadResponseDb(hp, 20, RATE); // well below the corner: the asymptotic slope
    expect(octave).toBeLessThan(-11.5);
    expect(octave).toBeGreaterThan(-12.5);
    // Complex side gain at width 2: S'/S = 1 + (w − 1)·H(f).
    const w = 2;
    let max = 0, min = Infinity;
    for (let f = 20; f < 20000; f *= 1.03) {
      const om = (2 * Math.PI * f) / RATE;
      const { b0, b1, b2, a1, a2 } = hp;
      const nr = b0 + b1 * Math.cos(om) + b2 * Math.cos(2 * om), ni = -(b1 * Math.sin(om) + b2 * Math.sin(2 * om));
      const dr = 1 + a1 * Math.cos(om) + a2 * Math.cos(2 * om), di = -(a1 * Math.sin(om) + a2 * Math.sin(2 * om));
      const den = dr * dr + di * di;
      const hr = (nr * dr + ni * di) / den, hi = (ni * dr - nr * di) / den;
      const gain = Math.hypot(1 + (w - 1) * hr, (w - 1) * hi);
      max = Math.max(max, gain);
      min = Math.min(min, gain);
    }
    expect(max).toBeLessThanOrEqual(w + 1e-9);
    expect(20 * Math.log10(min)).toBeGreaterThan(-1.2);
  });

  test('the crossover is configurable: a higher crossover protects a 180 Hz side signal that a lower one widens', () => {
    expect(sideGain(180, on(2, 300))).toBeLessThan(sideGain(180, on(2, 100)));
  });
});

describe('impulse response and continuity', () => {
  test('a centred impulse passes unchanged; a side impulse is scaled as the equation says, then decays, all finite', () => {
    const frames = 4800;
    const centre = new Float32Array(frames); centre[100] = 0.5;
    const [cl, cr] = applyStemWidth([centre, centre], on(2), RATE);
    expect(Array.from(cl)).toEqual(Array.from(centre));
    expect(Array.from(cr)).toEqual(Array.from(centre));
    const wide = new Float32Array(frames); wide[100] = 0.5;
    const [l, r] = applyStemWidth([wide, new Float32Array(frames)], on(2), RATE);
    // Sample 100: S = 0.25, D = (2−1)·h0·S with h0 the highpass's first output sample.
    const h0 = highpassCoefficients(150, RATE).b0;
    expect(l[100]).toBeCloseTo(0.5 + 0.25 * h0, 6);
    expect(r[100]).toBeCloseTo(-0.25 * h0, 6);
    for (const v of [...l, ...r]) expect(Number.isFinite(v)).toBe(true);
    expect(Math.abs(l[frames - 1])).toBeLessThan(1e-3);
  });

  test('continuity: a wide sine has no step larger than its own maximum slope', () => {
    const a = tone(200, 0.4), b = tone(200, 0.4, 2);
    const [l] = applyStemWidth([a, b], on(2), RATE);
    let largest = 0;
    for (let n = 1; n < l.length; n++) largest = Math.max(largest, Math.abs(l[n] - l[n - 1]));
    expect(largest).toBeLessThan(2 * (0.4 + 0.4 * 2) * 2 * Math.PI * 200 / RATE); // generous bound: ≤ 2× the summed input slopes
  });
});

describe('phase-risk material (synth / strings)', () => {
  // Wide detuned-unison pad: L and R carry the same notes with a phase offset and a small detune.
  const pad = () => [
    tone(220, 0.2, 0).map((v, n) => v + 0.1 * Math.sin(2 * Math.PI * 440 * n / RATE)),
    tone(221, 0.2, 1.05).map((v, n) => v + 0.1 * Math.sin(2 * Math.PI * 441.5 * n / RATE + 1)),
  ];
  test('narrowing improves, and widening worsens, the measured mono fold-down', () => {
    const base = measureStereo(...pad());
    const narrow = measureStereo(...applyStemWidth(pad(), on(0.3), RATE));
    const wide = measureStereo(...applyStemWidth(pad(), on(2), RATE));
    expect(narrow.monoFoldDownDb).toBeGreaterThan(base.monoFoldDownDb);
    expect(wide.monoFoldDownDb).toBeLessThan(base.monoFoldDownDb);
  });
  test('measurements are exact on constructed signals: identical, quadrature, anti-phase, silence', () => {
    const x = tone(1000);
    const same = measureStereo(x, x);
    expect(same.correlation).toBeCloseTo(1, 6);
    expect(same.monoFoldDownDb).toBeCloseTo(0, 6);
    const quad = measureStereo(x, tone(1000, 0.3, Math.PI / 2));
    expect(Math.abs(quad.correlation)).toBeLessThan(1e-3);
    expect(quad.monoFoldDownDb).toBeCloseTo(-3.01, 1);
    const anti = measureStereo(x, x.map(v => -v));
    expect(anti.correlation).toBeCloseTo(-1, 6);
    expect(anti.monoFoldDownDb).toBe(-Infinity);
    expect(measureStereo(new Float32Array(10), new Float32Array(10))).toEqual({ correlation: null, monoFoldDownDb: null, sideToMidDb: null });
  });
  test('warnings quote measured values and appear only past their thresholds', () => {
    const x = tone(1000);
    expect(stereoWarnings('pad', measureStereo(x, x), measureLowBand(x, x, 150, RATE), 150)).toEqual([]);
    const text = stereoWarnings('pad', measureStereo(x, x.map(v => -v)), measureStereo(x, x), 150).join(' ');
    expect(text).toContain('correlation −1.00');
    expect(text).toContain('−∞ dB');
    expect(text).not.toContain('below 150 Hz');
    const low = stereoWarnings('pad', measureStereo(x, x), { correlation: -1, monoFoldDownDb: -12.3, sideToMidDb: 0 }, 150).join(' ');
    expect(low).toContain('below 150 Hz a mono fold-down is −12.3 dB');
  });
  test('the low-band measurement sees a bass-only phase problem that the broadband value hides', () => {
    const bass = tone(60, 0.3), hi = tone(3000, 0.3);
    const left = bass.map((v, n) => v + hi[n]), right = bass.map((v, n) => -v + hi[n]);
    expect(measureStereo(left, right).monoFoldDownDb).toBeGreaterThan(-3.5);
    expect(measureLowBand(left, right, 150, RATE).monoFoldDownDb).toBeLessThan(-12);
  });
});

describe('offline stem mix integration', () => {
  const stereoA = () => [tone(2000, 0.3), tone(3100, 0.2, 0.7)];
  test('default / off / width 1 settings render bit-identically to a render with no width field (regression safe)', () => {
    const reference = renderStemMix({ stems: [stem(stereoA(), { pan: 0.3, gainDb: -2 })], master: bypassChain() });
    for (const width of [undefined, DEFAULT_WIDTH, { enabled: true, width: 1, crossoverHz: 150 }, { enabled: false, width: 2, crossoverHz: 200 }]) {
      const out = renderStemMix({ stems: [stem(stereoA(), { pan: 0.3, gainDb: -2, width })], master: bypassChain() });
      expect(Array.from(out.combined[0]), JSON.stringify(width)).toEqual(Array.from(reference.combined[0]));
      expect(Array.from(out.combined[1])).toEqual(Array.from(reference.combined[1]));
    }
  });
  test('width is isolated per stem and applied before pan', () => {
    const a = stem(stereoA(), { name: 'a', pan: -0.5, width: on(2) });
    const b = stem(stereoA(), { name: 'b', pan: 0.5 });
    const both = renderStemMix({ stems: [a, b], master: bypassChain() });
    const onlyB = renderStemMix({ stems: [{ ...a, width: undefined }, b], master: bypassChain() });
    expect(Array.from(both.strips[1].channels[0])).toEqual(Array.from(onlyB.strips[1].channels[0]));
    expect(Array.from(both.strips[0].channels[0])).not.toEqual(Array.from(onlyB.strips[0].channels[0]));
    // Pan is not discarded: a hard-left pan still follows the pan law for the widened image.
    const panned = renderStemMix({ stems: [stem(stereoA(), { pan: -1, width: on(2) })], master: bypassChain() });
    expect(rms(panned.strips[0].channels[0])).toBeGreaterThan(rms(panned.strips[0].channels[1]));
  });
  test('a mono file is unaffected, and strips carry measurements', () => {
    const mono = [tone(1500)];
    const a = renderStemMix({ stems: [stem(mono, { width: on(2) })], master: bypassChain() });
    const b = renderStemMix({ stems: [stem(mono)], master: bypassChain() });
    expect(Array.from(a.combined[0])).toEqual(Array.from(b.combined[0]));
    expect(a.strips[0].stereo.correlation).toBeCloseTo(1, 6);
    expect(a.strips[0].stereo.crossoverHz).toBe(150);
  });
  test('invalid width settings are refused by the render, not guessed', () => {
    expect(() => renderStemMix({ stems: [stem(stereoA(), { width: { enabled: true, width: 5 } })], master: bypassChain() })).toThrow(StemWidthError);
  });
});

describe('recall (stem session file)', () => {
  const sha = 'a'.repeat(64);
  const entry = width => ({ name: 'a.wav', sha256: sha, offset: 0, gainDb: 0, pan: 0, mute: false, solo: false, chainLabel: 'bypass', params: bypassChain(), width });
  test('width round-trips; an older file without it loads as off', () => {
    const text = serializeStemSession([entry(on(1.4, 180))], bypassChain());
    expect(parseStemSession(text).stems[0].width).toEqual(on(1.4, 180));
    const legacy = JSON.parse(text);
    delete legacy.stems[0].width;
    expect(parseStemSession(JSON.stringify(legacy)).stems[0].width).toEqual(DEFAULT_WIDTH);
  });
  test('an out-of-range width in a file is refused with a clear message', () => {
    const bad = JSON.parse(serializeStemSession([entry(DEFAULT_WIDTH)], bypassChain()));
    bad.stems[0].width = { enabled: true, width: 9, crossoverHz: 150 };
    expect(() => parseStemSession(JSON.stringify(bad))).toThrow(/stem width settings are invalid: Width must be between 0 and 2/);
  });
});
