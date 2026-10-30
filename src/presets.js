import { CHAIN_SCHEMA, ChainParamsError, defaultChain, validateChain } from './dsp/chain-params.js';
import { atStrength } from './proposal.js';

// Presets and mastering preferences (LAS-33), shared by the studio and the account server.
//   Preset (schema mps-preset v1): a name, a complete chain (mps-chain: all 24 bands per channel,
//   Link/independent, compressor, limiter, processing order) and where it came from, with the
//   versions needed to reproduce it (analysis and proposal versions, strength).
//   Preferences (schema mps-preferences v1): explicit user adjustments applied on top of a
//   reference-derived proposal, kept separate from it so either can be reset.
// Only settings are stored; no audio, and nothing is trained or uploaded from them.
export const PRESET_SCHEMA = 'mps-preset';
export const PRESET_VERSION = 1;
export const PREFERENCES_SCHEMA = 'mps-preferences';
export const PREFERENCES_VERSION = 1;
export const PRESET_ORIGINS = ['manual', 'proposal', 'import'];
export const PREFERENCE_BOUNDS = { lowShelfDb: [-4, 4], highShelfDb: [-4, 4], strength: [0, 100] };
// Preference shelves use the last two EQ bands; proposals use the first ones.
export const PREFERENCE_BANDS = { low: 22, high: 23 };
export const PREFERENCE_SHELVES = { low: { type: 'low-shelf', frequency: 120, q: 0.707 }, high: { type: 'high-shelf', frequency: 8000, q: 0.707 } };
const NAME_LIMIT = 100;

export class PresetError extends Error {}

const cleanName = (value, fallback) => {
  const text = [...String(value ?? '')].filter(ch => ch >= ' ' && ch !== '\u007f').join('').trim().slice(0, NAME_LIMIT);
  return text || fallback;
};
const optionalText = (value, where) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string' || value.length > 40) throw new PresetError(`${where} must be a short text.`);
  return value;
};

// A preset as stored and exported. Throws PresetError with a reason.
export function validatePreset(input) {
  if (!input || typeof input !== 'object') throw new PresetError('A preset must be an object.');
  let chain;
  try {
    chain = validateChain(input.chain);
  } catch (failure) {
    if (failure instanceof ChainParamsError) throw new PresetError(`The preset's settings are invalid: ${failure.message}`);
    throw failure;
  }
  const origin = input.origin ?? 'manual';
  if (!PRESET_ORIGINS.includes(origin)) throw new PresetError(`origin must be one of ${PRESET_ORIGINS.join(', ')}.`);
  const strength = input.strength ?? null;
  if (strength !== null && !(typeof strength === 'number' && strength >= 0 && strength <= 100)) throw new PresetError('strength must be between 0 and 100.');
  return {
    name: cleanName(input.name, 'Untitled preset'),
    chain,
    origin,
    analysisVersion: optionalText(input.analysisVersion, 'analysisVersion'),
    proposalVersion: optionalText(input.proposalVersion, 'proposalVersion'),
    strength,
  };
}

// The downloadable file: stable JSON with the schema and version first.
export function serializePreset(preset) {
  const valid = validatePreset(preset);
  return `${JSON.stringify({ schema: PRESET_SCHEMA, version: PRESET_VERSION, ...valid }, null, 2)}\n`;
}

// Reads a preset file. Accepts mps-preset v1, and migrates an mps-chain settings file (LAS-28)
// into a preset. Newer, unknown or invalid files are refused with a reason; nothing is changed.
export function parsePresetFile(text, fileName = 'preset') {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new PresetError('The file is not valid JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new PresetError('The file is not an MPS preset or settings file.');
  if (parsed.schema === CHAIN_SCHEMA) {
    const preset = validatePreset({ name: fileName.replace(/\.json$/i, ''), chain: parsed, origin: 'import' });
    return { preset, migratedFrom: `${CHAIN_SCHEMA} v${parsed.version} settings file` };
  }
  if (parsed.schema !== PRESET_SCHEMA) throw new PresetError('The file is not an MPS preset or settings file.');
  if (!Number.isInteger(parsed.version) || parsed.version < 1) throw new PresetError('The preset has no valid version.');
  if (parsed.version > PRESET_VERSION) throw new PresetError(`This preset was saved by a newer studio (${PRESET_SCHEMA} v${parsed.version}); update the studio to open it.`);
  return { preset: validatePreset({ ...parsed, origin: parsed.origin ?? 'import' }), migratedFrom: null };
}

export const defaultPreferences = () => ({ schema: PREFERENCES_SCHEMA, version: PREFERENCES_VERSION, lowShelfDb: 0, highShelfDb: 0, strength: 100 });

export function validatePreferences(input) {
  if (!input || typeof input !== 'object') throw new PresetError('Preferences must be an object.');
  if (input.schema !== PREFERENCES_SCHEMA) throw new PresetError('Unknown preferences schema.');
  if (input.version !== PREFERENCES_VERSION) throw new PresetError(input.version > PREFERENCES_VERSION ? 'These preferences were saved by a newer studio.' : 'Unsupported preferences version.');
  const out = defaultPreferences();
  for (const [key, [min, max]] of Object.entries(PREFERENCE_BOUNDS)) {
    const value = input[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new PresetError(`${key} must be between ${min} and ${max}.`);
    out[key] = value;
  }
  return out;
}

export const isNeutral = preferences => preferences.lowShelfDb === 0 && preferences.highShelfDb === 0;

// The chain a proposal panel plays: the reference-derived proposal at a strength (or the neutral
// defaults when reference targets are switched off), plus the preference shelves when switched on.
export function composeChain(proposalParams, preferences, { strength, useReference = true, usePreferences = true }) {
  const base = useReference ? atStrength(proposalParams, strength / 100) : defaultChain();
  if (!usePreferences || isNeutral(preferences)) return base;
  const params = structuredClone(base);
  for (const [side, gain] of [['low', preferences.lowShelfDb], ['high', preferences.highShelfDb]]) {
    if (gain === 0) continue;
    const band = { enabled: true, ...PREFERENCE_SHELVES[side], gain };
    params.eq.left[PREFERENCE_BANDS[side]] = { ...band };
    params.eq.right[PREFERENCE_BANDS[side]] = { ...band };
  }
  return validateChain(params);
}
