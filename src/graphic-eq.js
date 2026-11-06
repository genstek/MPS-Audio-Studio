import { editBand, validateChain } from './dsp/chain-params.js';

// LAS-75 review candidate: ten octave-spaced bell filters, using the existing chain once.
// eq.mode already means stereo Link/Independent; it must not be reused for the editor view.
export const GRAPHIC_FREQUENCIES = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
export const GRAPHIC_Q = Math.SQRT2;
export const GRAPHIC_GAIN_LIMIT = 12;

export function isGraphicBank(bands) {
  return GRAPHIC_FREQUENCIES.every((frequency, i) => {
    const band = bands[i];
    return band?.enabled && band.type === 'bell' && band.frequency === frequency
      && band.q === GRAPHIC_Q && Math.abs(band.gain) <= GRAPHIC_GAIN_LIMIT;
  });
}

// Explicit, undoable setup only: never run this just because the view was opened. The remaining
// fourteen filters and every other module are kept, including an independent opposite channel.
export function prepareGraphicBank(params, channel) {
  const convert = bands => bands.map((band, i) => i < GRAPHIC_FREQUENCIES.length
    ? { enabled: true, type: 'bell', frequency: GRAPHIC_FREQUENCIES[i], gain: 0, q: GRAPHIC_Q }
    : { ...band });
  const eq = { ...params.eq };
  if (eq.mode === 'link' || channel === 'left') eq.left = convert(eq.left);
  if (eq.mode === 'link' || channel === 'right') eq.right = convert(eq.right);
  return validateChain({ ...params, eq });
}

export function editGraphicGain(params, channel, index, gain) {
  if (!isGraphicBank(params.eq[channel])) throw new Error('Set up the graphic bands before editing them.');
  if (!Number.isInteger(index) || index < 0 || index >= GRAPHIC_FREQUENCIES.length) throw new Error('Unknown graphic band.');
  if (!Number.isFinite(gain) || Math.abs(gain) > GRAPHIC_GAIN_LIMIT) throw new Error('Graphic gain must be between −12 and +12 dB.');
  return editBand(params, channel, index, { gain });
}

export function flattenGraphicBank(params, channel) {
  return GRAPHIC_FREQUENCIES.reduce((next, _, i) => editGraphicGain(next, channel, i, 0), params);
}
