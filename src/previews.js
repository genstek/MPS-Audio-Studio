// Static curves for the configured-state previews (LAS-63). They use the same formulas as the
// chain's gain computers (src/dsp/chain.js), so a preview shows what the processor is set to do with
// a steady signal; tests compare them with the running chain. They are not measurements of audio.
import { defaultChain } from './dsp/chain-params.js';

// Compressor: steady input level (dBFS) → output level (dBFS), including the soft knee and makeup.
export function compressorOutputDb(inputDb, { threshold, ratio, knee, makeup }) {
  const over = inputDb - threshold;
  let gain;
  if (2 * over < -knee) gain = 0;
  else if (knee > 0 && 2 * Math.abs(over) <= knee) gain = ((1 / ratio - 1) * (over + knee / 2) ** 2) / (2 * knee);
  else gain = over / ratio - over;
  return inputDb + gain + makeup;
}

// Limiter: a steady sine's peak level (dBFS) after the input gain → its peak after limiting (dBTP).
export function limiterOutputDb(inputDb, { inputGain, ceiling }) {
  return Math.min(inputDb + inputGain, ceiling);
}

// Which modules differ from the shipped defaults (shown as "edited" on the cards).
export function changedModules(params) {
  const defaults = defaultChain();
  const changed = {};
  for (const name of ['eq', 'compressor', 'space', 'limiter']) changed[name] = JSON.stringify(params[name]) !== JSON.stringify(defaults[name]);
  return changed;
}
