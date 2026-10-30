// Mix-versus-reference comparison (LAS-31). Pure: it reads analysis reports (LAS-26) of the
// reference segment and of the mix segment (original and, optionally, processed with the current
// settings) and returns measured differences with units, conditions that limit the comparison,
// and, kept separate, cautious interpretations. Nothing here changes audio or settings.
export const MIN_COMPARABLE_SECONDS = 5;
export const LENGTH_RATIO_LIMIT = 1.2; // sections differing more than 20 % in length: flagged
export const SMALL_BAND_DIFFERENCE_DB = 1; // octave-band shape differences below this are "small"
const TONAL_INTERPRETATION_DB = 3;

const round = (value, digits = 2) => (value === null || value === undefined || !Number.isFinite(value) ? null : Number(value.toFixed(digits)));
const minus = (a, b) => (a === null || b === null || a === undefined || b === undefined ? null : round(a - b));

export class ComparisonError extends Error {}

// rows: [{ group, measure, unit, differenceUnit, explanation, reference, original, processed,
// originalDifference, processedDifference, status: 'measured' | 'small' | 'not comparable' |
// 'not measurable' }]. Differences of LUFS are in LU and of dBTP in dB (EBU R128 usage).
const DIFFERENCE_UNITS = { LUFS: 'LU', dBTP: 'dB' };
export function compareToReference(reference, original, processed = null) {
  const versions = new Set([reference, original, processed].filter(Boolean).map(report => report.version));
  if (versions.size > 1) throw new ComparisonError(`The measurements use different analysis versions (${[...versions].join(', ')}); measure again.`);
  for (const [name, report] of [['reference', reference], ['mix', original], ['processed mix', processed]]) {
    if (!report) continue;
    if (report.loudness.state === 'silent') throw new ComparisonError(`The ${name} section is silent; choose a section with music.`);
    if (report.loudness.state !== 'ok') throw new ComparisonError(`The ${name} section is too short to measure.`);
  }
  const conditions = [];
  const durations = [reference.input.duration, original.input.duration];
  if (Math.min(...durations) < MIN_COMPARABLE_SECONDS) conditions.push({ level: 'uncertain', text: `A section is shorter than ${MIN_COMPARABLE_SECONDS} s; loudness range and spectrum are less reliable.` });
  if (Math.max(...durations) / Math.min(...durations) > LENGTH_RATIO_LIMIT) {
    conditions.push({ level: 'uncertain', text: `The sections differ in length (${durations[1].toFixed(1)} s mix, ${durations[0].toFixed(1)} s reference); differences may reflect different musical content.` });
  }
  const stereoComparable = reference.input.channels === 2 && original.input.channels === 2;
  if (!stereoComparable) conditions.push({ level: 'unsupported', text: `Stereo measures are not compared: the ${reference.input.channels === 1 ? 'reference' : 'mix'} is mono.` });
  const nyquist = Math.min(reference.input.sampleRate, original.input.sampleRate) / 2;
  if (reference.input.sampleRate !== original.input.sampleRate) {
    conditions.push({ level: 'uncertain', text: `Different sample rates (${original.input.sampleRate} Hz mix, ${reference.input.sampleRate} Hz reference): only octave bands both can contain are compared.` });
  }
  conditions.push({ level: 'note', text: 'Level differences are measurements, not quality scores; listening is level-matched.' });

  const rows = [];
  const add = (group, measure, unit, explanation, read, { stereo = false } = {}) => {
    const values = { reference: read(reference), original: read(original), processed: processed ? read(processed) : null };
    const comparable = !stereo || stereoComparable;
    rows.push({
      group, measure, unit, differenceUnit: DIFFERENCE_UNITS[unit] ?? unit, explanation,
      reference: round(values.reference), original: round(values.original), processed: round(values.processed),
      originalDifference: comparable ? minus(values.original, values.reference) : null,
      processedDifference: comparable && processed ? minus(values.processed, values.reference) : null,
      status: !comparable ? 'not comparable' : values.original === null || values.reference === null ? 'not measurable' : 'measured',
    });
  };
  add('Loudness and level', 'Integrated loudness', 'LUFS', 'Level difference (not a quality measure)', r => r.loudness.integratedLufs);
  add('Loudness and level', 'True peak', 'dBTP', '4× oversampled peak', r => r.peaks.truePeakDbtp);
  add('Dynamics', 'Loudness range', 'LU', 'Spread of loudness over the section (EBU 3342)', r => r.loudness.rangeLu);
  add('Dynamics', 'Crest factor', 'dB', 'Peak above RMS: higher means more transient detail', r => r.levels.crestFactorDb);
  add('Dynamics', 'Peak to loudness ratio', 'dB', 'True peak above integrated loudness', r => r.levels.plrDb);
  add('Stereo', 'Correlation', '', '+1 mono-like, 0 wide, negative out of phase', r => r.stereo?.correlation ?? null, { stereo: true });
  add('Stereo', 'Side relative to mid', 'dB', 'Width: higher means wider', r => r.stereo?.sideToMidDb ?? null, { stereo: true });
  add('Stereo', 'Loudness change in mono', 'LU', 'How much quieter the mono fold-down is', r => r.stereo?.monoLoudnessChangeDb ?? null, { stereo: true });

  // Tonal balance: each octave band's energy relative to the total of the bands both sections can
  // contain, so overall level and a higher sample rate's extra bands do not matter; differences are
  // shape differences.
  const centres = reference.spectrum.bands.map(band => band.centreHz).filter(centre => centre * Math.SQRT2 <= nyquist && original.spectrum.bands.some(band => band.centreHz === centre));
  const relativeLevels = report => {
    const shares = centres.map(centre => report.spectrum.bands.find(band => band.centreHz === centre)?.share ?? 0);
    const total = shares.reduce((sum, share) => sum + share, 0);
    return new Map(centres.map((centre, i) => [centre, total > 0 && shares[i] > 0 ? 10 * Math.log10(shares[i] / total) : null]));
  };
  const levels = new Map([reference, original, processed].filter(Boolean).map(report => [report, relativeLevels(report)]));
  if (!centres.length) conditions.push({ level: 'unsupported', text: 'A section is too short for the octave spectrum; tonal balance is not compared.' });
  for (const centre of centres) {
    const label = centre >= 1000 ? `${centre / 1000} kHz band` : `${centre} Hz band`;
    add('Tonal balance', label, 'dB', 'Band level relative to the total of the compared bands', report => levels.get(report).get(centre));
    const row = rows[rows.length - 1];
    row.centreHz = centre;
    if (row.originalDifference !== null && Math.abs(row.originalDifference) < SMALL_BAND_DIFFERENCE_DB) row.status = 'small';
  }
  const uncertain = conditions.some(condition => condition.level === 'uncertain');
  const notes = [...interpret(rows, stereoComparable, 'originalDifference', 'The mix'), ...(processed ? interpret(rows, stereoComparable, 'processedDifference', 'The processed mix') : [])];
  if (!notes.length) notes.push('No large differences were measured; judge by ear with the level-matched monitor.');
  const interpretations = notes.map(text => ({ text, confidence: uncertain ? 'uncertain' : 'indicative' }));
  return { rows, conditions, interpretations };
}

// Cautious readings of the measured differences of one version (key: 'originalDifference' or
// 'processedDifference'). They are interpretations, worded as such.
const signed = value => `${value > 0 ? '+' : ''}${value.toFixed(1).replace('-', '−')}`;
function interpret(rows, stereoComparable, key, subject) {
  const notes = [];
  const difference = measure => rows.find(row => row.measure === measure)?.[key] ?? null;
  const bands = rows.filter(row => row.group === 'Tonal balance' && row[key] !== null);
  const average = list => (list.length ? list.reduce((sum, row) => sum + row[key], 0) / list.length : null);
  const low = average(bands.filter(row => row.centreHz < 250));
  const high = average(bands.filter(row => row.centreHz >= 4000));
  if (low !== null && Math.abs(low) >= TONAL_INTERPRETATION_DB) notes.push(`${subject} has ${low > 0 ? 'more' : 'less'} relative energy below 250 Hz than the reference (${signed(low)} dB on average); it may sound ${low > 0 ? 'heavier or boomier' : 'lighter in the bass'}.`);
  if (high !== null && Math.abs(high) >= TONAL_INTERPRETATION_DB) notes.push(`${subject} has ${high > 0 ? 'more' : 'less'} relative energy above 4 kHz (${signed(high)} dB on average); it may sound ${high > 0 ? 'brighter or harsher' : 'darker or duller'}.`);
  const crest = difference('Crest factor');
  if (crest !== null && Math.abs(crest) >= 3) notes.push(`${subject}'s crest factor is ${Math.abs(crest).toFixed(1)} dB ${crest > 0 ? 'higher' : 'lower'}; it is likely ${crest > 0 ? 'more dynamic (less compressed)' : 'more compressed'} than the reference.`);
  const width = difference('Side relative to mid');
  if (stereoComparable && width !== null && Math.abs(width) >= 3) notes.push(`${subject} is ${width > 0 ? 'wider' : 'narrower'} than the reference (side/mid ${signed(width)} dB).`);
  return notes;
}

// Constant gains (dB, ≤ 0) that make the versions equally loud by turning the louder ones down to
// the quietest; nothing is turned up, so nothing clips. levels: { name: LUFS or null }; a version
// without a measurement plays unchanged.
export function matchLevels(levels) {
  const known = Object.values(levels).filter(lufs => lufs !== null && Number.isFinite(lufs));
  const quietest = Math.min(...known);
  return Object.fromEntries(Object.entries(levels).map(([name, lufs]) => [name, lufs === null || !Number.isFinite(lufs) ? 0 : round(quietest - lufs)]));
}
