import { EQ_PROPOSAL_SCHEMA, EQ_PROPOSAL_VERSION, createEqProposal, mergeEqProposal } from './eq-proposal.js';

// LAS-120: deterministic, EQ-only mastering suggestions derived from MEASURED octave-band levels
// (report.spectrum.bands, mps-analysis-1). No model is consulted: every item says so through
// `source`, and the UI must not claim otherwise. Each suggestion wraps a validated MPS EQ proposal
// (src/ai/eq-proposal.js), so the same guards, freshness and single-undo-step rules apply.
export const SUGGESTION_SOURCE = 'deterministic-measurement';
export const SUGGESTION_ALGORITHM = 'mps-suggest-eq-1';
const LIMITATION = 'Based on the whole-file average of octave-band levels, not on a time-resolved analysis; it cannot tell a deliberate arrangement choice from a fault. Judge it by ear at matched level.';

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

const disabled = (base, id, title, unsupportedReason) => ({ ...base, id, title, supported: false, unsupportedReason, evidence: [], reason: '', risk: '', filters: [], proposal: null });

// Returns [{ id, title, source, supported, unsupportedReason, evidence[], reason, risk, limitations,
// filters[], proposal, algorithm }]. Never throws for unsupported input: it returns disabled items.
export function buildSuggestions(report, { chain, sampleRate, projectId = null, mediaId = null }) {
  const bands = report?.spectrum?.bands ?? [];
  const base = { source: SUGGESTION_SOURCE, algorithm: SUGGESTION_ALGORITHM, limitations: LIMITATION };
  if (chain?.eq?.enabled === false) {
    return [disabled(base, 'eq-bypassed', 'Tonal balance', 'The EQ is bypassed, so an EQ suggestion would not be audible. Switch the EQ on, then measure again.')];
  }
  if (bands.length < 3) {
    return [disabled(base, 'no-spectrum', 'Tonal balance', 'The file is too short or silent to measure octave bands (about 0.2 s of audio is needed).')];
  }
  const items = [];
  for (const rule of RULES) {
    const measured = bandExcess(bands, rule.centreHz);
    if (!measured || measured.excessDb < rule.threshold) continue;
    const gain = -Math.min(3, Math.max(1, round(measured.excessDb / 2, 0.5)));
    const band = { frequency: rule.centreHz, gain, q: rule.q };
    const reason = `The ${rule.centreHz} Hz octave stands out by ${fmt(measured.excessDb)} dB against its neighbours; a gentle cut of ${fmt(-gain)} dB would reduce that difference.`;
    const item = {
      ...base, id: rule.id, title: rule.label, supported: true, unsupportedReason: '',
      evidence: [
        `Measured ${rule.centreHz} Hz octave band: ${fmt(measured.levelDb)} dB relative to the total.`,
        `Neighbouring octaves average ${fmt(measured.neighboursDb)} dB, so this band is ${fmt(measured.excessDb)} dB above them.`,
      ],
      reason, risk: rule.risk, filters: [{ type: 'bell', frequency: band.frequency, gain: band.gain, q: band.q }], proposal: null,
    };
    const cut = existingCutNear(chain, rule.centreHz);
    if (cut) {
      item.supported = false;
      item.unsupportedReason = `Your EQ already cuts near ${rule.centreHz} Hz (${fmt(cut.gain)} dB at ${cut.frequency} Hz). This measurement is of the original file, not of your processed settings, so another cut is not suggested.`;
      items.push(item);
      continue;
    }
    try {
      item.proposal = createEqProposal(
        { schema: EQ_PROPOSAL_SCHEMA, version: EQ_PROPOSAL_VERSION, scope: 'master', edits: editsFor(chain.eq.mode, band), reason, limitations: LIMITATION },
        { chain, projectId, mediaId, analysis: { algorithm: SUGGESTION_ALGORITHM, band: rule.centreHz, levelDb: measured.levelDb, neighboursDb: measured.neighboursDb } },
      );
      mergeEqProposal(chain, item.proposal, { sampleRate }); // refused here (guard, no free band) = unsupported
    } catch (failure) {
      item.supported = false;
      item.proposal = null;
      item.unsupportedReason = failure.message;
    }
    items.push(item);
  }
  if (!items.length) items.push(disabled(base, 'balanced', 'Tonal balance', 'No octave band stands out from its neighbours by more than the suggestion thresholds, so no EQ change is suggested.'));
  return items;
}
