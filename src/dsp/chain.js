import { resolveForSampleRate, validateChain } from './chain-params.js';
import { designBand, IDENTITY } from './eq-design.js';
import { BRANCHES, HALF, TAPS } from './true-peak.js';

// The mastering chain (LAS-27): EQ → compressor → limiter, processed sample by sample with state
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
const B1 = BRANCHES[0], B2 = BRANCHES[1], B3 = BRANCHES[2];

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
  // Processor mix: 0 = bypassed, 1 = processing; ramps linearly toward its target.
  const mix = { eq: 0, compressor: 0, limiter: 0 };
  const mixTarget = { eq: 0, compressor: 0, limiter: 0 };
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
    const { compressor, limiter } = params;
    comp.attack = Math.exp(-1 / ((compressor.attack / 1000) * sampleRate));
    comp.release = Math.exp(-1 / ((compressor.release / 1000) * sampleRate));
    comp.rms = Math.exp(-1 / (RMS_SECONDS * sampleRate));
    comp.target = { threshold: compressor.threshold, ratio: compressor.ratio, knee: compressor.knee, makeup: compressor.makeup };
    lim.releaseCoefficient = Math.exp(-1 / ((limiter.release / 1000) * sampleRate));
    lim.target = { ceiling: dbToGain(limiter.ceiling), inputGain: dbToGain(limiter.inputGain) };
    if (immediate || !comp.levelsSet) {
      Object.assign(comp, comp.target);
      comp.levelsSet = true;
      lim.ceiling = lim.target.ceiling;
      lim.inputGain = lim.target.inputGain;
    }
    // An EQ switched back on after full bypass starts from silence, not from stale filter states.
    if (!immediate && params.eq.enabled && mix.eq === 0) eqBands = eqBands.map((_, c) => eqBandsFor(c).map(band => bandState(band, sampleRate)));
    for (const name of ['eq', 'compressor', 'limiter']) {
      mixTarget[name] = params[name].enabled ? 1 : 0;
      if (immediate) mix[name] = mixTarget[name];
    }
  }
  applyParams(initialParams, true);

  const follow = (current, target) => (Math.abs(target - current) < 1e-9 * Math.max(1, Math.abs(target)) ? target : target + (current - target) * smoothing);
  const moveMix = name => {
    if (mix[name] !== mixTarget[name]) mix[name] = mixTarget[name] > mix[name] ? Math.min(1, mix[name] + 1 / rampSamples) : Math.max(0, mix[name] - 1 / rampSamples);
  };

  function resetState() {
    meters.resets++;
    eqBands = eqBands.map((_, c) => eqBandsFor(c).map(band => bandState(band, sampleRate)));
    comp.gainDb = 0;
    comp.envelope = 0;
    for (const list of [lim.history, lim.wet, lim.dry]) list.forEach(buffer => buffer.fill(0));
    lim.box.fill(1); lim.boxSum = lookahead; lim.envelope = 1; lim.minHead = 0; lim.minTail = 0;
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
          let s1 = 0, s2 = 0, s3 = 0;
          for (let k = 0; k < TAPS; k++) {
            const x = hist[(newest - 1 - k + 2 * historyLength) % historyLength]; // j + HALF − k with j = m − 1
            s1 += x * B1[k]; s2 += x * B2[k]; s3 += x * B3[k];
          }
          peak = Math.max(peak, sample, Math.abs(s1), Math.abs(s2), Math.abs(s3));
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
    get params() { return params; },
    get warnings() { return warnings; },
    get meters() { return { ...meters }; },
  };
}

// Offline render (export): the whole input through a chain created with fixed settings, in blocks.
// The chain's latency is compensated, so output sample n lines up with input sample n.
// onProgress(fraction) is called about every 64 blocks.
export function renderChain(params, inputs, sampleRate, { blockSize = 128, onProgress } = {}) {
  const channelCount = inputs.length;
  const chain = createChain(params, sampleRate, channelCount);
  const frames = inputs[0].length;
  const outputs = inputs.map(() => new Float32Array(frames));
  const inBlock = inputs.map(() => new Float32Array(blockSize));
  const outBlock = inputs.map(() => new Float32Array(blockSize));
  let maxCompressor = 0, maxLimiter = 0;
  const total = frames + chain.latency;
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
      if (target >= 0 && target < frames) for (let c = 0; c < channelCount; c++) outputs[c][target] = outBlock[c][i];
    }
  }
  return {
    channels: outputs,
    latency: chain.latency,
    warnings: chain.warnings,
    meters: { maxCompressorGainReductionDb: maxCompressor, maxLimiterGainReductionDb: maxLimiter, nonFiniteInputs: chain.meters.nonFiniteInputs, resets: chain.meters.resets },
  };
}
