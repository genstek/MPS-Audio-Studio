import { MEASUREMENTS } from './dsp/analysis.js';

// Reference sound profiles (LAS-30): helpers shared by the dialog and later comparison work.
export const MIN_SEGMENT_SECONDS = 5;
// Reanalysis of the same file and segment must agree within this (the analysis is deterministic,
// so any difference beyond rounding means a different file, segment or analysis version).
export const REANALYSIS_TOLERANCE_DB = 0.01;

const KEY_MEASURES = [
  ['Integrated loudness', p => p.loudness.integratedLufs, 'LUFS'],
  ['Loudness range', p => p.loudness.rangeLu, 'LU'],
  ['True peak', p => p.peaks.truePeakDbtp, 'dBTP'],
  ['Crest factor', p => p.levels.crestFactorDb, 'dB'],
  ['Correlation', p => p.stereo?.correlation ?? null, ''],
];

export const keyMeasures = profile => KEY_MEASURES.map(([name, read, unit]) => ({ name, value: read(profile), unit }));

// A profile as stored: the analysis report of the segment plus the measurement definitions.
export const toProfile = report => ({ ...report, measurements: MEASUREMENTS });

// Differences between two measurements of the same file and segment, beyond the tolerance.
export function compareProfiles(stored, fresh) {
  const differences = [];
  if (stored.version !== fresh.version) differences.push(`analysis version ${stored.version} → ${fresh.version}`);
  if (stored.input.sha256 !== fresh.input.sha256) differences.push('the file is different (checksums differ)');
  for (const [name, read] of KEY_MEASURES) {
    const a = read(stored), b = read(fresh);
    if ((a === null) !== (b === null) || (a !== null && Math.abs(a - b) > REANALYSIS_TOLERANCE_DB)) differences.push(`${name}: ${a} → ${b}`);
  }
  (stored.spectrum?.bands ?? []).forEach((band, i) => {
    const other = fresh.spectrum?.bands?.[i];
    if (!other || Math.abs(band.share - other.share) > 1e-4) differences.push(`spectrum band ${band.centreHz} Hz changed`);
  });
  return differences;
}

// Low/mid/high share of energy from the octave bands: below 250 Hz, 250 Hz–4 kHz, above 4 kHz.
export function tonalBalance(profile) {
  const bands = profile.spectrum?.bands ?? [];
  const sum = test => bands.filter(band => test(band.centreHz)).reduce((total, band) => total + band.share, 0);
  return { low: sum(f => f < 250), mid: sum(f => f >= 250 && f <= 4000), high: sum(f => f > 4000) };
}
