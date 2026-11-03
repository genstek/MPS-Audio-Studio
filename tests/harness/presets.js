// Processing presets for the LAS-29 regression set: bypass, the shipped defaults and a full master.
import { SPACE_PRESETS, defaultChain, editBand, setEqMode, validateChain } from '../../src/dsp/chain-params.js';

function master() {
  let params = defaultChain();
  params = editBand(params, 'left', 1, { enabled: true, type: 'low-shelf', frequency: 100, gain: 2, q: 0.707 });
  params = editBand(params, 'left', 6, { enabled: true, type: 'bell', frequency: 400, gain: -2, q: 1.2 });
  params = editBand(params, 'left', 20, { enabled: true, type: 'high-shelf', frequency: 8000, gain: 3, q: 0.707 });
  params = editBand(params, 'left', 0, { enabled: true, type: 'high-pass', frequency: 25, gain: 0, q: 0.707 });
  return validateChain({
    ...params,
    compressor: { enabled: true, threshold: -18, ratio: 2.5, attack: 15, release: 150, knee: 6, makeup: 2, detector: 'rms' },
    limiter: { enabled: true, ceiling: -1, inputGain: 4, release: 80 },
  });
}

function independent() {
  let params = setEqMode(defaultChain(), 'independent');
  params = editBand(params, 'left', 10, { enabled: true, type: 'bell', frequency: 1000, gain: 4, q: 1 });
  params = editBand(params, 'right', 10, { enabled: true, type: 'bell', frequency: 1000, gain: -4, q: 1 });
  return params;
}

function bypass() {
  const params = defaultChain();
  return validateChain({ ...params, eq: { ...params.eq, enabled: false }, compressor: { ...params.compressor, enabled: false }, limiter: { ...params.limiter, enabled: false } });
}

// LAS-64: the shipped defaults with the Space "Hall" preset switched on (reverb before the limiter).
function space() {
  const params = defaultChain();
  return validateChain({ ...params, space: { enabled: true, ...SPACE_PRESETS.Hall } });
}

export const PRESETS = { bypass: bypass(), default: defaultChain(), master: master(), independent: independent(), space: space() };
