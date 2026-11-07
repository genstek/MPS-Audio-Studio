// Band-limited sample-rate conversion (LAS-127). Polyphase windowed-sinc (Kaiser, β = 10, ≈ 100 dB
// stop-band) interpolation of the exact rational ratio out/in, so the sample rate really changes
// and pitch and duration are preserved: no header relabelling, no dropped or repeated samples.
//   - The low-pass cut-off sits at 0.95 of the lower of the two Nyquist frequencies; the transition
//     band is ≈ 10 % of that Nyquist, so the pass-band is flat to ≈ 0.9 × Nyquist (≈ 19.8 kHz for 44.1 kHz).
//   - Each phase's kernel is normalised to unit DC gain.
//   - Outside the signal the input is zero. Output length is round(frames × out / in): the first
//     output sample is aligned with the first input sample and positions are exact to the
//     destination frame; no tail is added, so the file duration is preserved to ±½ destination frame.
// Pure and synchronous: run it in the render worker; the page cancels by terminating the worker.
export const SUPPORTED_RATES = [44100, 48000, 88200, 96000];
export const MAX_OUTPUT_BYTES = 1024 * 1024 * 1024; // 1 GiB of WAV data per export

const ZERO_CROSSINGS = 64;
const BETA = 10;
const CUTOFF = 0.95;

export class ResampleError extends Error {
  constructor(message) { super(message); this.name = 'ResampleError'; }
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

function besselI0(x) {
  let sum = 1, term = 1;
  for (let k = 1; k < 60; k++) {
    term *= (x / (2 * k)) ** 2;
    sum += term;
    if (term < sum * 1e-17) break;
  }
  return sum;
}

export function resampledFrames(frames, inRate, outRate) {
  return Math.round((frames * outRate) / inRate);
}

// Throws a ResampleError for rates or sizes that must not be attempted.
export function checkConversion({ frames, channels, inRate, outRate, bitDepth = 24, extraFrames = 0 }) {
  for (const rate of [inRate, outRate]) {
    if (!Number.isInteger(rate) || rate < 8000 || rate > 384000) throw new ResampleError(`${rate} Hz is not a supported sample rate (8,000 to 384,000 Hz).`);
  }
  const outFrames = resampledFrames(frames, inRate, outRate) + extraFrames;
  const bytes = outFrames * channels * (bitDepth / 8);
  if (bytes > MAX_OUTPUT_BYTES) {
    throw new ResampleError(`The converted file would be ${(bytes / 1048576).toFixed(0)} MiB, over the ${MAX_OUTPUT_BYTES / 1048576} MiB export limit. Choose a lower sample rate or a shorter track.`);
  }
  return outFrames;
}

function kernelFor(phase, up, scale, half) {
  // Taps for input samples i0-half+1 … i0+half, output instant i0 + phase/up.
  const taps = new Float64Array(2 * half);
  const norm = besselI0(BETA);
  let sum = 0;
  for (let j = 0; j < taps.length; j++) {
    const d = j - half + 1 - phase / up; // input-sample distance from the output instant
    const x = scale * d;
    const sinc = Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const r = d / half;
    const window = Math.abs(r) < 1 ? besselI0(BETA * Math.sqrt(1 - r * r)) / norm : 0;
    taps[j] = sinc * window;
    sum += taps[j];
  }
  for (let j = 0; j < taps.length; j++) taps[j] /= sum;
  return taps;
}

// channels: Float32Array[] at inRate → Float32Array[] at outRate. onProgress(fraction 0…1).
export function resample(channels, inRate, outRate, { onProgress = () => {} } = {}) {
  const frames = channels[0].length;
  const outFrames = checkConversion({ frames, channels: channels.length, inRate, outRate });
  if (inRate === outRate) return channels.map(channel => Float32Array.from(channel));
  const divisor = gcd(inRate, outRate);
  const up = outRate / divisor, down = inRate / divisor;
  const scale = Math.min(1, outRate / inRate) * CUTOFF;
  const half = Math.ceil(ZERO_CROSSINGS / Math.min(1, outRate / inRate));
  const cache = new Map();
  const output = channels.map(() => new Float32Array(outFrames));
  const chunk = 1 << 15;
  for (let c = 0; c < channels.length; c++) {
    const input = channels[c], result = output[c];
    for (let n = 0; n < outFrames; n++) {
      const position = n * down;
      const i0 = Math.floor(position / up);
      const phase = position - i0 * up;
      let taps = cache.get(phase);
      if (!taps) { taps = kernelFor(phase, up, scale, half); cache.set(phase, taps); }
      const start = i0 - half + 1;
      let sum = 0;
      if (start >= 0 && i0 + half < frames) {
        for (let j = 0; j < taps.length; j++) sum += taps[j] * input[start + j];
      } else {
        for (let j = 0; j < taps.length; j++) {
          const k = start + j;
          if (k >= 0 && k < frames) sum += taps[j] * input[k];
        }
      }
      result[n] = sum;
      if ((n & (chunk - 1)) === 0) onProgress((c + n / outFrames) / channels.length);
    }
  }
  onProgress(1);
  return output;
}
