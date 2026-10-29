// Deterministic test signals as sample arrays (no files, no recorded audio).
export const fromDbfs = dbfs => 10 ** (dbfs / 20);

// `fade` seconds of raised-cosine fade-in and fade-out avoid the overshoot an abrupt start or end
// really causes on playback, for tests about the steady tone.
export function sine({ frequency = 1000, dbfs = -20, seconds = 1, rate = 48000, phase = 0, fade = 0 } = {}) {
  const amplitude = fromDbfs(dbfs);
  const length = Math.round(seconds * rate);
  const ramp = Math.round(fade * rate);
  const envelope = n => {
    const edge = Math.min(n, length - 1 - n);
    return edge < ramp ? 0.5 - 0.5 * Math.cos((Math.PI * edge) / ramp) : 1;
  };
  return Float64Array.from({ length }, (_, n) => envelope(n) * amplitude * Math.sin((2 * Math.PI * frequency * n) / rate + phase));
}

export function concat(...parts) {
  const out = new Float64Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

// EBU Tech 3341/3342 style sequences: [[seconds, dBFS], ...] of a 1 kHz sine.
export const toneSequence = (steps, rate = 48000) => concat(...steps.map(([seconds, dbfs]) => sine({ seconds, dbfs, rate })));

// Seeded white noise in [-amplitude, amplitude] (linear congruential generator).
export function noise({ seconds = 1, rate = 48000, amplitude = 0.25, seed = 1 } = {}) {
  let state = seed >>> 0;
  return Float64Array.from({ length: Math.round(seconds * rate) }, () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return amplitude * (state / 2 ** 31 - 1);
  });
}
