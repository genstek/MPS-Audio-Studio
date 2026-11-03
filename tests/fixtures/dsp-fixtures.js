// Versioned synthetic DSP fixtures (LAS-29). Generated from code, so no audio files are stored and
// no recorded or copyrighted material is involved. Changing any generator changes its PCM hash in
// tests/golden/dsp-golden.json: bump FIXTURE_SET_VERSION and regenerate the golden file.
import { noise, sine } from './signals.js';

export const FIXTURE_SET_VERSION = 'mps-fixtures-1';

const f32 = signal => Float32Array.from(signal);
const fade = (signal, rate, seconds = 0.02) => {
  const ramp = Math.round(seconds * rate);
  for (let n = 0; n < ramp && n < signal.length; n++) {
    const w = 0.5 - 0.5 * Math.cos((Math.PI * n) / ramp);
    signal[n] *= w;
    signal[signal.length - 1 - n] *= w;
  }
  return signal;
};
const gainDb = (signal, db) => signal.map(v => v * 10 ** (db / 20));

function logSweep(rate, seconds, dbfs) {
  const length = Math.round(rate * seconds);
  const f0 = 20, f1 = Math.min(20000, 0.45 * rate), k = Math.log(f1 / f0);
  const amplitude = 10 ** (dbfs / 20);
  return Float32Array.from({ length }, (_, n) => amplitude * Math.sin(((2 * Math.PI * f0 * seconds) / k) * (Math.exp((k * n) / length) - 1)));
}

// Clicks and decaying noise bursts with sharp attacks (drum-like transients).
function transients(rate, seconds, seed) {
  const length = Math.round(rate * seconds);
  const left = new Float32Array(length), right = new Float32Array(length);
  const hits = noise({ seconds, rate, amplitude: 1, seed });
  const period = Math.round(rate * 0.25);
  for (let n = 0; n < length; n++) {
    const t = (n % period) / rate;
    const accent = Math.floor(n / period) % 4 === 0 ? 0.8 : 0.45;
    const envelope = accent * Math.exp(-t * 35);
    left[n] = envelope * hits[n];
    right[n] = envelope * hits[(n + 37) % length];
    if (n % period === 0) { left[n] = 0.9; right[n] = -0.7; } // single-sample clicks
  }
  return [left, right];
}

// Music-like programme: chords, bass, kick/snare/hat and a vocal-like formant voice, panned.
function programme(rate, seconds, seed) {
  const length = Math.round(rate * seconds);
  const left = new Float32Array(length), right = new Float32Array(length);
  const chords = [[220, 277.18, 329.63], [196, 246.94, 293.66], [174.61, 220, 261.63], [196, 246.94, 311.13]];
  const beat = Math.round(rate * 0.5);
  const hiss = noise({ seconds, rate, amplitude: 1, seed: seed + 1 });
  let lp = 0, bp1 = 0, bp2 = 0;
  for (let n = 0; n < length; n++) {
    const t = n / rate;
    const bar = Math.floor(n / (beat * 4)) % chords.length;
    const inBeat = (n % beat) / rate;
    let chord = 0;
    for (const f of chords[bar]) chord += Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t);
    chord *= 0.06 * (0.7 + 0.3 * Math.cos(2 * Math.PI * 0.5 * t));
    const bass = 0.22 * Math.sin(2 * Math.PI * (chords[bar][0] / 2) * t) * Math.exp(-inBeat * 3);
    const kick = (Math.floor(n / beat) % 2 === 0 ? 0.5 : 0) * Math.sin(2 * Math.PI * (60 + 90 * Math.exp(-inBeat * 30)) * inBeat) * Math.exp(-inBeat * 12);
    lp += 0.25 * (hiss[n] - lp);
    const snare = (Math.floor(n / beat) % 2 === 1 ? 0.25 : 0) * (hiss[n] - lp) * Math.exp(-inBeat * 18);
    const hat = 0.05 * (hiss[n] - lp) * Math.exp(-((n % (beat / 2)) / rate) * 60);
    // Voice: a pulse train at a gliding pitch through two resonances (≈ 700 Hz and 1.2 kHz).
    const pitch = 180 + 20 * Math.sin(2 * Math.PI * 0.3 * t);
    const pulse = (t * pitch) % 1 < 0.08 ? 1 : 0;
    bp1 += 0.12 * (pulse - bp1);
    bp2 += 0.3 * (bp1 - bp2);
    const voice = 0.18 * (bp1 - bp2) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 2 * t));
    left[n] = 0.9 * chord + bass + kick + 0.8 * snare + 1.2 * hat + 0.9 * voice;
    right[n] = 1.1 * chord + bass + kick + 0.8 * snare + 0.6 * hat + 0.9 * voice;
  }
  return [fade(left, rate), fade(right, rate)];
}

// name → (rate) => channels. Each fixture is 2–4 seconds.
export const FIXTURES = {
  'silence-stereo': rate => [new Float32Array(rate * 2), new Float32Array(rate * 2)],
  'impulse-mono': rate => { const s = new Float32Array(rate * 2); s[Math.round(rate / 2)] = 0.5; return [s]; },
  'tone-1k-stereo': rate => { const s = fade(f32(sine({ frequency: 1000, dbfs: -20, seconds: 2, rate })), rate); return [s, Float32Array.from(s)]; },
  'tone-100-mono': rate => [fade(f32(sine({ frequency: 100, dbfs: -12, seconds: 2, rate })), rate)],
  'tone-10k-stereo': rate => { const s = fade(f32(sine({ frequency: 10000, dbfs: -18, seconds: 2, rate })), rate); return [s, Float32Array.from(s)]; },
  'sweep-mono': rate => [fade(logSweep(rate, 3, -12), rate)],
  'phase-inverted': rate => { const s = fade(f32(sine({ frequency: 440, dbfs: -14, seconds: 2, rate })), rate); return [s, s.map(v => -v)]; },
  'phase-quadrature': rate => [fade(f32(sine({ frequency: 440, dbfs: -14, seconds: 2, rate })), rate), fade(f32(sine({ frequency: 440, dbfs: -14, seconds: 2, rate, phase: Math.PI / 2 })), rate)],
  'left-only': rate => [fade(f32(sine({ frequency: 700, dbfs: -10, seconds: 2, rate })), rate), new Float32Array(rate * 2)],
  transients: rate => transients(rate, 3, 7),
  programme: rate => programme(rate, 4, 11),
  'programme-hot': rate => programme(rate, 4, 11).map(channel => f32(gainDb(channel, 9))),
};

// Fixtures that are broadband at every moment, so input/output alignment can be measured by
// correlation. (A sweep is narrowband at each instant: EQ group delay legitimately shifts it.)
export const BROADBAND = new Set(['impulse-mono', 'transients', 'programme', 'programme-hot']);
export const FIXTURE_RATES = [44100, 48000];
