import { renderChain } from './chain.js';

// Renders one section of a track with the mastering chain as it sounds inside the whole-track
// render (LAS-31), without rendering the whole track. The chain's level detectors carry memory,
// so rendering starts a pre-roll earlier: at least MIN_PRE_ROLL_SECONDS and five of the slowest
// attack/release time constants, after which an earlier state difference has decayed below
// e^-5 (under 1 %). A short post-roll lets the limiter's look-ahead see the audio that follows.
export const MIN_PRE_ROLL_SECONDS = 3;
export const POST_ROLL_SECONDS = 0.01;

export function preRollSeconds(params) {
  const slowest = Math.max(params.compressor.attack, params.compressor.release, params.limiter.release) / 1000;
  return Math.max(MIN_PRE_ROLL_SECONDS, 5 * slowest);
}

// channels: the whole track; { start, end } in seconds. Returns renderChain's result with the
// section's samples only (sample n of the section lines up with source sample start·fs + n).
export function renderSegment(params, channels, sampleRate, { start, end }, options) {
  const frames = channels[0].length;
  const first = Math.max(0, Math.floor(start * sampleRate));
  const last = Math.min(frames, Math.floor(end * sampleRate));
  const from = Math.max(0, first - Math.ceil(preRollSeconds(params) * sampleRate));
  const to = Math.min(frames, last + Math.ceil(POST_ROLL_SECONDS * sampleRate));
  const rendered = renderChain(params, channels.map(channel => channel.subarray(from, to)), sampleRate, options);
  return { ...rendered, channels: rendered.channels.map(channel => channel.subarray(first - from, last - from)), preRoll: (first - from) / sampleRate };
}
