import { renderChain } from './chain.js';
import { defaultChain, validateChain } from './chain-params.js';

// Offline stem master (LAS-35): the same signal path as the live stem session (LAS-34), computed
// from the files' own samples:
//   stem → its own chain (latency compensated) → gain → pan → placed at its offset ─┐
//                                                          sum of audible strips ←─┘ → master chain
// Every chain is rendered by renderChain(), the code the preview runs in the AudioWorklet, and every
// chain has the same constant latency, which renderChain removes, so the stems stay sample-aligned.
// Tails: a stem's chain keeps running after the stem ends (filter ringing, compressor and limiter
// release) until the session ends, as it does live; the session ends with its longest stem, whose own
// tail is not extended (the single-track export rule).
// The pan law is the Web Audio StereoPannerNode algorithm, so the offline mix equals the live one.
export class StemRenderError extends Error {}

const dbToGain = db => 10 ** (db / 20);

// Web Audio StereoPannerNode (equal power): mono in → [L, R] out; stereo in → [L, R] out.
export function pan(channels, value) {
  const frames = channels[0].length;
  const left = new Float32Array(frames), right = new Float32Array(frames);
  if (channels.length === 1) {
    const x = (value + 1) / 2;
    const gl = Math.cos((x * Math.PI) / 2), gr = Math.sin((x * Math.PI) / 2);
    for (let n = 0; n < frames; n++) { left[n] = channels[0][n] * gl; right[n] = channels[0][n] * gr; }
  } else if (value <= 0) {
    const x = value + 1;
    const gl = Math.cos((x * Math.PI) / 2), gr = Math.sin((x * Math.PI) / 2);
    for (let n = 0; n < frames; n++) { left[n] = channels[0][n] + channels[1][n] * gl; right[n] = channels[1][n] * gr; }
  } else {
    const gl = Math.cos((value * Math.PI) / 2), gr = Math.sin((value * Math.PI) / 2);
    for (let n = 0; n < frames; n++) { left[n] = channels[0][n] * gl; right[n] = channels[1][n] + channels[0][n] * gr; }
  }
  return [left, right];
}

export const audible = (stem, stems) => !stem.mute && (!stems.some(s => s.solo) || stem.solo);

// stems: [{ name, sampleRate, channels: Float32Array[] (1 or 2), offsetFrames, gainDb, pan, mute,
// solo, params (mps-chain) }]; master: mps-chain. Returns the combined master and each audible
// strip's output (after its chain, gain, pan and offset; before the master), all session-long.
export function renderStemMix({ stems, master, onProgress = () => {} }) {
  if (!stems.length) throw new StemRenderError('Add stems first.');
  const rates = [...new Set(stems.map(stem => stem.sampleRate))];
  if (rates.length > 1) throw new StemRenderError(`Rendering needs one sample rate for all stems; these have ${rates.map(r => `${r} Hz`).join(' and ')}. Convert them to one rate first (playback resamples, rendering does not).`);
  const wide = stems.find(stem => stem.channels.length > 2);
  if (wide) throw new StemRenderError(`${wide.name} has ${wide.channels.length} channels; rendering supports mono and stereo stems.`);
  const sampleRate = rates[0];
  const frames = stems.reduce((longest, stem) => Math.max(longest, stem.offsetFrames + stem.channels[0].length), 0);
  const playing = stems.filter(stem => audible(stem, stems));
  const strips = playing.map((stem, i) => {
    onProgress(`Rendering ${stem.name}…`, (0.8 * i) / Math.max(1, playing.length));
    // Silence after the stem's end lets its chain's tail run on to the end of the session.
    const padded = stem.channels.map(channel => { const p = new Float32Array(frames - stem.offsetFrames); p.set(channel); return p; });
    const processed = renderChain(validateChain(stem.params), padded, sampleRate).channels;
    const gain = dbToGain(stem.gainDb);
    const [left, right] = pan(processed.map(channel => channel.map(v => v * gain)), stem.pan);
    const out = [new Float32Array(frames), new Float32Array(frames)];
    out[0].set(left, stem.offsetFrames);
    out[1].set(right, stem.offsetFrames);
    return { name: stem.name, channels: out };
  });
  const bus = [new Float32Array(frames), new Float32Array(frames)];
  for (const strip of strips) for (let c = 0; c < 2; c++) for (let n = 0; n < frames; n++) bus[c][n] += strip.channels[c][n];
  onProgress('Rendering the master chain…', 0.85);
  const combined = renderChain(validateChain(master), bus, sampleRate);
  return { sampleRate, frames, combined: combined.channels, latency: combined.latency, strips, silent: stems.filter(stem => !audible(stem, stems)).map(stem => stem.name) };
}

// A chain with every processor off: what a new stem starts with (it still has the chain's constant
// latency, so bypassed and processed stems stay aligned).
export function bypassChain() {
  const params = defaultChain();
  return validateChain({ ...params, eq: { ...params.eq, enabled: false }, compressor: { ...params.compressor, enabled: false }, limiter: { ...params.limiter, enabled: false } });
}
