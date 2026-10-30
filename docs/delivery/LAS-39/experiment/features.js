// What the studio can see at proposal time, and the labels a learned model predicts (LAS-39).
import { OCTAVE_CENTRES } from '../../../../src/dsp/analysis.js';
import { biquadResponseDb } from '../../../../src/dsp/biquad.js';
import { defaultChain, validateChain } from '../../../../src/dsp/chain-params.js';
import { designBand } from '../../../../src/dsp/eq-design.js';
import { fitEq, GUARDS } from '../../../../src/proposal.js';
import { RATE } from './data.js';

export const CENTRES = OCTAVE_CENTRES.filter(centre => centre * Math.SQRT2 <= RATE / 2);
const level = (report, centre) => report.spectrum.bands.find(b => b.centreHz === centre)?.levelDb ?? -60;

// Features from the two analysis reports only (mix section and reference section): octave-band
// shape difference, loudness and true-peak differences, and the mix's own loudness and peak.
export const FEATURE_NAMES = [...CENTRES.map(c => `band ${c} Hz difference`), 'loudness difference', 'true-peak difference', 'mix loudness', 'mix true peak'];
export function features(mix, reference) {
  return [
    ...CENTRES.map(c => level(reference, c) - level(mix, c)),
    reference.loudness.integratedLufs - mix.loudness.integratedLufs,
    reference.peaks.truePeakDbtp - mix.peaks.truePeakDbtp,
    mix.loudness.integratedLufs,
    mix.peaks.truePeakDbtp,
  ];
}

// Octave-average gain of a set of EQ bands at each centre (power average over the octave, as the
// proposal measures a band).
export function octaveGains(bands) {
  const designs = bands.map(band => designBand(band, RATE));
  return CENTRES.map(centre => {
    let sum = 0;
    for (let i = 0; i < 16; i++) {
      const f = (centre / Math.SQRT2) * 2 ** ((i + 0.5) / 16);
      sum += 10 ** (designs.reduce((db, c) => db + biquadResponseDb(c, f, RATE), 0) / 10);
    }
    return 10 * Math.log10(sum / 16);
  });
}

// Labels: the true decision's octave gains and the limiter input gain.
export const labels = choice => [...octaveGains(choice.eq), choice.inputGain];

// The chain a learned prediction plays: octave bells fitted by the proposal's own fitEq (same EQ
// guards), the limiter at the predicted input gain (0–12 dB) and −1 dBTP, compressor off.
export function chainFromLabels(predicted) {
  const fit = fitEq(CENTRES, predicted.slice(0, CENTRES.length), RATE);
  const params = defaultChain();
  fit.bands.forEach((band, i) => {
    const bell = { enabled: true, type: 'bell', frequency: band.centreHz, gain: band.gain, q: Math.SQRT2 };
    params.eq.left[i] = { ...bell };
    params.eq.right[i] = { ...bell };
  });
  params.compressor = { ...params.compressor, enabled: false };
  const inputGain = Math.max(0, Math.min(GUARDS.maxInputGainDb, Math.round(predicted[CENTRES.length] * 10) / 10));
  params.limiter = { ...params.limiter, enabled: true, ceiling: GUARDS.ceilingDbtp, inputGain };
  return validateChain(params);
}

// RMS difference (dB) between two EQ curves on a log grid from 40 Hz to 16 kHz. With removeOffset,
// the mean difference is removed first (shape only): a broadband EQ offset and the limiter input
// gain are interchangeable for the output, and the analysis measures bands relative to the total.
export function curveErrorDb(bandsA, bandsB, { removeOffset = false } = {}) {
  const a = bandsA.map(b => designBand(b, RATE)), b = bandsB.map(x => designBand(x, RATE));
  const points = 100;
  const diff = Array.from({ length: points }, (_, i) => {
    const f = 40 * (16000 / 40) ** (i / (points - 1));
    return a.reduce((s, c) => s + biquadResponseDb(c, f, RATE), 0) - b.reduce((s, c) => s + biquadResponseDb(c, f, RATE), 0);
  });
  const offset = removeOffset ? diff.reduce((s, d) => s + d, 0) / points : 0;
  return Math.sqrt(diff.reduce((s, d) => s + (d - offset) ** 2, 0) / points);
}
