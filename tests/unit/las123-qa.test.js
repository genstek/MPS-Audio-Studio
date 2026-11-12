import { describe, expect, test } from 'vitest';
import { analyze } from '../../src/dsp/analysis.js';
import { truePeak } from '../../src/dsp/true-peak.js';
import { measureLoudness } from '../../src/dsp/loudness.js';
import { encodeWav } from '../../src/dsp/wav-encode.js';
import { decodeWav, WavDecodeError } from '../../src/dsp/wav-decode.js';
import { resample } from '../../src/dsp/resample.js';
import { defaultChain, editBand, validateChain } from '../../src/dsp/chain-params.js';
import { renderChain } from '../../src/dsp/chain.js';
import { EQ_PROPOSAL_SCHEMA, createEqProposal } from '../../src/ai/eq-proposal.js';
import { OWNERS, createPreviewCoordinator } from '../../src/ai/preview-coordinator.js';
import { createProposalSession } from '../../src/ai/proposal-session.js';
import { concat, sine } from '../fixtures/signals.js';

// LAS-123 QA gates for Intelligent Mastering. Synthetic, code-generated fixtures only: no audio file
// is stored and no private Suno/user audio is used. These tests prove measurement, container and
// state-machine behaviour that EXISTS in this repository today. Features owned by other tickets
// (LAS-173 timeline, LAS-122 advice, LAS-120 Preview/Apply UI, LAS-128 stereo stage, LAS-172 report)
// are listed as test.skip / test.todo with the ticket reference: a skipped test is NOT_RUN, not PASS.
// Nothing here proves listening quality; manual listening stays NOT_RUN (docs/audio-engineering/LAS-123_QA_PROTOCOL.md).
const RATES = [44100, 48000, 96000];
const f32 = signal => Float32Array.from(signal);
const db = value => 20 * Math.log10(value);

// Independent RIFF/WAVE reader: shares no code with src/dsp/wav-decode.js, so an encoder/decoder
// that agree on the same wrong header cannot pass.
function readbackWav(buffer) {
  const view = new DataView(buffer);
  const ascii = (at, n) => String.fromCharCode(...new Uint8Array(buffer, at, n));
  expect(ascii(0, 4)).toBe('RIFF');
  expect(ascii(8, 4)).toBe('WAVE');
  expect(view.getUint32(4, true)).toBe(buffer.byteLength - 8);
  expect(ascii(12, 4)).toBe('fmt ');
  const header = {
    format: view.getUint16(20, true), channels: view.getUint16(22, true), sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true), blockAlign: view.getUint16(32, true), bits: view.getUint16(34, true),
  };
  expect(ascii(36, 4)).toBe('data');
  const dataBytes = view.getUint32(40, true);
  const width = header.bits / 8;
  const frames = dataBytes / header.blockAlign;
  const samples = Array.from({ length: header.channels }, () => new Float64Array(frames));
  for (let n = 0; n < frames; n++) {
    for (let c = 0; c < header.channels; c++) {
      const at = 44 + n * header.blockAlign + c * width;
      samples[c][n] = header.bits === 16
        ? view.getInt16(at, true) / 32768
        : (((view.getUint8(at + 2) << 24) >> 8) | (view.getUint8(at + 1) << 8) | view.getUint8(at)) / 8388608;
    }
  }
  return { ...header, dataBytes, frames, samples };
}

describe('LAS-123 DSP math: levels, loudness and true peak at 44.1 / 48 / 96 kHz (IA-01, IA-21)', () => {
  test.each(RATES)('%i Hz: a 1 kHz sine at −20 dBFS measures −20 dBFS peak, −23.01 dBFS RMS and about −20 LUFS', rate => {
    const tone = f32(sine({ frequency: 1000, dbfs: -20, seconds: 5, rate }));
    const result = analyze([tone, Float32Array.from(tone)], rate);
    expect(result.input).toMatchObject({ sampleRate: rate, channels: 2, frames: tone.length });
    expect(result.peaks.samplePeakDbfs).toBeCloseTo(-20, 1);
    expect(result.levels.rmsDbfs).toBeCloseTo(-23.01, 1);
    // BS.1770: channel powers add, so identical L/R at −20 dBFS peak (−23.01 dBFS RMS each) read ≈ −20 LUFS.
    expect(result.loudness.integratedLufs).toBeGreaterThan(-20.5);
    expect(result.loudness.integratedLufs).toBeLessThan(-19.5);
  });

  test.each(RATES)('%i Hz: an inter-sample peak is found above the sample peak', rate => {
    // fs/4 sine at 45° phase: every sample is ±0.707·A but the true crest is A.
    const length = rate;
    const signal = Float64Array.from({ length }, (_, n) => 0.9 * Math.sin((Math.PI / 2) * n + Math.PI / 4));
    const samplePeak = signal.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
    expect(samplePeak).toBeCloseTo(0.9 * Math.SQRT1_2, 6);
    expect(db(truePeak(signal))).toBeGreaterThan(db(samplePeak) + 2.5);
    expect(db(truePeak(signal))).toBeLessThan(db(0.9) + 0.2);
    expect(db(truePeak(signal))).toBeGreaterThan(db(0.9) - 0.3);
  });

  test.each(RATES)('%i Hz: loudness is identical after a bit-exact gain of +6.0206 dB within 0.01 LU', rate => {
    const tone = f32(sine({ frequency: 440, dbfs: -30, seconds: 4, rate }));
    const loud = tone.map(v => v * 2);
    const a = measureLoudness([tone], rate).integratedLufs;
    const b = measureLoudness([loud], rate).integratedLufs;
    expect(b - a).toBeCloseTo(6.0206, 2);
  });
});

describe('LAS-123 section time alignment (IA-02): a level step is located within one analysis hop', () => {
  // Segment analysis is the only per-time measurement that exists today. The automatic timeline is
  // LAS-173; this proves the primitive it must be built on is sample-accurate in seconds at every rate.
  test.each(RATES)('%i Hz: step at 3.000 s is found between the 2.5–3.5 s windows and not in 0–2.5 s / 3.5–6 s', rate => {
    const quiet = f32(sine({ frequency: 1000, dbfs: -30, seconds: 3, rate }));
    const loud = f32(sine({ frequency: 1000, dbfs: -10, seconds: 3, rate }));
    const signal = Float32Array.from(concat(quiet, loud));
    const peak = (start, end) => analyze([signal], rate, { start, end }).peaks.samplePeakDbfs;
    expect(peak(0, 2.9)).toBeCloseTo(-30, 1);
    expect(peak(3.1, 6)).toBeCloseTo(-10, 1);
    expect(peak(2.5, 3.5)).toBeCloseTo(-10, 1); // window straddling the step contains the loud half
    // Boundary search at 100 ms resolution recovers the step to within one hop.
    const hop = 0.1;
    let found = null;
    for (let t = 0; t < 5.9 && found === null; t += hop) if (peak(t, t + hop) > -20) found = t;
    expect(Math.abs(found - 3)).toBeLessThanOrEqual(hop + 1e-9);
  });

  test('repeated analysis of the same segment is bit-for-bit reproducible', () => {
    const signal = f32(sine({ frequency: 3000, dbfs: -12, seconds: 3, rate: 48000 }));
    expect(JSON.stringify(analyze([signal], 48000, { start: 0.5, end: 2 }))).toBe(JSON.stringify(analyze([signal], 48000, { start: 0.5, end: 2 })));
  });
});

describe('LAS-123 spectral measurement vs artistic arrangement (IA-03, IA-19)', () => {
  const rate = 48000;
  const bandLevel = (result, centre) => result.spectrum.bands.find(b => b.centreHz === centre).levelDb;
  // Section A: 500 Hz + 3 kHz. Section B ("instrumental break"): 500 Hz only; the 1.5–6 kHz energy drops.
  const body = (seconds, withHighMid) => {
    const low = sine({ frequency: 500, dbfs: -18, seconds, rate });
    const high = sine({ frequency: 3000, dbfs: withHighMid ? -18 : -120, seconds, rate });
    return f32(low.map((v, n) => v + high[n]));
  };
  const song = Float32Array.from(concat(body(4, true), body(4, false)));

  test('measures the high-mid drop at the right section as a real, large level difference', () => {
    const a = analyze([song], rate, { start: 0, end: 4 });
    const b = analyze([song], rate, { start: 4, end: 8 });
    expect(bandLevel(a, 4000) - bandLevel(b, 4000)).toBeGreaterThan(30);
  });

  test('the measurement layer reports numbers only: it makes no EQ recommendation or boost', () => {
    const result = analyze([song], rate, { start: 4, end: 8 });
    expect(JSON.stringify(Object.keys(result))).not.toMatch(/advice|recommend|boost|eq/i);
  });

  test.skip('NOT_RUN (LAS-173 timeline, LAS-122 advice): gap during an instrumental break is labelled "possible arrangement change", never an automatic EQ boost', () => {});
  test.skip('NOT_RUN (LAS-122): a gap present in a stem-aware comparison while the vocal stem is active is raised as a tonal risk', () => {});
  test.skip('NOT_RUN (LAS-173): reference with mismatched start/duration is aligned before comparing, so a shifted window yields no false EQ hole (IA-19)', () => {});
});

describe('LAS-123 pan motion vs phase fault, mono and stems (IA-05, IA-06, IA-07, IA-10)', () => {
  const rate = 48000;
  const tone = f32(sine({ frequency: 440, dbfs: -12, seconds: 4, rate }));
  const pan = p => { // constant-power pan, p in [-1, 1]
    const angle = ((p + 1) * Math.PI) / 4;
    return [tone.map(v => v * Math.cos(angle)), tone.map(v => v * Math.sin(angle))];
  };

  test('centre and off-centre pans are in-phase: correlation +1; mono fold-down loses at most the 3 dB of a constant-power pan', () => {
    for (const p of [0, 0.5, -0.5]) {
      const result = analyze(pan(p), rate);
      expect(result.stereo.correlation).toBeCloseTo(1, 4);
      expect(result.stereo.monoLoudnessChangeDb).toBeGreaterThan(-3.1);
    }
    // Hard pan: one silent channel has no correlation to report (null); that is not a fault.
    expect(analyze(pan(-1), rate).stereo.correlation).toBeNull();
  });

  test('automated L→R→L pan motion never gives negative correlation or a phase-fault level of mono loss', () => {
    const left = new Float32Array(tone.length), right = new Float32Array(tone.length);
    for (let n = 0; n < tone.length; n++) {
      const angle = (((Math.sin((2 * Math.PI * n) / (rate * 2)) + 1) * Math.PI) / 4);
      left[n] = tone[n] * Math.cos(angle);
      right[n] = tone[n] * Math.sin(angle);
    }
    const result = analyze([left, right], rate);
    // Moving gains lower whole-file correlation (measured ≈ 0.47) but it stays positive: not a phase fault.
    expect(result.stereo.correlation).toBeGreaterThan(0.2);
    expect(result.stereo.monoLoudnessChangeDb).toBeGreaterThan(-3.1);
  });

  test('a polarity-inverted channel (L = −R) is a phase fault: correlation −1 and heavy mono cancellation', () => {
    const result = analyze([tone, tone.map(v => -v)], rate);
    expect(result.stereo.correlation).toBeCloseTo(-1, 4);
    // The mono fold-down is digital silence, which the meter reports as null rather than a finite loudness.
    expect(result.stereo.monoLoudnessChangeDb).toBeNull();
    expect(result.stereo.sideToMidDb).toBeNull();
  });

  test('IA-06: a short L = −R burst inside a long in-phase track is visible in the burst window but averaged out for the whole file', () => {
    const left = new Float32Array(tone.length).map((_, n) => tone[n]);
    const right = Float32Array.from(left);
    for (let n = 2 * rate; n < 3 * rate; n++) right[n] = -left[n];
    const whole = analyze([left, right], rate).stereo.correlation;
    const burst = analyze([left, right], rate, { start: 2.1, end: 2.9 }).stereo.correlation;
    expect(burst).toBeLessThan(-0.99);
    expect(whole).toBeGreaterThan(0.4); // whole-file correlation stays positive: only a local window shows the fault
  });

  test('IA-07: a fully centred mono signal reports identical channels and no side energy (no invented width)', () => {
    const result = analyze([tone, Float32Array.from(tone)], rate);
    expect(result.stereo.channelsIdentical).toBe(true);
    expect(result.stereo.sideToMidDb).toBeNull();
  });

  test('IA-10 primitive: a +47 ms stem offset is recovered by cross-correlation to within one sample', () => {
    const base = f32(sine({ frequency: 220, dbfs: -12, seconds: 1, rate }).map((v, n) => v * Math.sin((n / rate) * 7) ** 2));
    const lag = Math.round(0.047 * rate);
    const shifted = new Float32Array(base.length);
    shifted.set(base.subarray(0, base.length - lag), lag);
    let best = 0, bestLag = -1;
    for (let k = 0; k < 6000; k++) {
      let sum = 0;
      for (let n = 0; n < 20000; n++) sum += base[n] * shifted[n + k];
      if (sum > best) { best = sum; bestLag = k; }
    }
    expect(bestLag).toBe(lag);
  });

  test.skip('NOT_RUN (LAS-128 stereo stage, LAS-173): stereo-stage advice leaves an intentional pan automation alone and flags only L = −R windows', () => {});
  test.skip('NOT_RUN (LAS-122): stem alignment proposal states uncertainty and needs approval before any shift (IA-10)', () => {});
});

describe('LAS-123 invalid, silent and short sources (IA-04)', () => {
  test.each(RATES)('%i Hz: digital silence gives null loudness, −∞ peaks as null and no NaN anywhere', rate => {
    const result = analyze([new Float32Array(rate * 2), new Float32Array(rate * 2)], rate);
    expect(result.loudness.state).toBe('silent');
    expect(result.loudness.integratedLufs).toBeNull();
    expect(result.peaks.truePeakDbtp).toBeNull();
    expect(JSON.stringify(result)).not.toMatch(/NaN|Infinity/);
    expect(JSON.stringify(result, (_, v) => (typeof v === 'number' && !Number.isFinite(v) ? 'BAD' : v))).not.toContain('BAD');
  });

  test('a source shorter than one loudness block says too-short rather than inventing a value', () => {
    const result = analyze([f32(sine({ frequency: 1000, dbfs: -20, seconds: 0.1, rate: 48000 }))], 48000); // < 8192 frames: also too short for a spectrum
    expect(result.loudness.state).toBe('too-short');
    expect(result.loudness.integratedLufs).toBeNull();
    expect(result.spectrum.bands).toEqual([]);
  });

  test('a zero-length selection does not divide by zero', () => {
    const result = analyze([new Float32Array(4800)], 48000, { start: 0.05, end: 0.05 });
    expect(result.input.frames).toBe(0);
    expect(JSON.stringify(result)).not.toMatch(/NaN/);
  });

  test('unsupported channel counts are refused with a message', () => {
    expect(() => analyze([], 48000)).toThrow(/mono and stereo/);
    expect(() => analyze([new Float32Array(10), new Float32Array(10), new Float32Array(10)], 48000)).toThrow(/mono and stereo/);
  });

  test.each([
    ['empty file', new ArrayBuffer(0), /too short/],
    ['text renamed .wav', new TextEncoder().encode('not audio at all, just text pretending to be a wave file!!').buffer, /not a WAV/],
    ['header only, no data', encodeWav([new Float32Array(0)], 48000).bytes.slice(0, 44), /no audio|too short/i],
  ])('invalid source "%s" is rejected as a WavDecodeError', (_, bytes, pattern) => {
    expect(() => decodeWav(bytes)).toThrow(WavDecodeError);
    expect(() => decodeWav(bytes)).toThrow(pattern);
  });

  test('a truncated data chunk is rejected instead of read past the end', () => {
    const { bytes } = encodeWav([f32(sine({ seconds: 0.5, rate: 48000 }))], 48000, { bitDepth: 16 });
    expect(() => decodeWav(bytes.slice(0, 200))).toThrow(WavDecodeError);
  });

  test('NaN / Infinity samples in a render are counted and the output stays finite', () => {
    const input = f32(sine({ frequency: 1000, dbfs: -20, seconds: 0.5, rate: 48000 }));
    input[1000] = NaN; input[2000] = Infinity;
    const out = renderChain(validateChain(defaultChain()), [input, Float32Array.from(input)], 48000);
    expect(out.meters.nonFiniteInputs).toBeGreaterThan(0);
    expect(out.channels.every(c => c.every(Number.isFinite))).toBe(true);
  });
});

describe('LAS-123 false positives: well-behaved material raises no technical warning', () => {
  test.each(RATES)('%i Hz: a −20 dBFS in-phase tone has no clipping and a true peak well below −1 dBTP', rate => {
    const tone = f32(sine({ frequency: 1000, dbfs: -20, seconds: 3, rate, fade: 0.02 }));
    const result = analyze([tone, Float32Array.from(tone)], rate);
    expect(result.peaks.truePeakDbtp).toBeLessThan(-1);
    expect(JSON.stringify(result.clipping)).not.toMatch(/true/);
  });
});

describe('LAS-123 metadata precision and export headers 16 / 24-bit (IA-01, IA-18)', () => {
  test.each(RATES.flatMap(rate => [16, 24].map(bits => [rate, bits])))('%i Hz / %i-bit: independent readback of header, byte rate, frame count and duration', (rate, bits) => {
    const seconds = 1.25;
    const left = f32(sine({ frequency: 997, dbfs: -6, seconds, rate, fade: 0.01 }));
    const right = f32(sine({ frequency: 1500, dbfs: -9, seconds, rate, fade: 0.01 }));
    const { bytes, clippedSamples } = encodeWav([left, right], rate, { bitDepth: bits });
    const wav = readbackWav(bytes);
    expect(clippedSamples).toBe(0);
    expect(wav).toMatchObject({ format: 1, channels: 2, sampleRate: rate, bits, blockAlign: 2 * (bits / 8), byteRate: rate * 2 * (bits / 8) });
    expect(wav.frames).toBe(Math.round(seconds * rate));
    expect(wav.dataBytes).toBe(wav.frames * wav.blockAlign);
    expect(wav.frames / wav.sampleRate).toBeCloseTo(seconds, 6);
    // Independent PCM readback matches the source: channel order kept, error within quantisation.
    const tolerance = bits === 24 ? 2 / 8388608 : 3 / 32768; // 16-bit includes ±1 LSB TPDF dither
    let worst = 0;
    for (let n = 0; n < wav.frames; n++) worst = Math.max(worst, Math.abs(wav.samples[0][n] - left[n]), Math.abs(wav.samples[1][n] - right[n]));
    expect(worst).toBeLessThanOrEqual(tolerance);
    // The app's own decoder and the independent reader agree on metadata.
    const decoded = decodeWav(bytes);
    expect(decoded).toMatchObject({ sampleRate: rate, bitsPerSample: bits, channels: 2, frames: wav.frames });
  });

  test('unsupported bit depths are refused (no silent 32-bit or 8-bit export)', () => {
    expect(() => encodeWav([new Float32Array(10)], 48000, { bitDepth: 32 })).toThrow(/24-bit and 16-bit/);
  });

  test('16-bit export is deterministic for the same input and seed', () => {
    const channel = f32(sine({ frequency: 440, dbfs: -12, seconds: 0.5, rate: 48000 }));
    const a = new Uint8Array(encodeWav([channel], 48000, { bitDepth: 16, seed: 7 }).bytes);
    const b = new Uint8Array(encodeWav([channel], 48000, { bitDepth: 16, seed: 7 }).bytes);
    expect(Buffer.compare(a, b)).toBe(0);
  });
});

describe('LAS-123 resample and clipping on export (IA-18, LAS-127)', () => {
  test('48 → 96 kHz export carries the real 96 kHz header, doubled frames, and same-duration audio', () => {
    const input = f32(sine({ frequency: 1000, dbfs: -6, seconds: 1, rate: 48000, fade: 0.01 }));
    const [out] = resample([input], 48000, 96000, { bitDepth: 24 });
    const wav = readbackWav(encodeWav([out], 96000, { bitDepth: 24 }).bytes);
    expect(wav.sampleRate).toBe(96000);
    expect(wav.frames).toBe(96000);
    expect(wav.frames / wav.sampleRate).toBeCloseTo(input.length / 48000, 9);
    expect(wav.byteRate).toBe(96000 * 3);
  });

  test('96 kHz from a 48 kHz source adds no content above the source Nyquist (no claim of added fidelity)', () => {
    const input = f32(sine({ frequency: 18000, dbfs: -6, seconds: 1, rate: 48000, fade: 0.01 }));
    const [out] = resample([input], 48000, 96000);
    const band = analyze([out], 96000).spectrum.bands;
    const top = band.find(b => b.centreHz === 16000);
    const above = band.filter(b => b.centreHz > 16000);
    expect(top.share).toBeGreaterThan(0.99);
    expect(above.length === 0 || above.every(b => b.share < 1e-4)).toBe(true);
  });

  test('samples past full scale are clipped and counted, never wrapped', () => {
    const hot = Float32Array.from([0, 1.5, -1.5, 0.25]);
    for (const bits of [16, 24]) {
      const { bytes, clippedSamples } = encodeWav([hot], 48000, { bitDepth: bits, seed: 1 });
      expect(clippedSamples).toBe(2);
      const wav = readbackWav(bytes);
      expect(wav.samples[0][1]).toBeGreaterThan(0.999);
      expect(wav.samples[0][2]).toBeLessThanOrEqual(-0.999);
    }
  });

  test('the mastering limiter holds the true peak under its ceiling on a hot input (export is not clipped)', () => {
    const rate = 48000;
    const hot = f32(sine({ frequency: 1000, dbfs: 3, seconds: 1, rate, fade: 0.05 }));
    const params = defaultChain();
    params.limiter = { ...params.limiter, enabled: true, ceiling: -1 };
    const { channels } = renderChain(validateChain(params), [hot, Float32Array.from(hot)], rate);
    const result = encodeWav(channels, rate, { bitDepth: 24 });
    expect(result.clippedSamples).toBe(0);
    expect(db(truePeak(Float64Array.from(channels[0])))).toBeLessThanOrEqual(-1 + 0.1);
  });
});

describe('LAS-123 no 30–60 s EQ reset (IA-15)', () => {
  test('a −12 dB bell stays at −12 dB at 5 s, 30 s, 45 s, 60 s and 75 s of continuous render', { timeout: 120000 }, () => {
    const rate = 44100;
    const seconds = 76;
    const params = (() => {
      const p = defaultChain();
      p.compressor = { ...p.compressor, enabled: false };
      p.limiter = { ...p.limiter, enabled: false };
      return editBand(p, 'left', 0, { enabled: true, type: 'bell', frequency: 1000, gain: -12, q: 1 });
    })();
    const input = f32(sine({ frequency: 1000, dbfs: -20, seconds, rate }));
    const { channels, meters } = renderChain(params, [input, Float32Array.from(input)], rate);
    const rms = (signal, t) => {
      const from = Math.round(t * rate), to = from + rate;
      let sum = 0;
      for (let n = from; n < to; n++) sum += signal[n] ** 2;
      return db(Math.sqrt(sum / (to - from)));
    };
    const reference = rms(input, 10);
    const gains = [5, 29.5, 44.5, 59.5, 74].map(t => rms(channels[0], t) - reference);
    for (const gain of gains) expect(gain).toBeCloseTo(-12, 0);
    expect(Math.max(...gains) - Math.min(...gains)).toBeLessThan(0.05);
    expect(meters.resets).toBe(0);
  });
});

describe('LAS-123 Preview → Reject → Apply → Undo and stale state (IA-13, IA-16)', () => {
  const edit = { channel: 'linked', index: 3, enabled: true, type: 'bell', frequency: 250, gain: -2, q: 1.2 };
  const payload = (over = {}) => ({ schema: EQ_PROPOSAL_SCHEMA, version: 1, scope: 'master', edits: [edit], reason: 'Reduce low-mid build-up.', limitations: 'One measured section.', ...over });
  function setup() {
    const state = { params: validateChain(defaultChain()), history: [], redo: [], audible: null, context: { projectId: 'p1', mediaId: 'm1', sampleRate: 48000 } };
    const coordinator = createPreviewCoordinator(value => { state.audible = value; });
    const commit = params => { state.history.push(state.params); state.redo = []; state.params = params; };
    const undo = () => { state.redo.push(state.params); state.params = state.history.pop(); };
    const redo = () => { state.history.push(state.params); state.params = state.redo.pop(); };
    const session = (body = payload()) => createProposalSession(
      createEqProposal(body, { chain: state.params, projectId: 'p1', mediaId: 'm1' }),
      { getChain: () => state.params, getContext: () => state.context, coordinator, owner: OWNERS.ai, commit },
    );
    return { state, session, undo, redo };
  }

  test('Preview changes only the audible candidate; Reject restores the committed chain with no undo entry', () => {
    const { state, session } = setup();
    const before = JSON.stringify(state.params);
    const s = session();
    s.preview(true);
    expect(state.audible.eq.left[3]).toMatchObject({ enabled: true, gain: -2 });
    s.discard();
    expect(state.audible).toBeNull();
    expect(JSON.stringify(state.params)).toBe(before);
    expect(state.history).toHaveLength(0);
    expect(() => s.apply()).toThrow(/already discarded/);
  });

  test('Apply is one undo step; Undo restores the exact previous chain, Redo reapplies it', () => {
    const { state, session, undo, redo } = setup();
    const before = JSON.stringify(state.params);
    const s = session();
    s.preview(true);
    s.apply();
    expect(state.history).toHaveLength(1);
    expect(state.audible).toBeNull();
    const applied = JSON.stringify(state.params);
    expect(applied).not.toBe(before);
    undo();
    expect(JSON.stringify(state.params)).toBe(before);
    redo();
    expect(JSON.stringify(state.params)).toBe(applied);
    expect(state.params.eq.left[3].gain).toBe(-2); // not reset to a stray −12 dB or default
  });

  test('a manual edit after the suggestion makes it stale: it can neither preview nor apply, and nothing sounds', () => {
    const { state, session } = setup();
    const s = session();
    s.preview(true);
    state.params = editBand(state.params, 'left', 5, { enabled: true, gain: 1 });
    expect(s.stale).toBe(true);
    expect(state.audible).toBeNull();
    expect(() => s.preview(true)).toThrow(/out of date|settings changed/);
    expect(() => s.apply()).toThrow(/Ask for a new suggestion/);
    expect(state.history).toHaveLength(0);
  });

  test.each([['track', { mediaId: 'other' }], ['project', { projectId: 'other' }]])('changing the %s makes the suggestion stale', (_, change) => {
    const { state, session } = setup();
    const s = session();
    state.context = { ...state.context, ...change };
    expect(() => s.apply()).toThrow(/Ask for a new suggestion/);
    expect(s.state).toBe('stale');
  });

  test('an out-of-bounds proposal is rejected before it can be heard or committed (IA-16)', () => {
    const { state, session } = setup();
    expect(() => session(payload({ edits: [{ ...edit, gain: 40 }] }))).toThrow();
    const guarded = session(payload({ edits: [{ ...edit, gain: 9 }] }));
    expect(() => guarded.preview(true)).toThrow(/limited/);
    expect(state.audible).toBeNull();
    expect(state.history).toHaveLength(0);
  });

  test('applying twice is refused, so one suggestion cannot stack', () => {
    const { session, state } = setup();
    const s = session();
    s.apply();
    expect(() => s.apply()).toThrow(/already applied/);
    expect(state.history).toHaveLength(1);
  });

  test.skip('NOT_RUN (LAS-120 Preview/Apply UI): Preview → Reject → Apply → Undo through the real UI buttons during playback', () => {});
  test.skip('NOT_RUN (LAS-122): intentional-pan annotation persists across Save/Reopen and suppresses repeat advice, not true-peak warnings (IA-13)', () => {});
});

describe('LAS-123 report save (JSON / PDF)', () => {
  test.skip('NOT_RUN (LAS-172 report): saved report JSON carries tested SHA, fixture hash, rates and measurements', () => {});
  test.skip('NOT_RUN (LAS-172 report): saved PDF report is a valid PDF whose figures equal the JSON report', () => {});
});
