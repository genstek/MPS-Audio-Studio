import { BANDS_PER_CHANNEL, BAND_TYPES, BOUNDS, resolveForSampleRate, serializeChain, validateChain } from '../dsp/chain-params.js';
import { designBand } from '../dsp/eq-design.js';
import { GUARDS, largestBoostDb } from '../proposal.js';

// MPS-AI-01: typed, EQ-only proposal contract for the future AI Co-Producer. Everything that
// comes from a model is untrusted data: it is validated field by field (unknown fields, non-finite
// numbers, bad enumerations are refused), never evaluated, and merged into a fresh copy of the
// committed chain. Nothing here touches audio, the network or the project.
export const EQ_PROPOSAL_SCHEMA = 'mps-ai-eq-proposal';
export const EQ_PROPOSAL_VERSION = 1;
export const EQ_CHANNELS = ['linked', 'left', 'right'];
export const PROVIDERS = ['openai', 'anthropic', 'google-gemini', 'xai-grok']; // adapter contract only; no live calls (MPS-AI-03)
const MAX_EDITS = BANDS_PER_CHANNEL * 2;
const MAX_TEXT = 1000;
const PAYLOAD_KEYS = ['schema', 'version', 'scope', 'edits', 'reason', 'limitations'];
const EDIT_KEYS = ['channel', 'index', 'enabled', 'type', 'frequency', 'gain', 'q'];

export class EqProposalError extends Error {
  constructor(message, code = 'invalid') {
    super(message);
    this.code = code; // invalid | no-free-band | guard | stale
    this.recoverable = true;
  }
}

const fail = (message, code) => { throw new EqProposalError(message, code); };
const isPlain = value => value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));

function noUnknown(object, allowed, where) {
  for (const key of Object.keys(object)) if (!allowed.includes(key)) fail(`${where} has an unknown field “${key}”.`);
}

function text(value, where) {
  if (typeof value !== 'string' || !value.trim() || value.length > MAX_TEXT) fail(`${where} must be 1–${MAX_TEXT} characters of text.`);
  return value;
}

function validateEdit(edit, at) {
  if (!isPlain(edit)) fail(`${at} must be an object.`);
  noUnknown(edit, EDIT_KEYS, at);
  if (!EQ_CHANNELS.includes(edit.channel)) fail(`${at} channel must be one of ${EQ_CHANNELS.join(', ')}.`);
  let index = null;
  if (edit.index !== undefined && edit.index !== null) {
    if (!Number.isInteger(edit.index) || edit.index < 0 || edit.index >= BANDS_PER_CHANNEL) fail(`${at} index must be a whole number from 0 to ${BANDS_PER_CHANNEL - 1}.`);
    index = edit.index;
  }
  if (typeof edit.enabled !== 'boolean') fail(`${at} enabled must be true or false.`);
  if (!BAND_TYPES.includes(edit.type)) fail(`${at} type must be one of ${BAND_TYPES.join(', ')}.`);
  for (const [key, bounds] of [['frequency', BOUNDS.frequency], ['gain', BOUNDS.gain], ['q', BOUNDS.q]]) {
    const value = edit[key];
    if (typeof value !== 'number' || !Number.isFinite(value)) fail(`${at} ${key} must be a finite number.`);
    if (value < bounds[0] || value > bounds[1]) fail(`${at} ${key} must be between ${bounds[0]} and ${bounds[1]}.`);
  }
  return { channel: edit.channel, index, enabled: edit.enabled, type: edit.type, frequency: edit.frequency, gain: edit.gain, q: edit.q };
}

// Validates the model-origin payload (already parsed JSON). Returns a clean copy or throws.
export function validateEqPayload(input) {
  if (!isPlain(input)) fail('The proposal must be an object.');
  noUnknown(input, PAYLOAD_KEYS, 'The proposal');
  if (input.schema !== EQ_PROPOSAL_SCHEMA) fail('This is not an MPS EQ proposal.');
  if (input.version !== EQ_PROPOSAL_VERSION) fail(`Unsupported EQ proposal version ${String(input.version)}.`);
  if (input.scope !== 'master') fail('Only the master scope is supported.');
  if (!Array.isArray(input.edits) || input.edits.length < 1 || input.edits.length > MAX_EDITS) fail(`The proposal needs 1–${MAX_EDITS} EQ edits.`);
  const edits = input.edits.map((edit, i) => validateEdit(edit, `Edit ${i + 1}`));
  const seen = new Set();
  edits.forEach(({ channel, index }, i) => {
    if (index === null) return;
    // A linked edit occupies both channels, so it conflicts with left/right edits of that band.
    for (const slot of channel === 'linked' ? ['left', 'right'] : [channel]) {
      const key = `${slot}:${index}`;
      if (seen.has(key)) fail(`Edit ${i + 1} conflicts with another edit of band ${index}.`);
      seen.add(key);
    }
  });
  return { schema: EQ_PROPOSAL_SCHEMA, version: EQ_PROPOSAL_VERSION, scope: 'master', edits, reason: text(input.reason, 'The reason'), limitations: text(input.limitations, 'The limitations') };
}

// Small stable hash (FNV-1a) of the canonical chain text: a revision marker, not a security token.
export function chainRevision(params) {
  const canonical = serializeChain(params);
  let hash = 0x811c9dc5;
  for (let i = 0; i < canonical.length; i++) hash = Math.imul(hash ^ canonical.charCodeAt(i), 0x01000193) >>> 0;
  return hash.toString(16).padStart(8, '0');
}

let counter = 0;
const newId = () => {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${(++counter).toString(36)}`;
  return `eqp_${random.replaceAll('-', '')}`;
};

// Wraps a validated payload with the app-owned envelope. Identities are opaque ids (never file
// names or bytes); `analysis` is a plain description of the measurements the proposal was based
// on (measured facts, kept apart from the model's reason text).
export function createEqProposal(input, { chain, projectId = null, mediaId = null, analysis = null, id = newId() }) {
  const payload = validateEqPayload(input);
  return Object.freeze({
    ...payload,
    id,
    base: Object.freeze({ chainRevision: chainRevision(chain), projectId, mediaId }),
    analysis: analysis === null ? null : Object.freeze(JSON.parse(JSON.stringify(analysis))),
  });
}

const free = band => !band.enabled;

// Merges the edits into a fresh copy of `chain` (never mutated). Returns validated chain params.
export function mergeEqProposal(chain, proposal, { sampleRate = 48000 } = {}) {
  const payload = validateEqPayload({ schema: proposal.schema, version: proposal.version, scope: proposal.scope, edits: proposal.edits, reason: proposal.reason, limitations: proposal.limitations });
  const base = validateChain(chain);
  const { mode } = base.eq;
  const next = { left: base.eq.left.map(band => ({ ...band })), right: base.eq.right.map(band => ({ ...band })) };
  const reserved = new Set(payload.edits.filter(e => e.index !== null).map(e => e.index));
  const taken = { left: new Set(), right: new Set() };
  payload.edits.forEach(({ channel, index, ...band }, i) => {
    if (mode === 'link' && channel !== 'linked') fail(`Edit ${i + 1}: the EQ is linked, so edits must use the linked channel.`);
    if (mode === 'independent' && channel === 'linked') fail(`Edit ${i + 1}: the EQ has independent channels; name the left or right channel.`);
    const slots = channel === 'linked' ? ['left', 'right'] : [channel];
    let at = index;
    if (at === null) {
      // First band that is free in every addressed channel and not named by another edit.
      at = next.left.findIndex((_, b) => slots.every(s => free(next[s][b]) && !taken[s].has(b)) && !reserved.has(b));
      if (at < 0) fail(`Edit ${i + 1}: no free EQ band is left; free a band or choose an existing one.`, 'no-free-band');
    }
    for (const s of slots) { next[s][at] = { ...band }; taken[s].add(at); }
  });
  const merged = validateChain({ ...base, eq: { ...base.eq, left: next.left, right: next.right } });
  guardEq(base, merged, sampleRate);
  return merged;
}

const designs = (bands, sampleRate) => bands.filter(b => b.enabled).map(b => designBand(b, sampleRate));

// The app's own conservative EQ guards (GUARDS in src/proposal.js), applied to the changed bands.
function guardEq(before, after, sampleRate) {
  for (const channel of ['left', 'right']) {
    after.eq[channel].forEach((band, i) => {
      if (JSON.stringify(band) === JSON.stringify(before.eq[channel][i]) || !band.enabled) return;
      if (band.type === 'high-pass' || band.type === 'low-pass') return;
      const where = `EQ ${channel} band ${i + 1}`;
      if (band.gain > GUARDS.bandBoostDb) fail(`${where}: boosts are limited to +${GUARDS.bandBoostDb} dB.`, 'guard');
      if (band.gain < GUARDS.bandCutDb) fail(`${where}: cuts are limited to ${GUARDS.bandCutDb} dB.`, 'guard');
      if (band.gain > 0 && band.frequency < GUARDS.noBoostBelowHz) fail(`${where}: no boost below ${GUARDS.noBoostBelowHz} Hz.`, 'guard');
    });
    const was = largestBoostDb(designs(resolveForSampleRate(before, sampleRate).params.eq[channel], sampleRate), sampleRate);
    const now = largestBoostDb(designs(resolveForSampleRate(after, sampleRate).params.eq[channel], sampleRate), sampleRate);
    if (now > Math.max(GUARDS.totalBoostDb, was) + 1e-9) fail(`The combined ${channel} EQ curve would boost by ${now.toFixed(1)} dB; the limit is +${GUARDS.totalBoostDb} dB.`, 'guard');
  }
}
