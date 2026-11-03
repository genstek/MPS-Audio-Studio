// Biquad coefficients for the EQ band types (R. Bristow-Johnson, "Audio EQ Cookbook"), normalised
// so a0 = 1. Gain is used by bell and shelves; Q is the bandwidth (bell), the shelf slope (shelves,
// 0.707 = no overshoot) or the resonance (high-pass/low-pass, 0.707 = Butterworth).
export const IDENTITY = Object.freeze({ b0: 1, b1: 0, b2: 0, a1: 0, a2: 0 });

export function designBand({ type, frequency, gain, q }, sampleRate, out = {}) {
  const w0 = (2 * Math.PI * frequency) / sampleRate;
  const cos = Math.cos(w0);
  const alpha = Math.sin(w0) / (2 * q);
  const A = 10 ** (gain / 40);
  let b0, b1, b2, a0, a1, a2;
  switch (type) {
    case 'bell':
      [b0, b1, b2] = [1 + alpha * A, -2 * cos, 1 - alpha * A];
      [a0, a1, a2] = [1 + alpha / A, -2 * cos, 1 - alpha / A];
      break;
    case 'low-shelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      [b0, b1, b2] = [A * (A + 1 - (A - 1) * cos + s), 2 * A * (A - 1 - (A + 1) * cos), A * (A + 1 - (A - 1) * cos - s)];
      [a0, a1, a2] = [A + 1 + (A - 1) * cos + s, -2 * (A - 1 + (A + 1) * cos), A + 1 + (A - 1) * cos - s];
      break;
    }
    case 'high-shelf': {
      const s = 2 * Math.sqrt(A) * alpha;
      [b0, b1, b2] = [A * (A + 1 + (A - 1) * cos + s), -2 * A * (A - 1 + (A + 1) * cos), A * (A + 1 + (A - 1) * cos - s)];
      [a0, a1, a2] = [A + 1 - (A - 1) * cos + s, 2 * (A - 1 - (A + 1) * cos), A + 1 - (A - 1) * cos - s];
      break;
    }
    case 'low-pass':
      [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
      [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    case 'high-pass':
      [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
      [a0, a1, a2] = [1 + alpha, -2 * cos, 1 - alpha];
      break;
    default:
      throw new Error(`Unknown EQ band type ${type}.`);
  }
  out.b0 = b0 / a0; out.b1 = b1 / a0; out.b2 = b2 / a0; out.a1 = a1 / a0; out.a2 = a2 / a0;
  return out;
}

// A biquad is stable when both poles are inside the unit circle (Jury criterion).
export const isStable = ({ a1, a2 }) => Math.abs(a2) < 1 && Math.abs(a1) < 1 + a2;
