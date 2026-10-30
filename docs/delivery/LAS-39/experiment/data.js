// Synthetic, generated data for the LAS-39 experiment. No recorded, copyrighted or personal audio.
//   Songs: music-like programmes in the style of the LAS-29 fixture (chords, bass, drums, a
//   formant voice), each with its own seed, key, tempo, instrument balance and brightness.
//   Mastering decisions: a known chain per (song, decision): low shelf, bell and high shelf within
//   ±3 dB, then the studio's limiter with a known input gain and a −1 dBTP ceiling (compressor off).
//   The "reference" is the song rendered through that chain by the studio's own renderChain().
import { renderChain } from '../../../../src/dsp/chain.js';
import { defaultChain, validateChain } from '../../../../src/dsp/chain-params.js';

export const RATE = 44100;
export const SONG_SECONDS = 8;
// Two non-overlapping sections per song: neighbours from the same master, the classic leakage path.
export const SECTIONS = [{ start: 1, end: 4 }, { start: 4.5, end: 7.5 }];

// Deterministic pseudo-random numbers (mulberry32).
export function random(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const between = (rnd, lo, hi) => lo + (hi - lo) * rnd();

export function song(seed) {
  const rnd = random(seed * 7919 + 1);
  const length = Math.round(RATE * SONG_SECONDS);
  const left = new Float32Array(length), right = new Float32Array(length);
  const root = 110 * 2 ** (Math.floor(rnd() * 12) / 12);
  const progression = [0, 5, 7, 3].map(step => [0, 4, 7].map(i => root * 2 ** ((step + i) / 12) * 2));
  const beat = Math.round(RATE * 60 / between(rnd, 84, 132));
  const mix = { chord: between(rnd, 0.03, 0.09), bass: between(rnd, 0.12, 0.3), kick: between(rnd, 0.3, 0.6), snare: between(rnd, 0.12, 0.35), hat: between(rnd, 0.02, 0.09), voice: between(rnd, 0.08, 0.25) };
  const bright = between(rnd, 0.1, 0.45); // noise low-pass coefficient: snare/hat brightness
  const formant = between(rnd, 0.06, 0.18);
  const pitchBase = between(rnd, 130, 260);
  let state = (seed * 2654435761) >>> 0;
  let lp = 0, bp1 = 0, bp2 = 0;
  for (let n = 0; n < length; n++) {
    const t = n / RATE;
    const bar = Math.floor(n / (beat * 4)) % progression.length;
    const inBeat = (n % beat) / RATE;
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const hiss = state / 2 ** 31 - 1;
    let chord = 0;
    for (const f of progression[bar]) chord += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    chord *= mix.chord * (0.7 + 0.3 * Math.cos(2 * Math.PI * 0.5 * t));
    const bass = mix.bass * Math.sin(2 * Math.PI * (progression[bar][0] / 4) * t) * Math.exp(-inBeat * 3);
    const kick = (Math.floor(n / beat) % 2 === 0 ? mix.kick : 0) * Math.sin(2 * Math.PI * (55 + 90 * Math.exp(-inBeat * 30)) * inBeat) * Math.exp(-inBeat * 12);
    lp += bright * (hiss - lp);
    const snare = (Math.floor(n / beat) % 2 === 1 ? mix.snare : 0) * (hiss - lp) * Math.exp(-inBeat * 18);
    const hat = mix.hat * (hiss - lp) * Math.exp(-((n % Math.round(beat / 2)) / RATE) * 60);
    const pitch = pitchBase + 20 * Math.sin(2 * Math.PI * 0.3 * t);
    const pulse = (t * pitch) % 1 < 0.08 ? 1 : 0;
    bp1 += formant * (pulse - bp1);
    bp2 += 0.3 * (bp1 - bp2);
    const voice = mix.voice * (bp1 - bp2) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 2 * t));
    left[n] = 0.9 * chord + bass + kick + snare + 1.2 * hat + voice;
    right[n] = 1.1 * chord + bass + kick + snare + 0.6 * hat + voice;
  }
  const ramp = Math.round(0.02 * RATE);
  for (let n = 0; n < ramp; n++) {
    const w = 0.5 - 0.5 * Math.cos((Math.PI * n) / ramp);
    for (const channel of [left, right]) { channel[n] *= w; channel[length - 1 - n] *= w; }
  }
  return [left, right];
}

// A known mastering decision: the EQ filters and the limiter input gain.
export function decision(seed) {
  const rnd = random(seed * 104729 + 3);
  return {
    eq: [
      { enabled: true, type: 'low-shelf', frequency: Math.round(between(rnd, 90, 220)), gain: Math.round(between(rnd, -3, 3) * 10) / 10, q: 0.707 },
      { enabled: true, type: 'bell', frequency: Math.round(250 * 2 ** between(rnd, 0, 4)), gain: Math.round(between(rnd, -3, 3) * 10) / 10, q: Math.round(between(rnd, 0.7, 2) * 100) / 100 },
      { enabled: true, type: 'high-shelf', frequency: Math.round(between(rnd, 4000, 10000)), gain: Math.round(between(rnd, -3, 3) * 10) / 10, q: 0.707 },
    ],
    inputGain: Math.round(between(rnd, 0, 6) * 10) / 10,
  };
}

export function chainOf({ eq, inputGain }) {
  const params = defaultChain();
  eq.forEach((band, i) => { params.eq.left[i] = { ...band }; params.eq.right[i] = { ...band }; });
  params.compressor = { ...params.compressor, enabled: false };
  params.limiter = { ...params.limiter, enabled: true, ceiling: -1, inputGain };
  return validateChain(params);
}

export const master = (channels, choice) => renderChain(chainOf(choice), channels, RATE).channels;
