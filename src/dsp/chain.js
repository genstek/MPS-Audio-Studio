import { resolveForSampleRate, validateChain } from './chain-params.js';
import { designBand, IDENTITY } from './eq-design.js';
import { HALF, TAPS, interpolationBranches } from './true-peak.js';

// The mastering chain (LAS-27): EQ → compressor → space (LAS-64) → limiter, processed sample by sample with state
// carried between blocks, so any block size gives the same output. The same code runs in the
// AudioWorklet for preview (chain.worklet.js) and in renderChain() for offline export.
//
// Parameter changes while running are smoothed over RAMP_SECONDS: EQ frequency/gain/Q are ramped
// (coefficients recomputed every COEFFICIENT_INTERVAL samples), band switches and type changes
// and processor bypass cross-fade, compressor and limiter levels follow a one-pole smoother.
// A chain created with fixed settings starts at those settings, with nothing ramping.
export const RAMP_SECONDS = 0.02;
export const LOOKAHEAD_SECONDS = 0.0015;
const COEFFICIENT_INTERVAL = 32;
const RMS_SECONDS = 0.01;
const TINY = 1e-30; // filter states below this are set to zero (no subnormal slow-downs)

const dbToGain = db => 10 ** (db / 20);
// The limiter detects peaks at 8× oversampling, finer than the 4× BS.1770 meter, so that peaks
// between quarter-sample points of high-frequency content are also held below the ceiling (an
// independent FFmpeg meter read 4×-detected limiting up to 0.2 dB over the ceiling, LAS-28).
export const LIMITER_OVERSAMPLING = 8;
const DETECTOR_BRANCHES = interpolationBranches(LIMITER_OVERSAMPLING);
const BRANCH_COUNT = DETECTOR_BRANCHES.length;
const DETECTOR_TAPS = Float64Array.from({ length: TAPS * BRANCH_COUNT }, (_, i) => DETECTOR_BRANCHES[i % BRANCH_COUNT][Math.floor(i / BRANCH_COUNT)]);

// ---------- EQ ----------
function bandState(band, sampleRate) {
  return {
    enabled: band.enabled, type: band.type,
    current: { frequency: band.frequency, gain: band.gain, q: band.q },
    target: { frequency: band.frequency, gain: band.gain, q: band.q },
    steps: 0,
    coefficients: band.enabled ? designBand(band, sampleRate) : IDENTITY,
    z1: 0, z2: 0,
    previous: null, // { coefficients, z1, z2 } of the filter fading out after a switch
    fadeLeft: 0,
  };
}

function updateBand(state, band, sampleRate, rampSamples) {
  const structural = band.enabled !== state.enabled || (band.enabled && band.type !== state.type);
  if (structural) {
    state.previous = state.enabled ? { coefficients: state.coefficients, z1: state.z1, z2: state.z2 } : { coefficients: IDENTITY, z1: 0, z2: 0 };
    state.fadeLeft = rampSamples;
    state.enabled = band.enabled;
    state.type = band.type;
    state.current = { frequency: band.frequency, gain: band.gain, q: band.q };
    state.target = { ...state.current };
    state.steps = 0;
    state.coefficients = band.enabled ? designBand(band, sampleRate) : IDENTITY;
    state.z1 = 0;
    state.z2 = 0;
    return;
  }
  const { frequency, gain, q } = band;
  if (frequency === state.target.frequency && gain === state.target.gain && q === state.target.q) return;
  state.target = { frequency, gain, q };
  state.steps = Math.max(1, Math.ceil(rampSamples / COEFFICIENT_INTERVAL));
}

// One ramp step toward the target: frequency and Q move on a log scale, gain in dB.
function stepBand(state, sampleRate) {
  const { current, target } = state;
  const k = 1 / state.steps;
  current.frequency = state.steps === 1 ? target.frequency : current.frequency * (target.frequency / current.frequency) ** k;
  current.q = state.steps === 1 ? target.q : current.q * (target.q / current.q) ** k;
  current.gain = state.steps === 1 ? target.gain : current.gain + (target.gain - current.gain) * k;
  state.steps--;
  // Written into the band's own coefficient object: no allocation on the audio thread.
  if (state.enabled) designBand({ type: state.type, frequency: current.frequency, gain: current.gain, q: current.q }, sampleRate, state.coefficients);
}

function biquad(c, s, x) {
  const y = c.b0 * x + s.z1;
  s.z1 = c.b1 * x - c.a1 * y + s.z2;
  s.z2 = c.b2 * x - c.a2 * y;
  return y;
}

// ---------- Space (LAS-64): stereo reverb ----------
// A feedback delay network: the input (mono sum) passes a pre-delay and four series all-pass
// diffusers, then circulates through eight delay lines mixed by an orthogonal (Householder) matrix.
// Each line has a decay gain for the chosen RT60 and a one-pole low-pass (damping) in its feedback
// path, so high frequencies die away faster while low frequencies decay over the set time. Left and
// right are taken from the lines with two orthogonal sign patterns (decorrelated stereo); a mono
// chain uses the left pattern. No modulation and no random numbers: renders are deterministic.
export const SPACE_LINES_MS = [31.7, 37.3, 41.9, 47.3, 53.1, 59.3, 67.1, 73.7];
const DIFFUSERS_MS = [4.77, 3.59, 12.73, 9.31];
const DIFFUSION = 0.6;
const MAX_PRE_DELAY_SECONDS = 0.2;
export const DAMPING_MAX = 0.7; // one-pole coefficient at 100 % damping
const LINES = SPACE_LINES_MS.length;
const LINE_NORM = 1 / Math.sqrt(LINES);
const INJECT = [1, 1, 1, 1, -1, -1, -1, -1].map(v => v * LINE_NORM);
const OUT_LEFT = [1, -1, 1, -1, 1, -1, 1, -1].map(v => v * LINE_NORM);
const OUT_RIGHT = [1, 1, -1, -1, 1, 1, -1, -1].map(v => v * LINE_NORM);
// Early sound: the diffused input itself reaches the output right after the pre-delay (left after
// the second diffuser, right after the fourth), before the first line echoes return (≥ 31.7 ms).
const EARLY = 0.3;

// Seconds of reverb after the input ends that an export keeps when the tail is included: the
// pre-delay plus the decay time (the low-frequency tail is 60 dB down by then).
export function spaceTailSeconds(params) {
  return params.space?.enabled ? params.space.preDelay / 1000 + params.space.decay : 0;
}

function createSpace(sampleRate) {
  const lengths = SPACE_LINES_MS.map(ms => Math.max(2, Math.round((ms / 1000) * sampleRate)));
  const preLength = Math.ceil(MAX_PRE_DELAY_SECONDS * sampleRate) + 2;
  return {
    lengths,
    lines: lengths.map(length => new Float64Array(length)),
    at: new Int32Array(LINES),
    lowpass: new Float64Array(LINES),
    gains: new Float64Array(LINES),
    out: new Float64Array(LINES),
    diffusers: DIFFUSERS_MS.map(ms => ({ buffer: new Float64Array(Math.max(1, Math.round((ms / 1000) * sampleRate))), at: 0 })),
    pre: new Float64Array(preLength),
    preAt: 0,
    // Smoothed values and their targets.
    wet: 0, damping: 0, decay: 1, delay: 0,
    target: { wet: 0, damping: 0, decay: 1, delay: 0 },
    gainsFor: -1, // the decay the line gains were last computed for
  };
}

function clearSpace(sp) {
  for (const line of sp.lines) line.fill(0);
  sp.at.fill(0);
  sp.lowpass.fill(0);
  for (const d of sp.diffusers) { d.buffer.fill(0); d.at = 0; }
  sp.pre.fill(0);
  sp.preAt = 0;
}

function updateSpaceGains(sp, sampleRate) {
  for (let i = 0; i < LINES; i++) sp.gains[i] = 10 ** ((-3 * sp.lengths[i]) / (sp.decay * sampleRate));
  sp.gainsFor = sp.decay;
}

// ---------- the chain ----------
export function createChain(initialParams, sampleRate, channelCount) {
  if (channelCount !== 1 && channelCount !== 2) throw new Error('The chain processes mono or stereo audio.');
  const rampSamples = Math.max(1, Math.round(RAMP_SECONDS * sampleRate));
  const lookahead = Math.max(1, Math.round(LOOKAHEAD_SECONDS * sampleRate));
  // The detector looks HALF samples ahead for true-peak interpolation, then the gain needs the
  // look-ahead window to reach its value before the peak: total delay of the audio path.
  const latency = HALF + lookahead - 1;
  const smoothing = Math.exp(-1 / (RAMP_SECONDS * sampleRate / 4)); // one-pole, ≈ settled after the ramp
  let params;
  let warnings = [];

  // EQ: one band set per processed channel (mono uses the left/linked bands).
  let eqBands = [];
  const eqBandsFor = channel => (params.eq.mode === 'link' || channel === 0 ? params.eq.left : params.eq.right);

  // Compressor state.
  const comp = { gainDb: 0, envelope: 0, threshold: 0, ratio: 1, knee: 0, makeup: 0, attack: 0, release: 0, levelsSet: false };
  // Limiter state: per channel a history for the true-peak detector and two delay lines.
  const historyLength = TAPS + 1;
  const sums = new Float64Array(BRANCH_COUNT); // detector work area (no allocation per sample)
  const lim = {
    history: Array.from({ length: channelCount }, () => new Float64Array(historyLength)),
    historyAt: 0,
    wet: Array.from({ length: channelCount }, () => new Float64Array(latency + 1)),
    dry: Array.from({ length: channelCount }, () => new Float64Array(latency + 1)),
    delayAt: 0,
    // Sliding minimum of the required gain over the look-ahead window (monotonic deque).
    minValues: new Float64Array(lookahead + 1), minIndex: new Float64Array(lookahead + 1), minHead: 0, minTail: 0,
    // Box average of the released gain over the look-ahead window.
    box: new Float64Array(lookahead).fill(1), boxAt: 0, boxSum: lookahead,
    envelope: 1, count: 0,
    ceiling: 1, inputGain: 1, releaseCoefficient: 0, gainReductionDb: 0,
  };
  // Space (reverb) state, sized for this sample rate.
  const sp = createSpace(sampleRate);
  // Processor mix: 0 = bypassed, 1 = processing; ramps linearly toward its target.
  const mix = { eq: 0, compressor: 0, space: 0, limiter: 0 };
  const mixTarget = { eq: 0, compressor: 0, space: 0, limiter: 0 };

  const meters = { compressorGainReductionDb: 0, limiterGainReductionDb: 0, nonFiniteInputs: 0, resets: 0 };
  let clock = 0; // samples processed so far: EQ ramp steps fall on the same samples for any block size

  function applyParams(next, immediate) {
    const resolved = resolveForSampleRate(validateChain(next), sampleRate);
    params = resolved.params;
    warnings = resolved.warnings;
    for (let c = 0; c < channelCount; c++) {
      const bands = eqBandsFor(c);
      if (immediate || !eqBands[c]) eqBands[c] = bands.map(band => bandState(band, sampleRate));
      else bands.forEach((band, i) => updateBand(eqBands[c][i], band, sampleRate, rampSamples));
    }
    const { compressor, limiter, space } = params;
    sp.target = { wet: space.mix / 100, damping: (space.damping / 100) * DAMPING_MAX, decay: space.decay, delay: (space.preDelay / 1000) * sampleRate };
    comp.attack = Math.exp(-1 / ((compressor.attack / 1000) * sampleRate));
    comp.release = Math.exp(-1 / ((compressor.release / 1000) * sampleRate));
    comp.rms = Math.exp(-1 / (RMS_SECONDS * sampleRate));
    comp.target = { threshold: compressor.threshold, ratio: compressor.ratio, knee: compressor.knee, makeup: compressor.makeup };
    lim.releaseCoefficient = Math.exp(-1 / ((limiter.release / 1000) * sampleRate));
    lim.target = { ceiling: dbToGain(limiter.ceiling), inputGain: dbToGain(limiter.inputGain) };
    if (immediate) Object.assign(sp, { wet: sp.target.wet, damping: sp.target.damping, decay: sp.target.decay, delay: sp.target.delay });
    if (immediate || !comp.levelsSet) {
      Object.assign(comp, comp.target);
      comp.levelsSet = true;
      lim.ceiling = lim.target.ceiling;
      lim.inputGain = lim.target.inputGain;
    }
    // An EQ switched back on after full bypass starts from silence, not from stale filter states.
    if (!immediate && params.eq.enabled && mix.eq === 0) eqBands = eqBands.map((_, c) => eqBandsFor(c).map(band => bandState(band, sampleRate)));
    // Space switched on after full bypass starts from silence, at its new settings.
    if (!immediate && params.space.enabled && mix.space === 0) {
      clearSpace(sp);
      Object.assign(sp, { wet: sp.target.wet, damping: sp.target.damping, decay: sp.target.decay, delay: sp.target.delay });
    }
    for (const name of ['eq', 'compressor', 'space', 'limiter']) {
      mixTarget[name] = params[name].enabled ? 1 : 0;
      if (immediate) mix[name] = mixTarget[name];
    }
  }
  applyParams(initialParams, true);

  const follow = (current, target) => (Math.abs(target - current) < 1e-9 * Math.max(1, Math.abs(target)) ? target : target + (current - target) * smoothing);
  const moveMix = name => {
    if (mix[name] !== mixTarget[name]) mix[name] = mixTarget[name] > mix[name] ? Math.min(1, mix[name] + 1 / rampSamples) : Math.max(0, mix[name] - 1 / rampSamples);
  };

  function clearAll() {
    eqBands = eqBands.map((_, c) => eqBandsFor(c).map(band => bandState(band, sampleRate)));
    clearSpace(sp);
    comp.gainDb = 0;
    comp.envelope = 0;
    for (const list of [lim.history, lim.wet, lim.dry]) list.forEach(buffer => buffer.fill(0));
    lim.box.fill(1); lim.boxSum = lookahead; lim.envelope = 1; lim.minHead = 0; lim.minTail = 0;
  }

  function resetState() {
    meters.resets++;
    clearAll();
  }

  // Processes `frames` samples from inputs[c] into outputs[c] (Float32Array or Float64Array).
  function process(inputs, outputs, frames) {
    let compressorPeak = 0, limiterPeak = 0;
    for (let n = 0; n < frames; n++, clock++) {
      // ---- input guard ----
      let l = inputs[0] ? inputs[0][n] : 0;
      let r = channelCount === 2 ? (inputs[1] ? inputs[1][n] : l) : 0;
      if (!Number.isFinite(l)) { l = 0; meters.nonFiniteInputs++; }
      if (!Number.isFinite(r)) { r = 0; meters.nonFiniteInputs++; }

      // ---- EQ ----
      moveMix('eq');
      if (mix.eq > 0 || mixTarget.eq > 0) {
        let el = l, er = r;
        for (let c = 0; c < channelCount; c++) {
          let x = c === 0 ? l : r;
          const bands = eqBands[c];
          for (let b = 0; b < bands.length; b++) {
            const band = bands[b];
            if (band.steps > 0 && clock % COEFFICIENT_INTERVAL === 0) stepBand(band, sampleRate);
            if (!band.enabled && !band.previous) continue;
            const y = band.enabled ? biquad(band.coefficients, band, x) : x;
            if (band.previous) {
              const old = biquad(band.previous.coefficients, band.previous, x);
              const w = band.fadeLeft / rampSamples;
              x = y + (old - y) * w;
              if (--band.fadeLeft <= 0) band.previous = null;
            } else {
              x = y;
            }
          }
          if (c === 0) el = x; else er = x;
        }
        l = mix.eq === 1 ? el : l + (el - l) * mix.eq;
        r = mix.eq === 1 ? er : r + (er - r) * mix.eq;
      }

      // ---- compressor (feed-forward, stereo-linked detector) ----
      // The detector always runs, so switching the compressor on mid-play starts from a settled state.
      moveMix('compressor');
      {
        comp.threshold = follow(comp.threshold, comp.target.threshold);
        comp.ratio = follow(comp.ratio, comp.target.ratio);
        comp.knee = follow(comp.knee, comp.target.knee);
        comp.makeup = follow(comp.makeup, comp.target.makeup);
        let level;
        if (params.compressor.detector === 'rms') {
          comp.envelope = comp.rms * comp.envelope + (1 - comp.rms) * Math.max(l * l, r * r);
          level = Math.sqrt(comp.envelope);
        } else {
          level = Math.max(Math.abs(l), Math.abs(r));
        }
        const x = 20 * Math.log10(level > 1e-12 ? level : 1e-12);
        const over = x - comp.threshold;
        let target;
        if (2 * over < -comp.knee) target = 0;
        else if (comp.knee > 0 && 2 * Math.abs(over) <= comp.knee) target = (1 / comp.ratio - 1) * (over + comp.knee / 2) ** 2 / (2 * comp.knee);
        else target = over / comp.ratio - over;
        comp.gainDb = target < comp.gainDb ? comp.attack * comp.gainDb + (1 - comp.attack) * target : comp.release * comp.gainDb + (1 - comp.release) * target;
        if (comp.gainDb > -1e-12) comp.gainDb = 0; // exactly unity gain below the threshold
        const gain = dbToGain(comp.gainDb + comp.makeup);
        if (mix.compressor > 0) {
          const cl = l * gain, cr = r * gain;
          l = mix.compressor === 1 ? cl : l + (cl - l) * mix.compressor;
          r = mix.compressor === 1 ? cr : r + (cr - r) * mix.compressor;
          if (-comp.gainDb > compressorPeak) compressorPeak = -comp.gainDb;
        }
      }

      // ---- space (reverb; skipped entirely while fully bypassed, so bypass is exact) ----
      moveMix('space');
      if (mix.space > 0 || mixTarget.space > 0) {
        sp.wet = follow(sp.wet, sp.target.wet);
        sp.damping = follow(sp.damping, sp.target.damping);
        sp.decay = follow(sp.decay, sp.target.decay);
        sp.delay = follow(sp.delay, sp.target.delay);
        if (sp.decay !== sp.gainsFor && clock % COEFFICIENT_INTERVAL === 0) updateSpaceGains(sp, sampleRate);
        else if (sp.gainsFor < 0) updateSpaceGains(sp, sampleRate);
        // Pre-delay with linear interpolation between samples.
        const preLength = sp.pre.length;
        sp.pre[sp.preAt] = channelCount === 2 ? 0.5 * (l + r) : l;
        const back = sp.preAt - sp.delay;
        const whole = Math.floor(back);
        const frac = back - whole;
        const a = sp.pre[(whole + preLength) % preLength], b = sp.pre[(whole + 1 + preLength) % preLength];
        let x = a + (b - a) * frac;
        sp.preAt = (sp.preAt + 1) % preLength;
        // Series all-pass diffusers.
        let earlyLeft = 0;
        for (let d = 0; d < sp.diffusers.length; d++) {
          const diffuser = sp.diffusers[d];
          const delayed = diffuser.buffer[diffuser.at];
          const w = x + DIFFUSION * delayed;
          x = delayed - DIFFUSION * w;
          diffuser.buffer[diffuser.at] = w;
          diffuser.at = (diffuser.at + 1) % diffuser.buffer.length;
          if (d === 1) earlyLeft = x;
        }
        // Delay lines: read, damp, decay, mix (Householder), write back with the new input.
        let sum = 0, wetL = EARLY * earlyLeft, wetR = EARLY * x;
        const damping = sp.damping;
        for (let i = 0; i < LINES; i++) {
          const out = sp.lines[i][sp.at[i]];
          wetL += OUT_LEFT[i] * out;
          wetR += OUT_RIGHT[i] * out;
          const damped = (1 - damping) * out + damping * sp.lowpass[i];
          sp.lowpass[i] = damped;
          const f = damped * sp.gains[i];
          sp.out[i] = f;
          sum += f;
        }
        const householder = (2 / LINES) * sum;
        for (let i = 0; i < LINES; i++) {
          sp.lines[i][sp.at[i]] = sp.out[i] - householder + INJECT[i] * x;
          sp.at[i] = (sp.at[i] + 1) % sp.lengths[i];
        }
        const wet = sp.wet;
        const sl = l * (1 - wet) + wetL * wet;
        const sr = channelCount === 2 ? r * (1 - wet) + wetR * wet : 0;
        l = mix.space === 1 ? sl : l + (sl - l) * mix.space;
        r = channelCount === 2 ? (mix.space === 1 ? sr : r + (sr - r) * mix.space) : r;
      }

      // ---- limiter (true-peak look-ahead; its delay applies even when bypassed) ----
      moveMix('limiter');
      lim.ceiling = follow(lim.ceiling, lim.target.ceiling);
      lim.inputGain = follow(lim.inputGain, lim.target.inputGain);
      const at = lim.delayAt;
      const gl = l * lim.inputGain, gr = r * lim.inputGain;
      lim.dry[0][at] = l; lim.wet[0][at] = gl;
      if (channelCount === 2) { lim.dry[1][at] = r; lim.wet[1][at] = gr; }
      const read = (at + 1) % (latency + 1); // the sample written `latency` samples ago
      lim.delayAt = read;
      let outL = lim.dry[0][read], outR = channelCount === 2 ? lim.dry[1][read] : 0;
      {
        // Detector (always running): the history holds the last TAPS + 1 gained samples. It measures
        // sample m = newest − HALF and the three interpolated points between m − 1 and m.
        const h = lim.historyAt;
        lim.history[0][h] = gl;
        if (channelCount === 2) lim.history[1][h] = gr;
        lim.historyAt = (h + 1) % historyLength;
        let peak = 0;
        for (let c = 0; c < channelCount; c++) {
          const hist = lim.history[c];
          const newest = h; // sample m + HALF
          const m = (newest - HALF + historyLength) % historyLength;
          const sample = Math.abs(hist[m]);
          sums.fill(0);
          for (let k = 0; k < TAPS; k++) {
            const x = hist[(newest - 1 - k + 2 * historyLength) % historyLength]; // j + HALF − k with j = m − 1
            for (let b = 0, at = k * BRANCH_COUNT; b < BRANCH_COUNT; b++, at++) sums[b] += x * DETECTOR_TAPS[at];
          }
          peak = Math.max(peak, sample);
          for (let b = 0; b < BRANCH_COUNT; b++) if (Math.abs(sums[b]) > peak) peak = Math.abs(sums[b]);
        }
        const required = peak > lim.ceiling ? lim.ceiling / peak : 1;
        // Sliding minimum over the last `lookahead` required gains.
        const count = lim.count++;
        const size = lookahead + 1;
        while (lim.minTail !== lim.minHead && lim.minValues[(lim.minTail - 1 + size) % size] >= required) lim.minTail = (lim.minTail - 1 + size) % size;
        lim.minValues[lim.minTail] = required; lim.minIndex[lim.minTail] = count; lim.minTail = (lim.minTail + 1) % size;
        while (lim.minIndex[lim.minHead] <= count - lookahead) lim.minHead = (lim.minHead + 1) % size;
        const held = lim.minValues[lim.minHead];
        // Release toward the held gain, never above it; then a box average over the look-ahead.
        lim.envelope = held < lim.envelope ? held : lim.releaseCoefficient * lim.envelope + (1 - lim.releaseCoefficient) * held;
        lim.boxSum += lim.envelope - lim.box[lim.boxAt];
        lim.box[lim.boxAt] = lim.envelope;
        lim.boxAt = (lim.boxAt + 1) % lookahead;
        if (lim.boxAt === 0) lim.boxSum = lim.box.reduce((a, b) => a + b, 0); // no drift from running sums
        const gain = Math.min(1, lim.boxSum / lookahead);
        if (mix.limiter > 0) {
          const wl = lim.wet[0][read] * gain, wr = channelCount === 2 ? lim.wet[1][read] * gain : 0;
          outL = mix.limiter === 1 ? wl : outL + (wl - outL) * mix.limiter;
          outR = mix.limiter === 1 ? wr : outR + (wr - outR) * mix.limiter;
          const reduction = gain < 1 ? -20 * Math.log10(gain) : 0;
          if (reduction > limiterPeak) limiterPeak = reduction;
        }
      }
      outputs[0][n] = outL;
      if (channelCount === 2) outputs[1][n] = outR;
    }
    meters.compressorGainReductionDb = compressorPeak;
    meters.limiterGainReductionDb = limiterPeak;
    // Guard: a state that is no longer finite (it should never happen) resets the chain.
    let healthy = Number.isFinite(comp.gainDb) && Number.isFinite(lim.envelope) && Number.isFinite(lim.boxSum);
    for (let i = 0; i < LINES; i++) {
      if (!Number.isFinite(sp.lowpass[i])) healthy = false;
      if (Math.abs(sp.lowpass[i]) < TINY) sp.lowpass[i] = 0;
    }
    for (const bands of eqBands) for (const band of bands) {
      if (!Number.isFinite(band.z1) || !Number.isFinite(band.z2)) healthy = false;
      if (Math.abs(band.z1) < TINY) band.z1 = 0;
      if (Math.abs(band.z2) < TINY) band.z2 = 0;
    }
    if (!healthy) {
      resetState();
      for (const output of outputs) output.fill(0, 0, frames);
    }
  }

  return {
    latency,
    sampleRate,
    channelCount,
    process,
    setParams: next => applyParams(next, false),
    // Clears all filter, reverb and delay states at once (unload / replacement, LAS-64): the source
    // has already stopped, so no stale reverb tail or limiter delay is heard afterwards.
    reset() { clearAll(); },
    get params() { return params; },
    get warnings() { return warnings; },
    get meters() { return { ...meters }; },
  };
}

// Offline render (export): the whole input through a chain created with fixed settings, in blocks.
// The chain's latency is compensated, so output sample n lines up with input sample n.
// tailFrames (LAS-64) appends that many samples after the input (silence in, the reverb tail out);
// with 0 the output is exactly as long as the input. onProgress(fraction) is called about every
// 64 blocks.
export function renderChain(params, inputs, sampleRate, { blockSize = 128, onProgress, tailFrames = 0 } = {}) {
  const channelCount = inputs.length;
  const chain = createChain(params, sampleRate, channelCount);
  const frames = inputs[0].length;
  const length = frames + tailFrames;
  const outputs = inputs.map(() => new Float32Array(length));
  const inBlock = inputs.map(() => new Float32Array(blockSize));
  const outBlock = inputs.map(() => new Float32Array(blockSize));
  let maxCompressor = 0, maxLimiter = 0;
  const total = length + chain.latency;
  for (let start = 0; start < total; start += blockSize) {
    const count = Math.min(blockSize, total - start);
    for (let c = 0; c < channelCount; c++) {
      inBlock[c].fill(0);
      if (start < frames) inBlock[c].set(inputs[c].subarray(start, Math.min(frames, start + count)));
    }
    chain.process(inBlock, outBlock, count);
    if (onProgress && (start / blockSize) % 64 === 0) onProgress(Math.min(1, start / total));
    maxCompressor = Math.max(maxCompressor, chain.meters.compressorGainReductionDb);
    maxLimiter = Math.max(maxLimiter, chain.meters.limiterGainReductionDb);
    for (let i = 0; i < count; i++) {
      const target = start + i - chain.latency;
      if (target >= 0 && target < length) for (let c = 0; c < channelCount; c++) outputs[c][target] = outBlock[c][i];
    }
  }
  return {
    channels: outputs,
    latency: chain.latency,
    warnings: chain.warnings,
    meters: { maxCompressorGainReductionDb: maxCompressor, maxLimiterGainReductionDb: maxLimiter, nonFiniteInputs: chain.meters.nonFiniteInputs, resets: chain.meters.resets },
  };
}
