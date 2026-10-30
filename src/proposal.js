import { defaultChain, validateChain } from './dsp/chain-params.js';
import { designBand } from './dsp/eq-design.js';
import { biquadResponseDb } from './dsp/biquad.js';
import { compareToReference } from './reference-comparison.js';

// Reference-guided mastering proposal (LAS-32). From the measured differences between a mix section
// and a reference section (LAS-31) it builds a complete chain for the validated processors (LAS-27):
// EQ bells fitted to the octave-band shape difference, then compressor and limiter settings chosen
// by rendering the section and measuring it. Every module states its measured reason, values,
// supported range and uncertainty; documented guards bound every move. It is a starting point from
// measurements of one section, not a recovery of how the reference was mastered.
export const PROPOSAL_VERSION = 'mps-proposal-1';
export const GUARDS = Object.freeze({
  bandBoostDb: 4, // largest boost of one EQ band
  bandCutDb: -6, // deepest cut of one EQ band
  totalBoostDb: 6, // largest boost of the combined EQ curve at any frequency
  noBoostBelowHz: 40, // no boost of the sub-bass (headroom, small speakers)
  minBellGainDb: 0.5, // smaller bells are left out
  eqRefinements: 2, // render-and-measure passes that refine the EQ before dynamics (one more after)
  rangeDifferenceLu: 2, // loudness-range difference that starts a compression proposal
  minRangeImprovementLu: 0.5, // compression is kept only if it brings the range this much closer
  ratios: [1.5, 2, 2.5, 3], // compressor ratios tried, gentlest first; 3 is the guard
  maxCompressorReductionDb: 6, // largest compressor gain reduction measured on the section
  loudnessDifferenceDb: 0.5, // loudness difference worth proposing input gain for
  maxInputGainDb: 12,
  maxLimiterReductionDb: 6, // largest limiter gain reduction measured on the section
  ceilingDbtp: -1,
});
const OCTAVE_Q = Math.SQRT2; // a bell about one octave wide, like the measured bands
const COMPRESSOR = { attack: 30, release: 300, knee: 6, makeup: 0, detector: 'rms' }; // slow: macro dynamics

const round1 = value => Math.round(value * 10) / 10 || 0; // never −0
// Typographic minus before digits in the texts shown to the user.
const typeset = text => text.replace(/-(?=\d)/g, '−');
const signed = value => `${value > 0 ? '+' : ''}${value.toFixed(1).replace('-', '−')}`;
const hz = f => (f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`);
const bell = (frequency, gain) => ({ enabled: true, type: 'bell', frequency, gain, q: OCTAVE_Q });

// Power-average gain (dB) of the filters over one octave around `centre`, the way the analysis
// measures a band (flat spectrum assumed inside the band).
function octaveGainDb(designs, centre, sampleRate) {
  const points = 16;
  let sum = 0;
  for (let i = 0; i < points; i++) {
    const f = (centre / Math.SQRT2) * 2 ** ((i + 0.5) / points);
    sum += 10 ** (designs.reduce((db, coefficients) => db + biquadResponseDb(coefficients, f, sampleRate), 0) / 10);
  }
  return 10 * Math.log10(sum / points);
}

// The combined curve's largest boost, on a log grid up to the run-time frequency limit.
function largestBoostDb(designs, sampleRate) {
  const top = Math.min(20000, 0.45 * sampleRate);
  let largest = -Infinity;
  for (let i = 0; i <= 200; i++) {
    const f = 20 * (top / 20) ** (i / 200);
    largest = Math.max(largest, designs.reduce((db, coefficients) => db + biquadResponseDb(coefficients, f, sampleRate), 0));
  }
  return largest;
}

// EQ: one bell per compared octave band, with gains fitted so that the octave-average change
// equals `targets` (dB per band), within the band and curve guards. The analysis measures each band
// relative to the total, so the whole shape is corrected, not only the largest differences.
export function fitEq(centres, targets, sampleRate) {
  const ceilingFor = centre => (centre < GUARDS.noBoostBelowHz ? 0 : GUARDS.bandBoostDb);
  const limit = (i, gain) => Math.max(GUARDS.bandCutDb, Math.min(ceilingFor(centres[i]), gain));
  const designsOf = gains => centres.map((centre, i) => designBand(bell(centre, gains[i]), sampleRate));
  let gains = targets.map((target, i) => limit(i, target));
  for (let step = 0; step < 16; step++) {
    const designs = designsOf(gains);
    gains = gains.map((gain, i) => limit(i, gain + targets[i] - octaveGainDb(designs, centres[i], sampleRate)));
  }
  let scale = 1;
  const boosted = () => largestBoostDb(designsOf(gains.map(g => (g > 0 ? g * scale : g))), sampleRate);
  while (boosted() > GUARDS.totalBoostDb + 1e-9 && scale > 0.05) scale *= 0.95;
  gains = gains.map(g => round1(g > 0 ? g * scale : g));
  return { bands: centres.map((centreHz, i) => ({ centreHz, gain: gains[i] })).filter(band => Math.abs(band.gain) >= GUARDS.minBellGainDb), scaled: scale < 1 ? scale : null };
}

// Guard notes for the measured shape (first targets) and the final fit.
function eqGuardNotes(centres, targets, fit) {
  const notes = [];
  targets.forEach((target, i) => {
    const centre = centres[i];
    if (target > 0.5 && centre < GUARDS.noBoostBelowHz) notes.push(`${hz(centre)}: the measured shape asks for ${signed(target)} dB; no boost below ${GUARDS.noBoostBelowHz} Hz.`);
    else if (target > GUARDS.bandBoostDb) notes.push(`${hz(centre)}: the measured shape asks for ${signed(target)} dB; boosts stop at +${GUARDS.bandBoostDb} dB.`);
    else if (target < GUARDS.bandCutDb) notes.push(`${hz(centre)}: the measured shape asks for ${signed(target)} dB; cuts stop at ${GUARDS.bandCutDb} dB.`);
  });
  if (fit.scaled) notes.push(`Boosts scaled to ${Math.round(fit.scaled * 100)} % so the combined curve stays within +${GUARDS.totalBoostDb} dB.`);
  return notes;
}

function chainWith(eqBands, compressor, inputGain) {
  const params = defaultChain();
  eqBands.forEach((band, i) => {
    const filter = bell(band.centreHz, band.gain);
    params.eq.left[i] = { ...filter };
    params.eq.right[i] = { ...filter };
  });
  params.compressor = compressor ? { enabled: true, ...COMPRESSOR, threshold: compressor.threshold, ratio: compressor.ratio } : { ...params.compressor, enabled: false };
  params.limiter = { ...params.limiter, enabled: true, ceiling: GUARDS.ceilingDbtp, inputGain };
  return validateChain(params);
}

const conditionText = comparison => comparison.conditions.filter(c => c.level !== 'note').map(c => c.text);

// Guards a render of the whole chain must meet.
function exceededGuards(render) {
  return [
    render.meters.maxCompressorGainReductionDb > GUARDS.maxCompressorReductionDb + 1e-9 && 'compressor gain reduction',
    render.meters.maxLimiterGainReductionDb > GUARDS.maxLimiterReductionDb + 1e-9 && 'limiter gain reduction',
    render.report.peaks.truePeakDbtp > GUARDS.ceilingDbtp + 0.1 && 'true peak',
  ].filter(Boolean);
}

// reference, original: analysis reports of the two sections; renderSection(params) renders the mix
// section with those settings and returns { report, meters } (meters from renderChain).
// Steps: EQ fitted and refined by measurement → compressor only if it measurably brings the
// loudness range closer → limiter input gain towards the reference's loudness → one EQ refinement with the
// dynamics in place, with the dynamics brought back inside their guards → final render.
export function proposeChain({ reference, original, sampleRate, renderSection, onProgress = () => {} }) {
  const comparison = compareToReference(reference, original);
  const shared = conditionText(comparison);
  const row = measure => comparison.rows.find(r => r.measure === measure);

  // EQ: fit to the measured shape, then refine by rendering and measuring the section.
  const tonal = comparison.rows.filter(r => r.group === 'Tonal balance' && r.originalDifference !== null);
  const centres = tonal.map(r => r.centreHz);
  const measuredTargets = tonal.map(r => -r.originalDifference);
  let targets = [...measuredTargets];
  let eq = fitEq(centres, targets, sampleRate);
  // Moves the targets by the shape difference still measured in a render of the section.
  const refine = rendered => {
    const after = compareToReference(reference, original, rendered.report).rows;
    targets = targets.map((target, i) => target - (after.find(r => r.centreHz === centres[i])?.processedDifference ?? 0));
    eq = fitEq(centres, targets, sampleRate);
  };
  for (let pass = 0; pass < GUARDS.eqRefinements; pass++) {
    onProgress(`Refining the EQ by measurement (${pass + 1} of ${GUARDS.eqRefinements})…`, 0.05 + 0.05 * pass);
    refine(renderSection(chainWith(eq.bands, null, 0)));
  }
  onProgress('Measuring the section with the proposed EQ…', 0.15);
  const eqOnly = renderSection(chainWith(eq.bands, null, 0));

  // Compressor: a mastering compressor changes the loudness range (EBU 3342), so it is tried only
  // when the mix's range is clearly wider than the reference's, and kept only if the rendered
  // section's range comes measurably closer. (Peak density is the limiter's job.)
  const range = row('Loudness range').originalDifference;
  const goal = reference.loudness.rangeLu;
  const compressorNotes = [];
  let compressorReason;
  let compressor = null;
  let compressed = eqOnly;
  if (range === null) compressorReason = 'Loudness range could not be measured for these sections; compression is not considered.';
  else if (range <= -GUARDS.rangeDifferenceLu) compressorReason = `The mix's loudness range is ${Math.abs(range).toFixed(1)} LU narrower than the reference's: it is already more compressed, and compression cannot restore range.`;
  else if (range < GUARDS.rangeDifferenceLu) compressorReason = `Loudness range within ${GUARDS.rangeDifferenceLu} LU of the reference (${signed(range)} LU).`;
  else {
    compressorReason = `The mix's loudness range is ${range.toFixed(1)} LU wider than the reference's (${original.loudness.rangeLu.toFixed(1)} against ${goal.toFixed(1)} LU).`;
    // Threshold halfway into the section's range, so the loud passages are compressed and the quiet ones not.
    const threshold = Math.max(-60, Math.min(0, Math.round(eqOnly.report.levels.rmsDbfs - eqOnly.report.loudness.rangeLu / 2)));
    const distance = render => Math.abs((render.report.loudness.rangeLu ?? Infinity) - goal);
    let best = null;
    for (const [i, ratio] of GUARDS.ratios.entries()) {
      onProgress(`Trying compression ratio ${ratio}…`, 0.2 + 0.08 * i);
      const trial = renderSection(chainWith(eq.bands, { threshold, ratio }, 0));
      if (trial.meters.maxCompressorGainReductionDb > GUARDS.maxCompressorReductionDb) {
        compressorNotes.push(`Ratio ${ratio} would reduce the gain by ${trial.meters.maxCompressorGainReductionDb.toFixed(1)} dB (guard ${GUARDS.maxCompressorReductionDb} dB); not used.`);
        break;
      }
      if (!best || distance(trial) < distance(best.render)) best = { ratio, render: trial };
    }
    if (best && distance(eqOnly) - distance(best.render) >= GUARDS.minRangeImprovementLu) {
      compressor = { threshold, ratio: best.ratio };
      compressed = best.render;
      if (best.ratio === GUARDS.ratios.at(-1) && distance(best.render) > GUARDS.minRangeImprovementLu) compressorNotes.push(`Ratio stops at ${best.ratio}: matching the reference's range would need more compression than the guard allows.`);
    } else {
      compressorNotes.push(`With the guarded settings, compression did not bring the loudness range ${GUARDS.minRangeImprovementLu} LU closer (best: ${eqOnly.report.loudness.rangeLu.toFixed(1)} → ${(best?.render ?? eqOnly).report.loudness.rangeLu.toFixed(1)} LU against ${goal.toFixed(1)} LU), so it is not proposed.`);
    }
  }

  // Limiter input gain: towards the reference's loudness, within the limiter guard.
  const needed = reference.loudness.integratedLufs - compressed.report.loudness.integratedLufs;
  const limiterNotes = [];
  let limiterReason;
  let inputGain = 0;
  let checked = { params: chainWith(eq.bands, compressor, 0), render: compressed }; // settings whose render met the guards
  if (needed < -GUARDS.loudnessDifferenceDb) limiterReason = `With this chain the mix section is ${Math.abs(needed).toFixed(1)} LU louder than the reference. The chain has no output trim (master level is not implemented), so nothing is proposed; the comparison stays level-matched.`;
  else if (needed <= GUARDS.loudnessDifferenceDb) limiterReason = `Loudness within ${GUARDS.loudnessDifferenceDb} LU of the reference (${signed(needed)} LU).`;
  else {
    limiterReason = `With this chain the mix section is ${needed.toFixed(1)} LU quieter than the reference (${compressed.report.loudness.integratedLufs.toFixed(1)} against ${reference.loudness.integratedLufs.toFixed(1)} LUFS).`;
    const crest = row('Crest factor').originalDifference;
    if (crest !== null && crest >= 2) limiterReason += ` Its crest factor is ${crest.toFixed(1)} dB higher: limiting raises the density with the peaks held at the ceiling.`;
    if (needed > GUARDS.maxInputGainDb) limiterNotes.push(`Input gain stops at ${GUARDS.maxInputGainDb} dB.`);
    let gain = Math.min(needed, GUARDS.maxInputGainDb);
    for (let step = 0; step < 5; step++) {
      onProgress(`Setting the limiter input gain (${round1(gain)} dB)…`, 0.55 + 0.05 * step);
      const trial = renderSection(chainWith(eq.bands, compressor, round1(gain)));
      const excess = trial.meters.maxLimiterGainReductionDb - GUARDS.maxLimiterReductionDb;
      if (excess > 0) {
        if (!limiterNotes.some(note => note.startsWith('Input gain limited'))) limiterNotes.push(`Input gain limited so that the limiter reduces the gain by at most ${GUARDS.maxLimiterReductionDb} dB.`);
        gain = Math.max(0, gain - excess - 0.2);
        continue;
      }
      if (round1(gain) > 0) {
        inputGain = round1(gain);
        checked = { params: chainWith(eq.bands, compressor, inputGain), render: trial };
      }
      const missing = reference.loudness.integratedLufs - trial.report.loudness.integratedLufs;
      if (Math.abs(missing) < 0.3 || gain >= GUARDS.maxInputGainDb) break;
      gain = Math.max(0, Math.min(GUARDS.maxInputGainDb, gain + missing));
    }
  }

  // One more EQ refinement with the dynamics in place (dynamics shift the band balance); then the
  // dynamics are brought back inside their guards for the refined EQ. If that fails, the checked
  // settings are kept.
  onProgress('Refining the EQ with the dynamics in place…', 0.85);
  const eqChecked = eq;
  refine(checked.render);
  let final = renderSection(chainWith(eq.bands, compressor, inputGain));
  const eqNotes = [];
  const newly = render => exceededGuards(render).filter(guard => !exceededGuards(checked.render).includes(guard));
  for (let fix = 0; fix < 2 && newly(final).length; fix++) {
    onProgress('Keeping the dynamics inside their guards…', 0.9 + 0.02 * fix);
    const compressorExcess = final.meters.maxCompressorGainReductionDb - GUARDS.maxCompressorReductionDb;
    if (compressor && compressorExcess > 0) compressor = { ...compressor, threshold: Math.min(0, compressor.threshold + Math.ceil((compressorExcess * compressor.ratio) / (compressor.ratio - 1))) };
    const limiterExcess = final.meters.maxLimiterGainReductionDb - GUARDS.maxLimiterReductionDb;
    if (limiterExcess > 0) inputGain = round1(Math.max(0, inputGain - limiterExcess - 0.2));
    final = renderSection(chainWith(eq.bands, compressor, inputGain));
  }
  if (newly(final).length) {
    eqNotes.push(`The last EQ refinement was not used: it would push the ${newly(final).join(' and ')} past its guard.`);
    eq = eqChecked;
    compressor = checked.params.compressor.enabled ? { threshold: checked.params.compressor.threshold, ratio: checked.params.compressor.ratio } : null;
    inputGain = checked.params.limiter.inputGain;
    final = checked.render;
  }
  const params = chainWith(eq.bands, compressor, inputGain);

  // Modules, described from the final settings and the final render.
  const modules = [
    {
      module: 'EQ',
      status: eq.bands.length ? 'proposed' : 'not proposed',
      reasons: tonal.some(r => Math.abs(r.originalDifference) >= GUARDS.minBellGainDb)
        ? tonal.filter(r => Math.abs(r.originalDifference) >= GUARDS.minBellGainDb).map(r => `${r.measure}: ${signed(r.originalDifference)} dB relative to the reference`)
        : [`No octave band differs by ${GUARDS.minBellGainDb} dB or more.`],
      values: eq.bands.map(band => `${hz(band.centreHz)} bell, Q ${OCTAVE_Q.toFixed(2)}, ${signed(band.gain)} dB`),
      range: `Each band ${GUARDS.bandCutDb}…+${GUARDS.bandBoostDb} dB, no boost below ${GUARDS.noBoostBelowHz} Hz, combined curve at most +${GUARDS.totalBoostDb} dB; bells under ${GUARDS.minBellGainDb} dB are left out. Afterwards every band can be edited (−18…+18 dB).`,
      guardNotes: [...eqGuardNotes(centres, measuredTargets, eq), ...eqNotes],
      uncertainty: [...shared, 'Octave averages of one section: narrow resonances and changes over the song are not seen.'],
    },
    {
      module: 'Compressor',
      status: compressor ? 'proposed' : 'not proposed',
      reasons: [compressorReason],
      values: compressor ? [`threshold ${compressor.threshold} dBFS (halfway into the section's range), ratio ${compressor.ratio}, attack ${COMPRESSOR.attack} ms, release ${COMPRESSOR.release} ms, knee ${COMPRESSOR.knee} dB, RMS detector`, `in the final check: loudness range ${original.loudness.rangeLu.toFixed(1)} → ${final.report.loudness.rangeLu.toFixed(1)} LU (reference ${goal.toFixed(1)}), largest gain reduction ${final.meters.maxCompressorGainReductionDb.toFixed(1)} dB`] : [],
      range: `Ratio ${GUARDS.ratios[0]}–${GUARDS.ratios.at(-1)} (guard), at most ${GUARDS.maxCompressorReductionDb} dB gain reduction on this section; afterwards editable (ratio 1–20).`,
      guardNotes: compressorNotes,
      uncertainty: [...shared, 'Loudness range of one section (3 s windows) describes macro dynamics only; punch and transients are judged by ear.'],
    },
    {
      module: 'Limiter',
      status: inputGain > 0 ? 'proposed' : 'not proposed',
      reasons: [limiterReason],
      values: inputGain > 0 ? [`input gain ${signed(inputGain)} dB, ceiling ${GUARDS.ceilingDbtp} dBTP, release 100 ms`, `in the final check: loudness ${final.report.loudness.integratedLufs.toFixed(1)} LUFS (reference ${reference.loudness.integratedLufs.toFixed(1)}), largest limiter gain reduction ${final.meters.maxLimiterGainReductionDb.toFixed(1)} dB, true peak ${final.report.peaks.truePeakDbtp.toFixed(1)} dBTP`] : [],
      range: `Input gain 0–${GUARDS.maxInputGainDb} dB, at most ${GUARDS.maxLimiterReductionDb} dB limiter gain reduction on this section, ceiling ${GUARDS.ceilingDbtp} dBTP.`,
      guardNotes: limiterNotes,
      uncertainty: [...shared, 'Integrated loudness of one section; louder is not better, and listening stays level-matched.'],
    },
  ];
  const width = row('Side relative to mid').originalDifference;
  const correlation = original.stereo?.correlation ?? null;
  modules.push({
    module: 'Width',
    status: 'not proposed',
    reasons: [width === null ? 'Width is not compared for these sections.' : `The mix's side/mid is ${signed(width)} dB relative to the reference.`, 'The chain has no width processor yet (Space is planned), so nothing is proposed.'],
    values: [],
    range: '—',
    guardNotes: correlation !== null && correlation < 0 ? [`The mix's correlation is ${correlation.toFixed(2)}: check mono compatibility before mastering.`] : [],
    uncertainty: [...shared, 'Side/mid of one section; width is judged by ear.'],
  });

  const texts = list => list.map(typeset);
  return {
    version: PROPOSAL_VERSION,
    params,
    modules: modules.map(m => ({ ...m, reasons: texts(m.reasons), values: texts(m.values), guardNotes: texts(m.guardNotes), range: typeset(m.range), uncertainty: texts(m.uncertainty) })),
    evaluation: evaluate(reference, original, final),
    note: 'A starting point from measurements of one section with the studio\'s own processors. It does not recover how the reference was mastered.',
  };
}

// Numerical check of a rendered proposal against the reference: distances before and after.
export function evaluate(reference, original, rendered) {
  const comparison = compareToReference(reference, original, rendered.report);
  const pick = measure => comparison.rows.find(r => r.measure === measure);
  const tonal = comparison.rows.filter(r => r.group === 'Tonal balance');
  const largest = key => tonal.reduce((max, r) => (r[key] === null ? max : Math.max(max, Math.abs(r[key]))), 0);
  const line = (name, measure, unit) => ({ name, unit, before: pick(measure).originalDifference, after: pick(measure).processedDifference });
  return {
    rows: [
      { name: 'Largest octave-band difference', unit: 'dB', before: round1(largest('originalDifference')), after: round1(largest('processedDifference')) },
      line('Integrated loudness difference', 'Integrated loudness', 'LU'),
      line('Crest factor difference', 'Crest factor', 'dB'),
      line('Loudness range difference', 'Loudness range', 'LU'),
    ],
    truePeakDbtp: rendered.report.peaks.truePeakDbtp,
    compressorReductionDb: rendered.meters.maxCompressorGainReductionDb,
    limiterReductionDb: rendered.meters.maxLimiterGainReductionDb,
  };
}

// The proposal at a strength from 0 to 1: EQ gains and limiter input gain scale linearly, the
// compressor ratio moves from 1 towards the proposed ratio. Every result stays inside the guards.
export function atStrength(params, strength) {
  const s = Math.max(0, Math.min(1, strength));
  const scaleBand = band => (band.enabled && band.type === 'bell' ? { ...band, gain: round1(band.gain * s) } : band);
  return validateChain({
    ...params,
    eq: { ...params.eq, left: params.eq.left.map(scaleBand), right: params.eq.right.map(scaleBand) },
    compressor: { ...params.compressor, ratio: Math.round((1 + (params.compressor.ratio - 1) * s) * 100) / 100 },
    limiter: { ...params.limiter, inputGain: round1(params.limiter.inputGain * s) },
  });
}
