import { biquadProcess } from './biquad.js';

// ITU-R BS.1770-4 loudness with EBU R128 gating and EBU Tech 3342 loudness range.
// K-weighting coefficients are derived from the standard's analog prototypes so every sample rate
// gets the same response; at 48 kHz they equal the coefficients printed in BS.1770-4.
export function kWeighting(fs) {
  const shelf = (() => {
    const gainDb = 3.999843853973347, q = 0.7071752369554196, fc = 1681.974450955533;
    const k = Math.tan((Math.PI * fc) / fs);
    const vh = 10 ** (gainDb / 20);
    const vb = vh ** 0.4996667741545416;
    const a0 = 1 + k / q + k * k;
    return { b0: (vh + (vb * k) / q + k * k) / a0, b1: (2 * (k * k - vh)) / a0, b2: (vh - (vb * k) / q + k * k) / a0, a1: (2 * (k * k - 1)) / a0, a2: (1 - k / q + k * k) / a0 };
  })();
  const highPass = (() => {
    const q = 0.5003270373238773, fc = 38.13547087602444;
    const k = Math.tan((Math.PI * fc) / fs);
    const a0 = 1 + k / q + k * k;
    return { b0: 1, b1: -2, b2: 1, a1: (2 * (k * k - 1)) / a0, a2: (1 - k / q + k * k) / a0 };
  })();
  return { shelf, highPass };
}

const maxOf = values => values.reduce((max, value) => (value > max ? value : max), -Infinity);
const toLufs = meanSquareSum => (meanSquareSum > 0 ? -0.691 + 10 * Math.log10(meanSquareSum) : -Infinity);

// Mean square of K-weighted audio in windows of `windowSeconds`, every `hopSeconds`, summed over
// channels (mono and stereo channels all have weight 1.0).
function windowPowers(weighted, fs, windowSeconds, hopSeconds) {
  const length = Math.round(windowSeconds * fs);
  const hop = Math.round(hopSeconds * fs);
  const frames = weighted[0].length;
  if (frames < length) return [];
  // Prefix sums of squares make every window O(1).
  const prefixes = weighted.map(channel => {
    const prefix = new Float64Array(channel.length + 1);
    for (let n = 0; n < channel.length; n++) prefix[n + 1] = prefix[n] + channel[n] * channel[n];
    return prefix;
  });
  const powers = [];
  for (let start = 0; start + length <= frames; start += hop) {
    let sum = 0;
    for (const prefix of prefixes) sum += (prefix[start + length] - prefix[start]) / length;
    powers.push(sum);
  }
  return powers;
}

export function measureLoudness(channels, fs) {
  const { shelf, highPass } = kWeighting(fs);
  const weighted = channels.map(channel => biquadProcess(biquadProcess(channel, shelf), highPass));
  // Integrated loudness: 400 ms blocks with 75 % overlap, absolute gate −70 LUFS, relative gate −10 LU.
  const blocks = windowPowers(weighted, fs, 0.4, 0.1);
  if (!blocks.length) return { state: 'too-short', integratedLufs: null, momentaryMaxLufs: null, shortTermMaxLufs: null, rangeLu: null, gatedBlocks: 0 };
  const absolute = blocks.filter(power => toLufs(power) > -70);
  if (!absolute.length) return { state: 'silent', integratedLufs: null, momentaryMaxLufs: null, shortTermMaxLufs: null, rangeLu: null, gatedBlocks: 0 };
  const relativeGate = toLufs(absolute.reduce((a, b) => a + b, 0) / absolute.length) - 10;
  const gated = absolute.filter(power => toLufs(power) > relativeGate);
  const integratedLufs = toLufs(gated.reduce((a, b) => a + b, 0) / gated.length);
  // Loudness range: 3 s short-term windows every 100 ms, gates −70 LUFS absolute and −20 LU relative,
  // then the spread between the 10th and 95th percentiles (EBU Tech 3342).
  const shortTerm = windowPowers(weighted, fs, 3, 0.1);
  let rangeLu = null;
  const shortAbsolute = shortTerm.filter(power => toLufs(power) > -70);
  if (shortAbsolute.length) {
    const shortGate = toLufs(shortAbsolute.reduce((a, b) => a + b, 0) / shortAbsolute.length) - 20;
    const values = shortAbsolute.map(toLufs).filter(value => value > shortGate).sort((a, b) => a - b);
    const percentile = p => values[Math.min(values.length - 1, Math.max(0, Math.round((p / 100) * (values.length - 1))))];
    rangeLu = percentile(95) - percentile(10);
  }
  return {
    state: 'ok',
    integratedLufs,
    momentaryMaxLufs: toLufs(maxOf(blocks)),
    shortTermMaxLufs: shortTerm.length ? toLufs(maxOf(shortTerm)) : null,
    rangeLu,
    gatedBlocks: gated.length,
  };
}
