import { EQ_PROPOSAL_SCHEMA, EQ_PROPOSAL_VERSION, chainRevision, createEqProposal, mergeEqProposal } from './eq-proposal.js';

// LAS-120: deterministic, EQ-only mastering suggestions derived from MEASURED octave-band levels
// (report.spectrum.bands, mps-analysis-1). No model is consulted: every item says so through
// `source`, and the UI must not claim otherwise. Each suggestion wraps a validated MPS EQ proposal
// (src/ai/eq-proposal.js), so the same guards, freshness and single-undo-step rules apply.
export const SUGGESTION_SOURCE = 'deterministic-measurement';
export const SUGGESTION_ALGORITHM = 'mps-suggest-eq-2';
const LIMITATION = 'Based on the whole-file average of octave-band levels (relative to the total), not on a time-resolved analysis; it cannot tell a deliberate arrangement choice from a fault. Judge it by ear at matched level.';

// Each rule compares one octave band with the mean level of its two neighbours.
const RULES = [
  { id: 'low-mid-buildup', centreHz: 250, label: 'Low-mid build-up (250 Hz)', threshold: 3, q: 1, risk: 'A cut here can thin the body of vocals and guitars; check the track at matched level.' },
  { id: 'boxiness', centreHz: 500, label: 'Boxiness (500 Hz)', threshold: 3.5, q: 1, risk: 'Cutting 500 Hz can make a mix sound hollow if the build-up is part of the arrangement.' },
  { id: 'upper-mid-harshness', centreHz: 4000, label: 'Upper-mid prominence (4 kHz)', threshold: 4, q: 1.2, risk: 'A cut can reduce vocal presence and clarity; the energy may be an intended lead instrument.' },
];

const round = (value, step) => Math.round(value / step) * step;
const fmt = value => value.toFixed(1).replace('-', '−');

export function bandExcess(bands, centreHz) {
  const at = bands.findIndex(b => b.centreHz === centreHz);
  if (at <= 0 || at >= bands.length - 1) return null;
  const trio = [bands[at - 1], bands[at], bands[at + 1]];
  if (trio.some(b => typeof b.levelDb !== 'number' || !Number.isFinite(b.levelDb))) return null;
  const neighboursDb = (trio[0].levelDb + trio[2].levelDb) / 2;
  return { levelDb: trio[1].levelDb, neighboursDb, excessDb: trio[1].levelDb - neighboursDb };
}

// Stopgap against stacking (LAS-120): the measurement is of the ORIGINAL file, not of the processed
// chain, so after a cut is applied the same excess is still measured. A suggestion is therefore not
// offered while an enabled cut (bell or shelf, gain < 0) already sits within half an octave of the
// rule's centre in any EQ channel. Returns that band, or null.
const NEAR_OCTAVES = 0.5;
const CUT_TYPES = new Set(['bell', 'low-shelf', 'high-shelf']);
export function existingCutNear(chain, centreHz) {
  for (const channel of ['left', 'right']) {
    const band = (chain?.eq?.[channel] ?? []).find(b => b.enabled && CUT_TYPES.has(b.type) && b.gain < 0
      && Math.abs(Math.log2(b.frequency / centreHz)) <= NEAR_OCTAVES);
    if (band) return band;
  }
  return null;
}

// LAS-174: the low octaves have no neighbour on one side (31.5 Hz) or are routinely shaped on purpose,
// so they never get an automatic cut. Instead the measured change between the original file and the
// processed chain is reported as an optional check. Band levels are relative to the total, so this is a
// before/after comparison of tonal share, not an absolute level.
export const LOW_BAND_CENTRES = [31.5, 63, 125];
export const LOW_BAND_CHANGE_DB = 3; // smaller measured changes are not reported
const LOW_BAND_FLOOR_DB = -40; // bands this far under the total are too small to compare reliably
const QUIET_RMS_DBFS = -70; // below this the measurement is noise, not a tonal balance

export function lowBandChanges(original, processed) {
  const changes = [];
  for (const centreHz of LOW_BAND_CENTRES) {
    const before = original?.spectrum?.bands?.find(b => b.centreHz === centreHz)?.levelDb;
    const after = processed?.spectrum?.bands?.find(b => b.centreHz === centreHz)?.levelDb;
    if (![before, after].every(v => typeof v === 'number' && Number.isFinite(v))) continue;
    if (Math.max(before, after) < LOW_BAND_FLOOR_DB) continue;
    const deltaDb = after - before;
    if (Math.abs(deltaDb) >= LOW_BAND_CHANGE_DB) changes.push({ centreHz, beforeDb: before, afterDb: after, deltaDb });
  }
  return changes;
}

// Level-matched A/B for a suggestion (LAS-120). differenceDb = B − A in LUFS. Nothing is ever boosted:
// the louder side is turned down to the quieter one, so B plays lower when it is louder and A plays
// lower when B is quieter (the usual case, since every suggestion is a cut). Unknown → no trim.
export function comparisonTrimDb(side, differenceDb) {
  if (typeof differenceDb !== 'number' || !Number.isFinite(differenceDb)) return 0;
  const louder = side === 'B' ? differenceDb : -differenceDb;
  return louder > 0 ? -louder : 0;
}

// A suggestion A/B is only real while its side is what plays (LAS-120). A needs the preview slot left
// free so the committed settings play; B needs the slot held by the suggestion's own owner. Another
// owner in the slot (a reference proposal preview) or a reset (Compare with a reference) interrupts it,
// so the A/B trim never lands on someone else's audio.
export function comparisonInterrupted(side, holder, owner) {
  if (side === 'A') return holder !== null && holder !== owner;
  return holder !== owner;
}

// Linked edits in 'link' mode, otherwise one edit per channel.
const editsFor = (mode, band) => (mode === 'link'
  ? [{ channel: 'linked', index: null, enabled: true, type: 'bell', ...band }]
  : ['left', 'right'].map(channel => ({ channel, index: null, enabled: true, type: 'bell', ...band })));

const unavailable = (base, id, title, unsupportedReason) => ({ ...base, id, kind: 'unavailable', title, supported: false, unsupportedReason, evidence: [], reason: '', risk: '', filters: [], proposal: null });

const NONE_MESSAGE = 'No evidence-based EQ change suggested for the measured signal.';
const hz = value => (value >= 1000 ? `${value / 1000} kHz` : `${value} Hz`);

// report: { original, processed } from the render worker's 'suggest' mode (LAS-174): the analysis of the
// file and of the same file rendered through the current chain. A bare analysis report (the original
// only) is still accepted. Rules judge what is heard, the processed spectrum, when it is known.
// Returns [{ id, kind: 'proposal' | 'observation' | 'none' | 'unavailable', title, source, supported,
// unsupportedReason, evidence[], reason, risk, limitations, filters[], proposal, algorithm, provenance }].
// Never throws for unsupported input: it returns an unavailable item with the reason.
export function buildSuggestions(report, { chain, sampleRate, projectId = null, mediaId = null }) {
  const processed = report?.processed ?? null;
  const original = report?.original ?? (processed ? null : report);
  const measured = processed ?? original;
  const bands = measured?.spectrum?.bands ?? [];
  const provenance = {
    measuredOn: processed ? 'processed' : 'original',
    sampleRate: measured?.input?.sampleRate ?? sampleRate ?? null,
    durationSeconds: measured?.input?.duration ?? null,
    chainRevision: chain ? chainRevision(chain) : null,
    projectId, mediaId,
  };
  const base = { source: SUGGESTION_SOURCE, algorithm: SUGGESTION_ALGORITHM, limitations: LIMITATION, provenance };
  if (chain?.eq?.enabled === false) {
    return [unavailable(base, 'eq-bypassed', 'Tonal balance', 'The EQ is bypassed, so an EQ suggestion would not be audible. Switch the EQ on, then measure again.')];
  }
  if (bands.length < 3) {
    return [unavailable(base, 'no-spectrum', 'Tonal balance', 'The file is too short to measure octave bands (about 0.2 s of audio is needed).')];
  }
  const rms = measured?.levels?.rmsDbfs;
  const silent = bands.every(b => typeof b.levelDb !== 'number') || (measured?.levels && (rms === null || rms < QUIET_RMS_DBFS));
  if (silent) {
    return [unavailable(base, 'silent', 'Tonal balance', 'The measured audio is silent or too quiet to judge a tonal balance, so no EQ suggestion can be made.')];
  }
  const items = [];
  for (const rule of RULES) {
    const found = bandExcess(bands, rule.centreHz);
    if (!found || found.excessDb < rule.threshold) continue;
    const gain = -Math.min(3, Math.max(1, round(found.excessDb / 2, 0.5)));
    const band = { frequency: rule.centreHz, gain, q: rule.q };
    const side = processed ? 'After your current settings, the' : 'The';
    const reason = `${side} ${rule.centreHz} Hz octave stands out by ${fmt(found.excessDb)} dB against its neighbours; a gentle cut of ${fmt(-gain)} dB would reduce that difference.`;
    const evidence = [
      `Measured ${rule.centreHz} Hz octave band${processed ? ' (processed)' : ''}: ${fmt(found.levelDb)} dB relative to the total.`,
      `Neighbouring octaves average ${fmt(found.neighboursDb)} dB, so this band is ${fmt(found.excessDb)} dB above them.`,
    ];
    const before = original ? bandExcess(original.spectrum?.bands ?? [], rule.centreHz) : null;
    if (processed && before) evidence.push(`Original file: ${fmt(before.levelDb)} dB (${fmt(before.excessDb)} dB above its neighbours); your settings change this band by ${fmt(found.levelDb - before.levelDb)} dB.`);
    const item = {
      ...base, id: rule.id, kind: 'proposal', title: rule.label, supported: true, unsupportedReason: '',
      evidence, reason, risk: rule.risk, filters: [{ type: 'bell', frequency: band.frequency, gain: band.gain, q: band.q }], proposal: null,
    };
    const cut = existingCutNear(chain, rule.centreHz);
    if (cut) {
      item.supported = false;
      item.unsupportedReason = `Your EQ already cuts near ${rule.centreHz} Hz (${fmt(cut.gain)} dB at ${cut.frequency} Hz), so another cut is not suggested on top of it.`;
      items.push(item);
      continue;
    }
    try {
      item.proposal = createEqProposal(
        { schema: EQ_PROPOSAL_SCHEMA, version: EQ_PROPOSAL_VERSION, scope: 'master', edits: editsFor(chain.eq.mode, band), reason, limitations: LIMITATION },
        { chain, projectId, mediaId, analysis: { algorithm: SUGGESTION_ALGORITHM, band: rule.centreHz, levelDb: found.levelDb, neighboursDb: found.neighboursDb, measuredOn: provenance.measuredOn } },
      );
      mergeEqProposal(chain, item.proposal, { sampleRate }); // refused here (guard, no free band) = unsupported
    } catch (failure) {
      item.supported = false;
      item.proposal = null;
      item.unsupportedReason = failure.message;
    }
    items.push(item);
  }
  // Low end: a measured before/after of the user's own settings, never a cut (LAS-174).
  const changes = processed && original ? lowBandChanges(original, processed) : [];
  if (changes.length) {
    items.push({
      ...base, id: 'low-end-change', kind: 'observation', title: 'Low end changed by your settings (optional check)', supported: false, unsupportedReason: '',
      evidence: changes.map(c => `${hz(c.centreHz)} octave: ${fmt(c.beforeDb)} dB in the original, ${fmt(c.afterDb)} dB after your settings (${c.deltaDb > 0 ? '+' : '−'}${fmt(Math.abs(c.deltaDb)).replace('−', '')} dB relative to the total).`),
      reason: 'Your current settings change the low octaves noticeably. This is an observation, not a fault: a low-end lift or cut may be exactly what you want, so no change is suggested.',
      risk: '', filters: [], proposal: null,
    });
  }
  if (!items.some(item => item.kind === 'proposal')) {
    items.push({
      ...base, id: 'balanced', kind: 'none', title: 'Tonal balance', supported: false, unsupportedReason: '', message: NONE_MESSAGE,
      evidence: [
        `Assessed${processed ? ' after your current settings' : ''}: the ${hz(250)}, ${hz(500)} and ${hz(4000)} octaves against the average of their neighbouring octaves.`,
        `Assessed: the ${LOW_BAND_CENTRES.map(hz).join(', ')} octaves for change introduced by your settings${processed ? '' : ' (not available: only the original file was measured)'}.`,
      ],
      reason: 'The measured octave bands do not differ from their neighbours by more than the suggestion thresholds. This does not mean the mix is ideal.', risk: '', filters: [], proposal: null,
    });
  }
  return items;
}
