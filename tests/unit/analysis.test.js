import { describe, expect, test } from 'vitest';
import { analyze } from '../../src/dsp/analysis.js';
import { kWeighting, measureLoudness } from '../../src/dsp/loudness.js';
import { truePeak } from '../../src/dsp/true-peak.js';
import { concat, fromDbfs, noise, sine, toneSequence } from '../fixtures/signals.js';

const stereo = signal => [signal, signal];
const dbfs = value => 20 * Math.log10(value);
const peakOf = signal => signal.reduce((max, value) => Math.max(max, Math.abs(value)), 0);

describe('LAS-26 loudness (ITU-R BS.1770-4, EBU R128)', () => {
  test('K-weighting at 48 kHz equals the coefficients printed in BS.1770-4', () => {
    const { shelf, highPass } = kWeighting(48000);
    const printed = {
      shelf: { b0: 1.53512485958697, b1: -2.69169618940638, b2: 1.19839281085285, a1: -1.69065929318241, a2: 0.73248077421585 },
      highPass: { b0: 1, b1: -2, b2: 1, a1: -1.99004745483398, a2: 0.99007225036621 },
    };
    for (const key of Object.keys(printed.shelf)) expect(shelf[key]).toBeCloseTo(printed.shelf[key], 8);
    for (const key of Object.keys(printed.highPass)) expect(highPass[key]).toBeCloseTo(printed.highPass[key], 8);
  });

  // EBU Tech 3341 minimum requirements, tests 1–4 (expected values from the specification, ±0.1 LU).
  test.each([
    ['test 1: −23 dBFS sine, 20 s', [[20, -23]], -23],
    ['test 2: −33 dBFS sine, 20 s', [[20, -33]], -33],
    ['test 3: relative gate (−36 / −23 / −36 dBFS)', [[10, -36], [60, -23], [10, -36]], -23],
    ['test 4: absolute gate (−72 / −36 / −23 / −36 / −72 dBFS)', [[10, -72], [10, -36], [60, -23], [10, -36], [10, -72]], -23],
  ])('EBU Tech 3341 %s → %s LUFS ±0.1', (_name, steps, expected) => {
    const result = measureLoudness(stereo(toneSequence(steps)), 48000);
    expect(result.state).toBe('ok');
    expect(Math.abs(result.integratedLufs - expected)).toBeLessThanOrEqual(0.1);
  });

  test.each([44100, 96000])('the same −23 dBFS sine reads −23 LUFS ±0.1 at %i Hz', rate => {
    expect(Math.abs(measureLoudness(stereo(sine({ dbfs: -23, seconds: 20, rate })), rate).integratedLufs + 23)).toBeLessThanOrEqual(0.1);
  });

  // EBU Tech 3342 loudness range tests 1–4 (±1 LU).
  test.each([
    [[[20, -20], [20, -30]], 10],
    [[[20, -20], [20, -15]], 5],
    [[[20, -40], [20, -20]], 20],
    [[[20, -50], [20, -35], [20, -20], [20, -35], [20, -50]], 15],
  ])('EBU Tech 3342 sequence %j → LRA %s LU ±1', (steps, expected) => {
    expect(Math.abs(measureLoudness(stereo(toneSequence(steps)), 48000).rangeLu - expected)).toBeLessThanOrEqual(1);
  });

  test('silence and very short audio are labelled, not given numbers', () => {
    expect(measureLoudness(stereo(new Float64Array(48000 * 2)), 48000)).toMatchObject({ state: 'silent', integratedLufs: null, rangeLu: null });
    expect(measureLoudness(stereo(sine({ seconds: 0.3 })), 48000)).toMatchObject({ state: 'too-short', integratedLufs: null });
  });
});

describe('LAS-26 peaks', () => {
  test('true peak finds the intersample peak a sample peak misses', () => {
    // A quarter-sample-rate sine shifted by 45°: every sample is at 0.707 of the waveform's peak.
    const signal = sine({ frequency: 12000, dbfs: -6.0206, seconds: 1, phase: Math.PI / 4, fade: 0.05 });
    expect(dbfs(peakOf(signal))).toBeCloseTo(-9.03, 1);
    expect(Math.abs(dbfs(truePeak(signal)) + 6.02)).toBeLessThanOrEqual(0.05);
  });

  // The 4× method looks at quarter-sample points, so a crest between two of them reads low by up to
  // 20·log10(cos(π·f / (4·fs))) — 0.17 dB at 12 kHz, 0.47 dB at 20 kHz (48 kHz audio), a limit the
  // BS.1770-4 method accepts. The interpolation itself must give the ideal quarter-sample values.
  test.each([997, 6000, 12000, 15000, 18000, 20000])('a %i Hz sine reads its quarter-sample peak within 0.05 dB at any phase', frequency => {
    const rate = 48000;
    for (const phase of [0, Math.PI / 8, Math.PI / 4, Math.PI / 3, 1]) {
      const signal = sine({ frequency, dbfs: -6.0206, seconds: 0.25, phase, fade: 0.05, rate });
      let ideal = 0; // the exact waveform at every quarter-sample point outside the fades
      for (let m = 4 * 0.05 * rate; m < 4 * 0.2 * rate; m++) ideal = Math.max(ideal, Math.abs(Math.sin((2 * Math.PI * frequency * m) / (4 * rate) + phase)));
      const measured = dbfs(truePeak(signal)) + 6.0206;
      expect(Math.abs(measured - dbfs(ideal))).toBeLessThanOrEqual(0.05);
      expect(measured).toBeGreaterThanOrEqual(dbfs(Math.cos((Math.PI * frequency) / (4 * rate))) - 0.05);
    }
  });

  test('audio is treated as starting and ending in silence, as on playback', () => {
    // Stopping abruptly at full level really overshoots on a converter; the meter shows it.
    const cut = sine({ frequency: 997, dbfs: -6.0206, seconds: 0.25 }); // ends near a crest
    expect(dbfs(truePeak(cut))).toBeGreaterThan(dbfs(peakOf(cut)) + 0.5);
  });

  test('sample peak of a single impulse is exact and labelled as a sample peak', () => {
    const impulse = new Float64Array(48000);
    impulse[1000] = 0.5;
    const report = analyze([impulse], 48000);
    expect(report.peaks.samplePeakDbfs).toBeCloseTo(-6.0206, 4);
    expect(report.peaks.truePeakDbtp).toBeGreaterThanOrEqual(report.peaks.samplePeakDbfs);
    expect(report.peaks.oversampling).toBe(4);
  });
});

describe('LAS-26 report', () => {
  test('levels, crest factor and PLR of the EBU −23 dBFS stereo sine', () => {
    const report = analyze(stereo(sine({ dbfs: -23, seconds: 20 })), 48000);
    expect(report.loudness.integratedLufs).toBeCloseTo(-23, 1);
    expect(report.levels.crestFactorDb).toBeCloseTo(3.01, 1);
    expect(Math.abs(report.levels.plrDb)).toBeLessThanOrEqual(0.15);
    expect(report.clipping).toEqual({ clippedSamples: 0, clippedRuns: 0 });
    expect(report.stereo).toMatchObject({ correlation: 1, sideToMidDb: null, channelsIdentical: true, balanceDb: 0 });
    expect(Math.abs(report.stereo.monoLoudnessChangeDb)).toBeLessThanOrEqual(0.01);
    expect(report.spectrum.bands.find(band => band.centreHz === 1000).share).toBeGreaterThan(0.99);
  });

  test('stereo indicators: inverted, uncorrelated and unbalanced channels', () => {
    const left = sine({ dbfs: -20, seconds: 5 });
    const inverted = analyze([left, left.map(v => -v)], 48000);
    expect(inverted.stereo.correlation).toBeCloseTo(-1, 6);
    expect(inverted.stereo.monoLoudnessChangeDb).toBeNull(); // the mono sum cancels to silence
    const uncorrelated = analyze([noise({ seconds: 5, seed: 1 }), noise({ seconds: 5, seed: 2 })], 48000);
    expect(Math.abs(uncorrelated.stereo.correlation)).toBeLessThan(0.05);
    expect(uncorrelated.stereo.sideToMidDb).toBeCloseTo(0, 0);
    expect(uncorrelated.stereo.channelsIdentical).toBe(false);
    const unbalanced = analyze([sine({ dbfs: -26, seconds: 5 }), sine({ dbfs: -20, seconds: 5 })], 48000);
    expect(unbalanced.stereo.balanceDb).toBeCloseTo(-6, 1);
  });

  test('clipping is counted only for clipped audio', () => {
    const clipped = sine({ dbfs: 3.5, seconds: 1 }).map(v => Math.max(-1, Math.min(1, v)));
    expect(analyze([clipped], 48000).clipping.clippedRuns).toBeGreaterThan(100);
    expect(analyze([sine({ dbfs: -1, seconds: 1 })], 48000).clipping).toEqual({ clippedSamples: 0, clippedRuns: 0 });
  });

  test('mono audio has no stereo indicators; silence has no peak levels', () => {
    expect(analyze([sine({ seconds: 2 })], 48000).stereo).toBeNull();
    const silent = analyze(stereo(new Float64Array(96000)), 48000);
    expect(silent.loudness.state).toBe('silent');
    expect(silent.peaks).toMatchObject({ samplePeakDbfs: null, truePeakDbtp: null });
    expect(silent.levels.rmsDbfs).toBeNull();
  });

  test('a segment is analysed on its own and reported with its bounds', () => {
    const report = analyze(stereo(toneSequence([[10, -36], [20, -23], [10, -36]])), 48000, { start: 12, end: 28 });
    expect(report.input.segment).toEqual({ start: 12, end: 28 });
    expect(report.loudness.integratedLufs).toBeCloseTo(-23, 1);
    expect(report.levels.rmsDbfs).toBeCloseTo(-26.01, 1);
  });

  test('analysis is reproducible and leaves the input untouched', () => {
    const left = concat(sine({ dbfs: -18, seconds: 3 }), noise({ seconds: 2, seed: 7 }));
    const right = sine({ frequency: 440, dbfs: -20, seconds: 5 });
    const copies = [Float64Array.from(left), Float64Array.from(right)];
    const first = analyze([left, right], 44100);
    expect(analyze([left, right], 44100)).toEqual(first);
    expect(left).toEqual(copies[0]);
    expect(right).toEqual(copies[1]);
    expect(first.version).toBe('mps-analysis-1');
  });

  test('more than two channels are refused clearly', () => {
    expect(() => analyze([new Float64Array(10), new Float64Array(10), new Float64Array(10)], 48000)).toThrow('mono and stereo');
    expect(fromDbfs(-6.0206)).toBeCloseTo(0.5, 4);
  });
});

describe('LAS-26 FFT', () => {
  test('matches a direct DFT', async () => {
    const { fft } = await import('../../src/dsp/fft.js');
    const input = noise({ seconds: 64 / 48000, seed: 9 });
    const re = Float64Array.from(input), im = new Float64Array(64);
    fft(re, im);
    for (let k = 0; k < 64; k++) {
      let r = 0, i = 0;
      for (let n = 0; n < 64; n++) { r += input[n] * Math.cos((-2 * Math.PI * k * n) / 64); i += input[n] * Math.sin((-2 * Math.PI * k * n) / 64); }
      expect(re[k]).toBeCloseTo(r, 9);
      expect(im[k]).toBeCloseTo(i, 9);
    }
  });
});
