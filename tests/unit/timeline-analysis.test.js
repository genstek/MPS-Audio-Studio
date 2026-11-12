import { describe, expect, test } from 'vitest';
import { analyzeTimeline, chooseHop, TIMELINE_VERSION } from '../../src/dsp/timeline-analysis.js';
import { concat, noise, sine, toneSequence } from '../fixtures/signals.js';

const both = s => [s, s];
const at = (list, time) => list.find(p => Math.abs(p.time - time) < 1e-6);

describe('LAS-173 timeline analysis: loudness windows', () => {
  test('step: a −36 → −23 dBFS 1 kHz step shows in the 400 ms, 3 s and 5 s series at the right time', () => {
    const t = analyzeTimeline(both(toneSequence([[10, -36], [10, -23]])), 48000, { hopSeconds: 1 });
    expect(t.version).toBe(TIMELINE_VERSION);
    expect(at(t.points, 9).momentaryLufs).toBeCloseTo(-36 - 0.691 + 0.691 + 3.01 * 0 - 0, 0); // stereo −36 dBFS tone ≈ −36 LUFS
    expect(at(t.points, 9).momentaryLufs).toBeCloseTo(-36, 0);
    expect(at(t.points, 20).momentaryLufs).toBeCloseTo(-23, 0);
    expect(at(t.points, 20).shortTermLufs).toBeCloseTo(-23, 0);
    expect(at(t.points, 12).shortTermLufs).toBeLessThan(-23.5); // 3 s window still includes quiet part
    // Trend compares adjacent non-overlapping 5 s windows: 5–10 quiet vs 10–15 loud.
    expect(at(t.points, 15).trendDeltaLu).toBeCloseTo(13, 0);
    // At 20 s both compared windows (10–15 and 15–20) are loud, so the delta returns to zero.
    expect(at(t.points, 20).trendDeltaLu).toBeCloseTo(0, 0);
    expect(t.markers.some(m => m.kind === 'loudness-step')).toBe(true);
  });

  test('sweep: the band that carries a rising tone moves with time', () => {
    const rate = 48000, seconds = 12;
    const sweep = new Float64Array(seconds * rate);
    let phase = 0;
    for (let n = 0; n < sweep.length; n++) { // 100 Hz → 7 kHz exponential
      const f = 100 * 70 ** (n / sweep.length);
      phase += (2 * Math.PI * f) / rate;
      sweep[n] = 0.3 * Math.sin(phase);
    }
    const t = analyzeTimeline(both(sweep), rate, { hopSeconds: 1 });
    const early = t.spectral[0].bands, late = t.spectral[t.spectral.length - 1].bands;
    expect(early.low.relativeDb).toBeGreaterThan(-1);
    expect(late.air.relativeDb).toBeGreaterThan(early.air.relativeDb + 20);
  });

  test.each([44100, 48000, 96000])('mono and stereo at %i Hz measure the same level (windows are exact time ranges)', rate => {
    const tone = sine({ seconds: 8, dbfs: -20, rate });
    const mono = analyzeTimeline([tone], rate);
    const stereo = analyzeTimeline(both(tone), rate);
    expect(mono.input.sampleRate).toBe(rate);
    expect(mono.points).toHaveLength(8);
    expect(mono.points[4].momentaryLufs).toBeCloseTo(stereo.points[4].momentaryLufs - 3.01, 1);
    expect(mono.spectral[0].start).toBe(0);
    expect(mono.spectral[0].end).toBe(2);
    expect(mono.spectral[0].stereo).toBeNull();
    expect(stereo.spectral[0].totalDbfs).toBeCloseTo(-23.01, 1); // −20 dBFS peak sine → −23.01 dBFS RMS
  });

  test('is deterministic and does not modify the samples', () => {
    const left = noise({ seconds: 6, seed: 3 }), right = noise({ seconds: 6, seed: 4 });
    const copy = Float64Array.from(left);
    const a = analyzeTimeline([left, right], 48000), b = analyzeTimeline([left, right], 48000);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(left).toEqual(copy);
  });
});

describe('LAS-173 timeline analysis: bounds and safety', () => {
  test('silence gives null loudness and no markers', () => {
    const t = analyzeTimeline(both(new Float64Array(48000 * 6)), 48000);
    expect(t.points.every(p => p.momentaryLufs === null && p.shortTermLufs === null)).toBe(true);
    expect(t.markers).toEqual([]);
  });

  test.each([0, 100, 4000, 48000, 96000])('a %i-sample file does not throw and never invents windows', frames => {
    const t = analyzeTimeline(both(noise({ seconds: frames / 48000 })), 48000);
    expect(t.points.length).toBeLessThanOrEqual(Math.floor(frames / 48000));
    if (frames < 96000) expect(t.spectral).toEqual([]);
  });

  test('hop is bounded: long files are capped at maxWindows, tiny hops are raised to 100 ms', () => {
    expect(chooseHop(3600, { hopSeconds: 0.5, maxWindows: 1200 })).toBeCloseTo(3.0, 6);
    expect(chooseHop(60, { hopSeconds: 0.01 })).toBeCloseTo(0.1, 6);
    expect(chooseHop(10, { hopSeconds: Number.NaN })).toBeCloseTo(1, 6);
    const t = analyzeTimeline(both(noise({ seconds: 30 })), 48000, { hopSeconds: 0.1, maxWindows: 10 });
    expect(t.points.length).toBeLessThanOrEqual(10);
    expect(t.spectral.length).toBeLessThanOrEqual(10);
  });

  test('hop keeps the maxWindows bound beyond one hour (no 3 s cap)', () => {
    expect(chooseHop(7200, { hopSeconds: 1, maxWindows: 1200 })).toBeCloseTo(6, 6); // 2 h → 1,200 points
    expect(chooseHop(4 * 3600, { hopSeconds: 1, maxWindows: 1200 })).toBeCloseTo(12, 6);
    // Scaled down: 30 s with at most 5 points needs a 6 s hop, more than the old 3 s cap allowed.
    const t = analyzeTimeline(both(noise({ seconds: 30 })), 48000, { hopSeconds: 1, maxWindows: 5 });
    expect(t.hopSeconds).toBeCloseTo(6, 6);
    expect(t.points.length).toBeLessThanOrEqual(5);
    expect(t.spectral.length).toBeLessThanOrEqual(5);
  });

  test('cancellation stops the work with an AbortError and reports progress', () => {
    const seen = [];
    expect(() => analyzeTimeline(both(noise({ seconds: 20 })), 48000, { onProgress: f => seen.push(f), shouldCancel: () => seen.length >= 3 })).toThrow('cancelled');
    expect(seen.length).toBeGreaterThanOrEqual(3);
    const done = [];
    analyzeTimeline(both(noise({ seconds: 8 })), 48000, { onProgress: f => done.push(f) });
    expect(done[done.length - 1]).toBe(1);
  });

  test('more than two channels are refused', () => {
    expect(() => analyzeTimeline([new Float64Array(10), new Float64Array(10), new Float64Array(10)], 48000)).toThrow();
  });
});

describe('LAS-173 timeline analysis: stereo and markers', () => {
  const rate = 48000;

  test('pan trajectory: balance follows a hard-left → hard-right sweep; marked as observation, not centred', () => {
    const source = noise({ seconds: 12, seed: 7 });
    const left = new Float64Array(source.length), right = new Float64Array(source.length);
    for (let n = 0; n < source.length; n++) {
      const pan = n / source.length; // 0 = left … 1 = right (constant-power)
      left[n] = source[n] * Math.cos((pan * Math.PI) / 2);
      right[n] = source[n] * Math.sin((pan * Math.PI) / 2);
    }
    const t = analyzeTimeline([left, right], rate);
    const balance = t.spectral.map(w => w.stereo.balanceDb);
    expect(balance[0]).toBeGreaterThan(5);
    expect(balance[balance.length - 1]).toBeLessThan(-5);
    for (let i = 1; i < balance.length; i++) expect(balance[i]).toBeLessThan(balance[i - 1]); // monotonic
    const marks = t.markers.filter(m => m.kind === 'balance-offset');
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) {
      expect(m.hypothesis).toMatch(/deliberate pan/);
      expect(m.hypothesis).toMatch(/not auto-centred/);
    }
    expect(t.markers.some(m => m.kind === 'phase-risk')).toBe(false); // correlation stays positive
  });

  test('audio in one channel only is named one-sided and marked, not dropped as a gap', () => {
    const audio = noise({ seconds: 6, seed: 3 });
    const silent = new Float64Array(audio.length);
    for (const [channels, side, other] of [[[audio, silent], 'left', 'right'], [[silent, audio], 'right', 'left']]) {
      const t = analyzeTimeline(channels, rate);
      expect(t.spectral.length).toBeGreaterThan(0);
      for (const w of t.spectral) expect(w.stereo).toMatchObject({ balanceDb: null, oneSided: side });
      const marks = t.markers.filter(m => m.kind === 'balance-offset');
      expect(marks).toHaveLength(1); // neighbouring one-sided windows merge into one marker
      expect(marks[0].title).toBe(`Only the ${side} channel has audio`);
      expect(marks[0].observation).toMatch(new RegExp(`The ${other} channel is digital silence`));
      expect(marks[0].evidence).toEqual({ balanceDb: null, oneSided: side });
      expect(marks[0].hypothesis).toMatch(/not auto-centred/);
    }
    // Ping-pong with spaced (non-overlapping) windows: left only, then right only, in adjacent windows.
    // The two sides stay separate markers, each describing only its own span.
    const pingPong = [new Float64Array(8 * rate), new Float64Array(8 * rate)];
    const half = 4 * rate;
    for (let n = 0; n < half; n++) { pingPong[0][n] = audio[n % audio.length]; pingPong[1][half + n] = audio[n % audio.length]; }
    const pp = analyzeTimeline(pingPong, rate, { hopSeconds: 2 });
    const sides = pp.markers.filter(m => m.kind === 'balance-offset');
    expect(sides.map(m => [m.side, m.start, m.end])).toEqual([['left', 0, 4], ['right', 4, 8]]);
    expect(sides[0].title).toBe('Only the left channel has audio');
    expect(sides[1].title).toBe('Only the right channel has audio');
    // Both channels silent: no balance, not one-sided, no marker.
    const quiet = analyzeTimeline([silent, silent], rate);
    for (const w of quiet.spectral) expect(w.stereo).toMatchObject({ balanceDb: null, oneSided: null });
    expect(quiet.markers.filter(m => m.kind === 'balance-offset')).toHaveLength(0);
  });

  test('sectional spectral gap without phase problem: marked as a shape change, correlation stays +1', () => {
    // 0–8 s broadband noise, 8–16 s the same noise without 4–8 kHz (a 3-pole-ish lowpass via smoothing).
    const full = noise({ seconds: 8, seed: 11 });
    const dull = new Float64Array(full.length);
    let a = 0, b = 0, c = 0; // one-pole ×3 at ~1 kHz
    const k = 1 - Math.exp((-2 * Math.PI * 1000) / rate);
    for (let n = 0; n < full.length; n++) { a += k * (full[n] - a); b += k * (a - b); c += k * (b - c); dull[n] = c * 6; }
    const t = analyzeTimeline(both(concat(full, dull)), rate);
    const shifts = t.markers.filter(m => m.kind === 'spectral-shift');
    expect(shifts.length).toBeGreaterThan(0);
    expect(shifts.some(m => m.band === 'air' && m.start >= 8 - 2 && m.start <= 10.5)).toBe(true);
    expect(shifts[0].hypothesis).toMatch(/not evidence of a defect/);
    expect(shifts[0].hypothesis).toMatch(/not a reason for a global EQ/);
    expect(t.spectral.every(w => w.stereo.correlation > 0.999)).toBe(true);
    expect(t.markers.some(m => m.kind === 'phase-risk')).toBe(false);
  });

  test('true phase cancellation: L = −R is flagged as a phase risk, not as a spectral shift', () => {
    const n = noise({ seconds: 8, seed: 5 });
    const t = analyzeTimeline([n, n.map(v => -v)], rate);
    const risk = t.markers.filter(m => m.kind === 'phase-risk');
    expect(risk).toHaveLength(1);
    expect(risk[0].evidence.monoCancels).toBe(true);
    expect(t.spectral[0].stereo.correlation).toBeCloseTo(-1, 3);
    expect(t.markers.some(m => m.kind === 'spectral-shift')).toBe(false);
  });

  test('partial cancellation: a section with one inverted channel drops mono fold level in that range only', () => {
    const base = noise({ seconds: 10, seed: 9 });
    const right = Float64Array.from(base, (v, i) => (i >= 5 * rate ? -v : v));
    const t = analyzeTimeline([base, right], rate);
    expect(t.spectral[0].stereo.monoFoldDb).toBeCloseTo(0, 1);
    const risk = t.markers.find(m => m.kind === 'phase-risk');
    expect(risk.start).toBeGreaterThanOrEqual(4);
    expect(risk.end).toBeLessThanOrEqual(10);
  });

  test('marker times lie inside the file and carry ids', () => {
    const t = analyzeTimeline(both(toneSequence([[6, -40], [6, -20]])), rate);
    for (const m of t.markers) {
      expect(m.id).toMatch(/^m\d+$/);
      expect(m.start).toBeGreaterThanOrEqual(0);
      expect(m.end).toBeLessThanOrEqual(t.input.duration + 1e-6);
    }
  });
});
