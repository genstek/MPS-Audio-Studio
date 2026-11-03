// Versioned parameter schema of the mastering chain (LAS-27): EQ → compressor → limiter, and since
// version 2 (LAS-64) EQ → compressor → space (reverb) → limiter. The reverb sits before the limiter
// so its tail is held under the same true-peak ceiling. Every value has declared bounds;
// parseChain() refuses anything outside them instead of guessing. Version 1 settings (files,
// presets, stem sessions) are upgraded with Space switched off, so they sound exactly as before.
export const CHAIN_SCHEMA = 'mps-chain';
export const CHAIN_VERSION = 2;
export const CHAIN_ORDER = ['eq', 'compressor', 'space', 'limiter'];
const CHAIN_ORDER_V1 = ['eq', 'compressor', 'limiter'];
export const BANDS_PER_CHANNEL = 24;
export const BAND_TYPES = ['bell', 'low-shelf', 'high-shelf', 'high-pass', 'low-pass'];

export const BOUNDS = {
  frequency: [20, 20000], // Hz; at run time also at most 0.45 × sample rate
  gain: [-18, 18], // dB (bell and shelves)
  q: [0.2, 12],
  threshold: [-60, 0], // dBFS
  ratio: [1, 20],
  attack: [0.1, 200], // ms
  release: [10, 2000], // ms
  knee: [0, 24], // dB
  makeup: [-12, 24], // dB
  ceiling: [-6, -0.1], // dBTP
  inputGain: [0, 24], // dB
  limiterRelease: [10, 1000], // ms
  mix: [0, 100], // % wet (Space)
  preDelay: [0, 200], // ms
  decay: [0.2, 10], // s, time for the reverb to fall by 60 dB (RT60) at low frequencies
  damping: [0, 100], // %, how much faster high frequencies die away
};

// Space presets (LAS-64): starting points of the same algorithm, not models of real rooms or
// plates. "Plate" is a bright, dense setting; no mechanical plate is simulated.
export const SPACE_PRESETS = {
  Room: { mix: 18, preDelay: 10, decay: 0.8, damping: 50 },
  Hall: { mix: 22, preDelay: 30, decay: 2.6, damping: 35 },
  Plate: { mix: 20, preDelay: 5, decay: 1.6, damping: 15 },
};
export const defaultSpace = () => ({ enabled: false, mix: 20, preDelay: 20, decay: 1.8, damping: 40 });

// Earlier schema versions are upgraded here, one step at a time: { [fromVersion]: params => params }.
const MIGRATIONS = {
  // v1 → v2 (LAS-64): Space is added, switched off, in its place before the limiter.
  1: params => {
    if (!Array.isArray(params.order) || params.order.join() !== CHAIN_ORDER_V1.join()) {
      throw new ChainParamsError(`The processing order must be ${CHAIN_ORDER_V1.join(' → ')}.`);
    }
    return { ...params, version: 2, order: [...CHAIN_ORDER], space: defaultSpace() };
  },
};

export class ChainParamsError extends Error {}

// 24 bands from 30 Hz to 16 kHz, evenly spaced on a logarithmic scale; all off and flat.
function defaultBands() {
  return Array.from({ length: BANDS_PER_CHANNEL }, (_, i) => ({
    enabled: false,
    type: 'bell',
    frequency: Number((30 * (16000 / 30) ** (i / (BANDS_PER_CHANNEL - 1))).toPrecision(4)),
    gain: 0,
    q: 1,
  }));
}

export function defaultChain() {
  return {
    schema: CHAIN_SCHEMA,
    version: CHAIN_VERSION,
    order: [...CHAIN_ORDER],
    eq: { enabled: true, mode: 'link', left: defaultBands(), right: defaultBands() },
    compressor: { enabled: false, threshold: -18, ratio: 2, attack: 10, release: 150, knee: 6, makeup: 0, detector: 'peak' },
    space: defaultSpace(),
    limiter: { enabled: true, ceiling: -1, inputGain: 0, release: 100 },
  };
}

function number(value, [min, max], where) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new ChainParamsError(`${where} must be a number.`);
  if (value < min || value > max) throw new ChainParamsError(`${where} must be between ${min} and ${max}; it is ${value}.`);
  return value;
}

function boolean(value, where) {
  if (typeof value !== 'boolean') throw new ChainParamsError(`${where} must be true or false.`);
  return value;
}

function oneOf(value, options, where) {
  if (!options.includes(value)) throw new ChainParamsError(`${where} must be one of ${options.join(', ')}.`);
  return value;
}

function object(value, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ChainParamsError(`${where} is missing.`);
  return value;
}

function bands(list, where) {
  if (!Array.isArray(list) || list.length !== BANDS_PER_CHANNEL) throw new ChainParamsError(`${where} must have exactly ${BANDS_PER_CHANNEL} bands.`);
  return list.map((band, i) => {
    const at = `${where} band ${i + 1}`;
    object(band, at);
    return {
      enabled: boolean(band.enabled, `${at} enabled`),
      type: oneOf(band.type, BAND_TYPES, `${at} type`),
      frequency: number(band.frequency, BOUNDS.frequency, `${at} frequency`),
      gain: number(band.gain, BOUNDS.gain, `${at} gain`),
      q: number(band.q, BOUNDS.q, `${at} Q`),
    };
  });
}

// Validates an object (already parsed from JSON) and returns a clean copy with only known fields.
export function validateChain(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ChainParamsError('The chain settings are missing.');
  let params = input;
  if (params.schema !== CHAIN_SCHEMA) throw new ChainParamsError('These are not MPS chain settings.');
  if (!Number.isInteger(params.version)) throw new ChainParamsError('The chain settings have no version.');
  if (params.version > CHAIN_VERSION) throw new ChainParamsError(`These chain settings need a newer version of the studio (version ${params.version}).`);
  for (let version = params.version; version < CHAIN_VERSION; version++) {
    if (!MIGRATIONS[version]) throw new ChainParamsError(`Chain settings version ${params.version} cannot be upgraded.`);
    params = MIGRATIONS[version](params);
  }
  if (!Array.isArray(params.order) || params.order.join() !== CHAIN_ORDER.join()) {
    throw new ChainParamsError(`The processing order must be ${CHAIN_ORDER.join(' → ')}.`);
  }
  const eq = object(params.eq, 'EQ');
  const compressor = object(params.compressor, 'Compressor');
  const limiter = object(params.limiter, 'Limiter');
  const space = object(params.space, 'Space');
  return {
    schema: CHAIN_SCHEMA,
    version: CHAIN_VERSION,
    order: [...CHAIN_ORDER],
    eq: {
      enabled: boolean(eq.enabled, 'EQ enabled'),
      mode: oneOf(eq.mode, ['link', 'independent'], 'EQ mode'),
      left: bands(eq.left, 'EQ left'),
      right: bands(eq.right, 'EQ right'),
    },
    compressor: {
      enabled: boolean(compressor.enabled, 'Compressor enabled'),
      threshold: number(compressor.threshold, BOUNDS.threshold, 'Compressor threshold'),
      ratio: number(compressor.ratio, BOUNDS.ratio, 'Compressor ratio'),
      attack: number(compressor.attack, BOUNDS.attack, 'Compressor attack'),
      release: number(compressor.release, BOUNDS.release, 'Compressor release'),
      knee: number(compressor.knee, BOUNDS.knee, 'Compressor knee'),
      makeup: number(compressor.makeup, BOUNDS.makeup, 'Compressor makeup'),
      detector: oneOf(compressor.detector, ['peak', 'rms'], 'Compressor detector'),
    },
    space: {
      enabled: boolean(space.enabled, 'Space enabled'),
      mix: number(space.mix, BOUNDS.mix, 'Space mix'),
      preDelay: number(space.preDelay, BOUNDS.preDelay, 'Space pre-delay'),
      decay: number(space.decay, BOUNDS.decay, 'Space decay'),
      damping: number(space.damping, BOUNDS.damping, 'Space damping'),
    },
    limiter: {
      enabled: boolean(limiter.enabled, 'Limiter enabled'),
      ceiling: number(limiter.ceiling, BOUNDS.ceiling, 'Limiter ceiling'),
      inputGain: number(limiter.inputGain, BOUNDS.inputGain, 'Limiter input gain'),
      release: number(limiter.release, BOUNDS.limiterRelease, 'Limiter release'),
    },
  };
}

export function parseChain(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ChainParamsError('The chain settings are not valid JSON.');
  }
  return validateChain(parsed);
}

// Stable JSON: the same settings always give the same text (keys in schema order).
export function serializeChain(params) {
  return `${JSON.stringify(validateChain(params), null, 2)}\n`;
}

// Bands above 0.45 × sample rate cannot be realised; they are moved down to that limit and reported.
export function resolveForSampleRate(params, sampleRate) {
  const limit = Math.min(BOUNDS.frequency[1], 0.45 * sampleRate);
  const warnings = [];
  const linked = params.eq.mode === 'link';
  const clamp = (list, channel) => list.map((band, i) => {
    if (band.frequency <= limit) return band;
    // In Link mode the right set mirrors the left one, so each band is reported once.
    if (band.enabled && !(linked && channel === 'right')) {
      warnings.push(`EQ ${linked ? 'linked' : channel} band ${i + 1} at ${band.frequency} Hz is above ${limit} Hz for ${sampleRate} Hz audio; it runs at ${limit} Hz.`);
    }
    return { ...band, frequency: limit };
  });
  return { params: { ...params, eq: { ...params.eq, left: clamp(params.eq.left, 'left'), right: clamp(params.eq.right, 'right') } }, warnings };
}

// Edits one band. In Link mode an edit applies to the same band of both channels, so the two sets
// stay identical and switching to independent starts from the linked settings.
export function editBand(params, channel, index, changes) {
  const apply = list => list.map((band, i) => (i === index ? { ...band, ...changes } : band));
  const eq = { ...params.eq };
  if (eq.mode === 'link' || channel === 'left') eq.left = apply(eq.left);
  if (eq.mode === 'link' || channel === 'right') eq.right = apply(eq.right);
  return validateChain({ ...params, eq });
}

// Switching to Link copies the left channel's bands to the right channel.
export function setEqMode(params, mode) {
  const eq = { ...params.eq, mode };
  if (mode === 'link') eq.right = eq.left.map(band => ({ ...band }));
  return validateChain({ ...params, eq });
}
