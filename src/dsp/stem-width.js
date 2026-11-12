// Per-stem stereo width (LAS-128): an opt-in M/S side-gain stage on one stem's strip, after its
// own chain and trim and before its pan:
//   chain → trim → WIDTH → pan → gate → meter → bus
// It is not a master widener and it never touches mid: M = (L+R)/2, S = (L−R)/2, L = M+S, R = M−S.
// Only S changes, and the stage adds D to L and subtracts it from R:  L' = L + D,  R' = R − D.
//   width < 1 (narrowing)  D = (width − 1)·S              the whole band, bass included, moves toward mono
//   width ≥ 1 (widening)   D = (width − 1)·HP(S)          only above the crossover: bass gets no extra width
// HP is a 2nd-order Linkwitz–Riley highpass (one biquad, Q = 0.5: 12 dB/oct below the crossover, −6 dB
// at it). Resulting side gain S'/S = 1 + (width − 1)·HP(f): never above `width`, and in the transition
// band dipping at most ~1 dB below 1 (asserted in tests/unit/stem-width.test.js); about one octave
// below the crossover widening is a few percent. A 4th-order slope was rejected: its −180° phase at
// the crossover would cut the side signal there instead of leaving it alone.
// Neutral = identity: with the stage off, or at width 1, D is exactly 0 and the stem is bit-for-bit
// what it was before this stage existed. Mono stems have S = 0, so the stage is skipped for them.
// Pan stays after the stage, so artistic pan (and its automation) is preserved: width reshapes a
// stem's own image, it does not centre it.
// Preview and export share this module's maths: the live graph (stem-session.js) is the same
// equation built from Web Audio biquads with the same coefficients (tested for parity).
import { biquadProcess } from './biquad.js';

export class StemWidthError extends Error {}

export const WIDTH_LIMITS = Object.freeze({ width: [0, 2], crossoverHz: [60, 400] });
export const DEFAULT_WIDTH = Object.freeze({ enabled: false, width: 1, crossoverHz: 150 });
export const LR2_Q = 0.5; // Linkwitz–Riley 2nd order: a double real pole

const finite = v => typeof v === 'number' && Number.isFinite(v);

// Refuses what is outside the declared bounds instead of guessing. Missing fields take the neutral
// defaults, so settings saved before this stage existed load as "off".
export function validateStemWidth(input) {
  const source = input ?? {};
  const out = { enabled: source.enabled ?? DEFAULT_WIDTH.enabled, width: source.width ?? DEFAULT_WIDTH.width, crossoverHz: source.crossoverHz ?? DEFAULT_WIDTH.crossoverHz };
  if (typeof out.enabled !== 'boolean') throw new StemWidthError('Width on/off must be true or false.');
  for (const key of ['width', 'crossoverHz']) {
    if (!finite(out[key]) || out[key] < WIDTH_LIMITS[key][0] || out[key] > WIDTH_LIMITS[key][1]) {
      throw new StemWidthError(`${key === 'width' ? 'Width' : 'The bass crossover'} must be between ${WIDTH_LIMITS[key][0]} and ${WIDTH_LIMITS[key][1]}${key === 'width' ? '' : ' Hz'}.`);
    }
  }
  return out;
}

export const isNeutralWidth = params => !params.enabled || params.width === 1;

// Gains of the two paths that make D: [S itself (narrowing), HP(S) (widening)].
export const deltaGains = ({ width }) => [width < 1 ? width - 1 : 0, width > 1 ? width - 1 : 0];

// RBJ lowpass / highpass, the coefficients a Web Audio BiquadFilterNode uses; Q here is linear.
function rbj(type, frequency, sampleRate, q) {
  const w0 = (2 * Math.PI * Math.min(frequency, 0.45 * sampleRate)) / sampleRate;
  const cos = Math.cos(w0), alpha = Math.sin(w0) / (2 * q), a0 = 1 + alpha;
  const edge = type === 'lowpass' ? 1 - cos : 1 + cos;
  const sign = type === 'lowpass' ? 1 : -1;
  return { b0: edge / 2 / a0, b1: (sign * edge) / a0, b2: edge / 2 / a0, a1: (-2 * cos) / a0, a2: (1 - alpha) / a0 };
}
export const lowpassCoefficients = (frequency, sampleRate, q = LR2_Q) => rbj('lowpass', frequency, sampleRate, q);
export const highpassCoefficients = (frequency, sampleRate, q = LR2_Q) => rbj('highpass', frequency, sampleRate, q);

// 2nd-order Linkwitz–Riley low/highpass of one channel.
export const lr2Lowpass = (input, frequency, sampleRate) => biquadProcess(input, lowpassCoefficients(frequency, sampleRate));
export const lr2Highpass = (input, frequency, sampleRate) => biquadProcess(input, highpassCoefficients(frequency, sampleRate));

// channels: Float32Array[] (1 or 2) of the stem after its chain and gain. Returns the channels
// unchanged (the same arrays) when the stage is off, neutral or the stem is mono.
export function applyStemWidth(channels, settings, sampleRate) {
  const params = validateStemWidth(settings);
  if (channels.length !== 2 || isNeutralWidth(params)) return channels;
  const [left, right] = channels;
  const frames = left.length;
  const side = new Float64Array(frames);
  for (let n = 0; n < frames; n++) side[n] = (left[n] - right[n]) / 2;
  const high = lr2Highpass(side, params.crossoverHz, sampleRate);
  const [direct, filtered] = deltaGains(params);
  const outLeft = new Float32Array(frames), outRight = new Float32Array(frames);
  for (let n = 0; n < frames; n++) {
    const delta = direct * side[n] + filtered * high[n];
    outLeft[n] = left[n] + delta;
    outRight[n] = right[n] - delta;
  }
  return [outLeft, outRight];
}

const mean = (a, b, f) => { let sum = 0; for (let n = 0; n < a.length; n++) sum += f(a[n], b[n]); return sum / Math.max(1, a.length); };
const db = ratio => 10 * Math.log10(ratio);

// Measurements of a stereo signal (never estimates):
//   correlation       zero-lag L/R correlation coefficient, −1…+1 (null when a channel is silent)
//   monoFoldDownDb    level of (L+R)/2 relative to the average channel power: 0 dB = nothing lost
//                     (identical channels), −3 dB = uncorrelated, −∞ = fully out of phase
//   sideToMidDb       power of S relative to M
export function measureStereo(left, right) {
  const ll = mean(left, right, l => l * l), rr = mean(left, right, (_, r) => r * r), lr = mean(left, right, (l, r) => l * r);
  const mid = mean(left, right, (l, r) => ((l + r) / 2) ** 2), side = mean(left, right, (l, r) => ((l - r) / 2) ** 2);
  const average = (ll + rr) / 2;
  return {
    correlation: ll > 0 && rr > 0 ? lr / Math.sqrt(ll * rr) : null,
    monoFoldDownDb: average > 0 ? (mid > 0 ? db(mid / average) : -Infinity) : null,
    sideToMidDb: mid > 0 && side > 0 ? db(side / mid) : null,
  };
}

// The same measurements below the crossover (the band the bass protection is about). A full
// per-band analysis waits for LAS-173; this is one band, computed with the stage's own filter.
export function measureLowBand(left, right, crossoverHz, sampleRate) {
  return measureStereo(lr2Lowpass(left, crossoverHz, sampleRate), lr2Lowpass(right, crossoverHz, sampleRate));
}

export const MONO_LOSS_WARN_DB = -6; // (L+R)/2 at least 6 dB under the channel average ⇔ correlation ≲ −0.5 for equal levels
export const NEGATIVE_CORRELATION_WARN = -0.2;

const num = (v, digits = 2) => (v === -Infinity ? '−∞' : v.toFixed(digits).replace('-', '−'));

// Plain-language warnings that quote the measured values and their thresholds.
export function stereoWarnings(label, whole, low, crossoverHz) {
  const out = [];
  if (whole?.correlation != null && whole.correlation < NEGATIVE_CORRELATION_WARN) out.push(`${label}: L/R correlation ${num(whole.correlation)} (warning below ${num(NEGATIVE_CORRELATION_WARN, 1)}): the channels partly cancel.`);
  if (whole?.monoFoldDownDb != null && whole.monoFoldDownDb < MONO_LOSS_WARN_DB) out.push(`${label}: a mono fold-down is ${num(whole.monoFoldDownDb, 1)} dB against the channel average (warning below ${MONO_LOSS_WARN_DB} dB).`);
  if (low?.monoFoldDownDb != null && low.monoFoldDownDb < MONO_LOSS_WARN_DB) out.push(`${label}: below ${crossoverHz} Hz a mono fold-down is ${num(low.monoFoldDownDb, 1)} dB against the channel average (warning below ${MONO_LOSS_WARN_DB} dB).`);
  return out;
}
