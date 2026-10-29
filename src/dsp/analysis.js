import { fft } from './fft.js';
import { measureLoudness } from './loudness.js';
import { OVERSAMPLING, truePeak } from './true-peak.js';

// Audio analysis report (LAS-26). Pure and deterministic: the same samples give the same report.
// Definitions, units and tolerances are documented in docs/delivery/LAS-26/README.md.
export const ANALYSIS_VERSION = 'mps-analysis-1';
export const OCTAVE_CENTRES = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const CLIP_LEVEL = 32767 / 32768; // full scale of 16-bit audio
const db = value => (value > 0 ? 20 * Math.log10(value) : null);
const powerDb = value => (value > 0 ? 10 * Math.log10(value) : null);

function meanSquare(channel) {
  let sum = 0;
  for (let n = 0; n < channel.length; n++) sum += channel[n] * channel[n];
  return channel.length ? sum / channel.length : 0;
}

function clipping(channels) {
  let samples = 0;
  let runs = 0;
  for (const channel of channels) {
    let run = 0;
    for (let n = 0; n <= channel.length; n++) {
      if (n < channel.length && Math.abs(channel[n]) >= CLIP_LEVEL) {
        samples++;
        run++;
      } else {
        if (run >= 3) runs++;
        run = 0;
      }
    }
  }
  return { clippedSamples: samples, clippedRuns: runs };
}

function stereo(left, right, fs, stereoLoudness) {
  let lr = 0, ll = 0, rr = 0, mm = 0, ss = 0, meanL = 0, meanR = 0;
  for (let n = 0; n < left.length; n++) { meanL += left[n]; meanR += right[n]; }
  meanL /= left.length || 1;
  meanR /= right.length || 1;
  for (let n = 0; n < left.length; n++) {
    const l = left[n] - meanL, r = right[n] - meanR;
    lr += l * r; ll += l * l; rr += r * r;
    const m = (left[n] + right[n]) / 2, s = (left[n] - right[n]) / 2;
    mm += m * m; ss += s * s;
  }
  const mono = new Float64Array(left.length);
  for (let n = 0; n < left.length; n++) mono[n] = (left[n] + right[n]) / 2;
  const monoLoudness = measureLoudness([mono, mono], fs).integratedLufs;
  return {
    correlation: ll > 0 && rr > 0 ? lr / Math.sqrt(ll * rr) : null,
    sideToMidDb: mm > 0 && ss > 0 ? 10 * Math.log10(ss / mm) : null,
    balanceDb: ll > 0 && rr > 0 ? 10 * Math.log10(meanSquare(left) / meanSquare(right)) : null,
    monoLoudnessChangeDb: stereoLoudness !== null && monoLoudness !== null ? monoLoudness - stereoLoudness : null,
  };
}

// Average power spectrum (Hann-windowed 8192-point frames, half overlap, at most 512 frames spread
// evenly over the file) summed into octave bands; each band's share of the total and its level.
function spectrum(channels, fs) {
  const size = 8192;
  const frames = channels[0].length;
  if (frames < size) return { bands: [] };
  const window = Float64Array.from({ length: size }, (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / size));
  const starts = [];
  const available = Math.floor((frames - size) / (size / 2)) + 1;
  const count = Math.min(available, 512);
  for (let i = 0; i < count; i++) starts.push(Math.floor((i * (frames - size)) / Math.max(1, count - 1)));
  const power = new Float64Array(size / 2);
  const re = new Float64Array(size), im = new Float64Array(size);
  for (const channel of channels) {
    for (const start of starts) {
      for (let n = 0; n < size; n++) { re[n] = channel[start + n] * window[n]; im[n] = 0; }
      fft(re, im);
      for (let k = 1; k < size / 2; k++) power[k] += re[k] * re[k] + im[k] * im[k];
    }
  }
  const total = power.reduce((a, b) => a + b, 0);
  const bands = OCTAVE_CENTRES.filter(centre => centre * Math.SQRT2 <= fs / 2).map(centre => {
    let energy = 0;
    for (let k = 1; k < size / 2; k++) {
      const f = (k * fs) / size;
      if (f >= centre / Math.SQRT2 && f < centre * Math.SQRT2) energy += power[k];
    }
    return { centreHz: centre, share: total > 0 ? energy / total : 0, levelDb: total > 0 && energy > 0 ? 10 * Math.log10(energy / total) : null };
  });
  return { bands };
}

// channels: Float32Array/Float64Array per channel; fs: sample rate; segment in seconds (optional).
export function analyze(channels, fs, { start = 0, end } = {}) {
  if (!channels.length || channels.length > 2) throw new Error('Analysis supports mono and stereo audio.');
  const totalFrames = channels[0].length;
  const first = Math.max(0, Math.floor(start * fs));
  const last = Math.min(totalFrames, end === undefined ? totalFrames : Math.floor(end * fs));
  const audio = channels.map(channel => channel.subarray(first, last));
  const frames = last - first;
  const loudness = measureLoudness(audio, fs);
  const perChannel = audio.map(channel => {
    let sample = 0;
    let sum = 0;
    for (let n = 0; n < channel.length; n++) {
      const magnitude = Math.abs(channel[n]);
      if (magnitude > sample) sample = magnitude;
      sum += channel[n];
    }
    return { samplePeakDbfs: db(sample), truePeakDbtp: db(truePeak(channel)), rmsDbfs: powerDb(meanSquare(channel)), dcOffset: frames ? sum / frames : 0 };
  });
  const maxOf = key => perChannel.reduce((max, channel) => (channel[key] !== null && (max === null || channel[key] > max) ? channel[key] : max), null);
  const samplePeakDbfs = maxOf('samplePeakDbfs');
  const truePeakDbtp = maxOf('truePeakDbtp');
  const rmsDbfs = powerDb(audio.reduce((sum, channel) => sum + meanSquare(channel), 0) / audio.length);
  return {
    version: ANALYSIS_VERSION,
    input: { sampleRate: fs, channels: audio.length, frames, duration: frames / fs, segment: { start: first / fs, end: last / fs } },
    loudness,
    peaks: { samplePeakDbfs, truePeakDbtp, oversampling: OVERSAMPLING, perChannel: perChannel.map(({ samplePeakDbfs: s, truePeakDbtp: t }) => ({ samplePeakDbfs: s, truePeakDbtp: t })) },
    levels: {
      rmsDbfs,
      perChannelRmsDbfs: perChannel.map(channel => channel.rmsDbfs),
      crestFactorDb: samplePeakDbfs !== null && rmsDbfs !== null ? samplePeakDbfs - rmsDbfs : null,
      plrDb: truePeakDbtp !== null && loudness.integratedLufs !== null ? truePeakDbtp - loudness.integratedLufs : null,
      dcOffset: perChannel.map(channel => channel.dcOffset),
    },
    clipping: clipping(audio),
    stereo: audio.length === 2 ? stereo(audio[0], audio[1], fs, loudness.integratedLufs) : null,
    spectrum: spectrum(audio, fs),
  };
}
