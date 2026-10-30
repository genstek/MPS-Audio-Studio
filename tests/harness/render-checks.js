// Independent checks of a render against its input (LAS-29). They use only the samples, not the
// chain's own meters, and report findings instead of throwing, so tests can also prove that each
// check catches a deliberately broken render.
import { createHash } from 'node:crypto';
import { measureLoudness } from '../../src/dsp/loudness.js';
import { truePeak } from '../../src/dsp/true-peak.js';
import { encodeWav } from '../../src/dsp/wav-encode.js';

const db = value => (value > 0 ? 20 * Math.log10(value) : null);
const round = (value, digits = 4) => (value === null ? null : Number(value.toFixed(digits)));

export function rms(channel) {
  let sum = 0;
  for (let n = 0; n < channel.length; n++) sum += channel[n] * channel[n];
  return Math.sqrt(sum / channel.length);
}

function correlation(a, b) {
  let ab = 0, aa = 0, bb = 0;
  for (let n = 0; n < a.length; n++) { ab += a[n] * b[n]; aa += a[n] * a[n]; bb += b[n] * b[n]; }
  return aa > 0 && bb > 0 ? ab / Math.sqrt(aa * bb) : null;
}

// Lag (in samples, −max…max) at which the output best matches the input, over the first
// `window` samples. ±200 covers the chain's latency (77–155 samples) if it were not compensated.
export function alignmentLag(input, output, { max = 200, window = 72000 } = {}) {
  const end = Math.min(input.length, window);
  let best = 0, bestValue = -Infinity;
  for (let lag = -max; lag <= max; lag++) {
    let sum = 0;
    for (let n = Math.max(0, -lag); n < end && n + lag < output.length; n++) sum += input[n] * output[n + lag];
    if (sum > bestValue) { bestValue = sum; best = lag; }
  }
  return best;
}

const clippedCount = channels => channels.reduce((count, channel) => count + channel.reduce((c, v) => c + (Math.abs(v) >= 1 ? 1 : 0), 0), 0);

// Metrics stored in the golden file; the hash is of the 24-bit WAV export of the render.
export function metrics(channels, sampleRate) {
  const loudness = measureLoudness(channels, sampleRate);
  return {
    frames: channels[0].length,
    channels: channels.length,
    integratedLufs: round(loudness.integratedLufs),
    truePeakDbtp: round(db(Math.max(...channels.map(channel => truePeak(channel))))),
    samplePeakDbfs: round(db(Math.max(...channels.map(channel => channel.reduce((m, v) => Math.max(m, Math.abs(v)), 0))))),
    rmsDbfs: channels.map(channel => round(db(rms(channel)))),
    correlation: channels.length === 2 ? round(correlation(channels[0], channels[1])) : null,
    clippedSamples: clippedCount(channels),
    nonFinite: channels.reduce((count, channel) => count + channel.reduce((c, v) => c + (Number.isFinite(v) ? 0 : 1), 0), 0),
    sha256: createHash('sha256').update(new Uint8Array(encodeWav(channels.map(channel => channel.map(v => (Number.isFinite(v) ? v : 0))), sampleRate).bytes)).digest('hex'),
  };
}

// expectations: { bypass, ceiling (dBTP or null), broadband, silentRight }
export function checkRender(input, output, sampleRate, expectations) {
  const findings = [];
  if (output.length !== input.length) findings.push(`channel count changed: ${input.length} → ${output.length}`);
  output.forEach((channel, c) => {
    if (input[c] && channel.length !== input[c].length) findings.push(`length of channel ${c + 1} changed: ${input[c].length} → ${channel.length} samples`);
    const bad = channel.reduce((count, v) => count + (Number.isFinite(v) ? 0 : 1), 0);
    if (bad) findings.push(`${bad} non-finite samples (NaN/Infinity) in channel ${c + 1}`);
  });
  if (findings.length) return findings; // the other checks need same-shaped, finite audio
  if (expectations.bypass) {
    for (let c = 0; c < input.length; c++) {
      const changed = input[c].findIndex((v, n) => v !== output[c][n]);
      if (changed >= 0) findings.push(`bypass changed channel ${c + 1} from sample ${changed}`);
    }
  }
  const clippedIn = clippedCount(input), clippedOut = clippedCount(output);
  if (clippedOut > clippedIn) findings.push(`unintended clipping: ${clippedOut} full-scale samples (input had ${clippedIn})`);
  if (expectations.ceiling !== null && expectations.ceiling !== undefined) {
    const peak = db(Math.max(...output.map(channel => truePeak(channel))));
    if (peak !== null && peak > expectations.ceiling + 0.1) findings.push(`true peak ${peak.toFixed(2)} dBTP is over the ${expectations.ceiling} dBTP ceiling`);
  }
  if (expectations.broadband) {
    for (let c = 0; c < input.length; c++) {
      if (rms(input[c]) === 0) continue;
      const lag = alignmentLag(input[c], output[c]);
      if (Math.abs(lag) > 1) findings.push(`timing changed: channel ${c + 1} is shifted by ${lag} samples`);
    }
  }
  if (expectations.silentRight && output.length === 2) {
    const level = db(rms(output[1]));
    if (level !== null && level > -120) findings.push(`channel mapping changed: the silent right channel now carries ${level.toFixed(1)} dBFS`);
  }
  return findings;
}
