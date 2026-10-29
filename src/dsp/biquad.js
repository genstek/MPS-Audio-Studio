// Second-order IIR section in transposed direct form II (shared by analysis and the processing chain).
// Coefficients are normalised so a0 = 1: { b0, b1, b2, a1, a2 }.
export function biquadProcess(input, { b0, b1, b2, a1, a2 }, output = new Float64Array(input.length)) {
  let z1 = 0;
  let z2 = 0;
  for (let n = 0; n < input.length; n++) {
    const x = input[n];
    const y = b0 * x + z1;
    z1 = b1 * x - a1 * y + z2;
    z2 = b2 * x - a2 * y;
    output[n] = y;
  }
  return output;
}

// Magnitude response in dB of a coefficient set at frequency f (Hz) for sample rate fs.
export function biquadResponseDb({ b0, b1, b2, a1, a2 }, f, fs) {
  const w = (2 * Math.PI * f) / fs;
  const cos1 = Math.cos(w), sin1 = Math.sin(w), cos2 = Math.cos(2 * w), sin2 = Math.sin(2 * w);
  const numRe = b0 + b1 * cos1 + b2 * cos2, numIm = -(b1 * sin1 + b2 * sin2);
  const denRe = 1 + a1 * cos1 + a2 * cos2, denIm = -(a1 * sin1 + a2 * sin2);
  return 10 * Math.log10((numRe ** 2 + numIm ** 2) / (denRe ** 2 + denIm ** 2));
}
