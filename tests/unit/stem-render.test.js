import { describe, expect, test } from 'vitest';
import { defaultChain, editBand, validateChain } from '../../src/dsp/chain-params.js';
import { bypassChain, pan, renderStemMix, StemRenderError } from '../../src/dsp/stem-render.js';
import { renderChain } from '../../src/dsp/chain.js';

const RATE = 44100;
const impulse = (frames, at, value = 0.5) => { const s = new Float32Array(frames); s[at] = value; return s; };
const stem = (name, channels, overrides = {}) => ({ name, sampleRate: RATE, channels, offsetFrames: 0, gainDb: 0, pan: 0, mute: false, solo: false, params: bypassChain(), ...overrides });
const heavy = () => {
  let params = editBand(defaultChain(), 'left', 8, { enabled: true, type: 'bell', frequency: 2000, gain: 6, q: 1 });
  params = validateChain({ ...params, compressor: { ...params.compressor, enabled: true, threshold: -30, ratio: 4 }, limiter: { ...params.limiter, inputGain: 6 } });
  return params;
};
const peakAt = channel => { let best = 0; for (let n = 1; n < channel.length; n++) if (Math.abs(channel[n]) > Math.abs(channel[best])) best = n; return best; };

describe('offline stem master', () => {
  test('bypassed stems sum exactly with the Web Audio pan law', () => {
    const a = stem('a', [impulse(1000, 100)], { gainDb: -6, pan: -0.5 });
    const b = stem('b', [impulse(1000, 200, 0.2), impulse(1000, 200, 0.1)], { pan: 0.25 });
    const result = renderStemMix({ stems: [a, b], master: bypassChain() });
    const g = 10 ** (-6 / 20);
    const x = (-0.5 + 1) / 2;
    expect(result.combined[0][100]).toBeCloseTo(0.5 * g * Math.cos((x * Math.PI) / 2), 6);
    expect(result.combined[1][100]).toBeCloseTo(0.5 * g * Math.sin((x * Math.PI) / 2), 6);
    // Stereo stem panned right by 0.25: L = inL·cos(0.25·π/2), R = inR + inL·sin(0.25·π/2).
    expect(result.combined[0][200]).toBeCloseTo(0.2 * Math.cos((0.25 * Math.PI) / 2), 6);
    expect(result.combined[1][200]).toBeCloseTo(0.1 + 0.2 * Math.sin((0.25 * Math.PI) / 2), 6);
    expect(pan([new Float32Array([1])], 0).map(c => c[0])).toEqual([Math.fround(Math.SQRT1_2), Math.fround(Math.SQRT1_2)]);
  });

  test('a stem\'s own chain changes only that stem, and stays sample-aligned with bypassed stems (latency compensated)', () => {
    const frames = 22050;
    const processed = renderStemMix({ stems: [stem('a', [impulse(frames, 5000)], { params: heavy() }), stem('b', [impulse(frames, 5000)])], master: bypassChain() });
    const bypassed = renderStemMix({ stems: [stem('a', [impulse(frames, 5000)]), stem('b', [impulse(frames, 5000)])], master: bypassChain() });
    expect(processed.strips[1].channels).toEqual(bypassed.strips[1].channels); // b untouched
    expect(processed.strips[0].channels).not.toEqual(bypassed.strips[0].channels); // a processed
    expect(peakAt(processed.strips[0].channels[0])).toBe(5000);
    expect(peakAt(processed.strips[1].channels[0])).toBe(5000);
    // A master chain with latency keeps the combined output aligned with the stems too.
    const mastered = renderStemMix({ stems: [stem('a', [impulse(frames, 5000)])], master: heavy() });
    expect(peakAt(mastered.combined[0])).toBe(5000);
    expect(mastered.latency).toBe(77);
  });

  test('mute and solo route like the live session; offsets are exact; the length is the longest stem', () => {
    const stems = [
      stem('a', [impulse(1000, 10)]),
      stem('b', [impulse(1000, 10)], { mute: true }),
      stem('c', [impulse(500, 10)], { offsetFrames: 700 }),
    ];
    const result = renderStemMix({ stems, master: bypassChain() });
    expect(result.frames).toBe(1200);
    expect(result.strips.map(s => s.name)).toEqual(['a', 'c']);
    expect(result.silent).toEqual(['b']);
    expect(peakAt(result.strips[1].channels[0])).toBe(710);
    const soloed = renderStemMix({ stems: stems.map(s => (s.name === 'c' ? { ...s, solo: true } : s)), master: bypassChain() });
    expect(soloed.strips.map(s => s.name)).toEqual(['c']);
    expect(soloed.combined[0][10]).toBe(0);
  });

  test('unsupported inputs are refused with a reason; the inputs are never modified', () => {
    const input = impulse(1000, 10);
    const copy = Float32Array.from(input);
    expect(() => renderStemMix({ stems: [], master: bypassChain() })).toThrow(new StemRenderError('Add stems first.'));
    expect(() => renderStemMix({ stems: [stem('a', [input]), { ...stem('b', [input]), sampleRate: 48000 }], master: bypassChain() })).toThrow(/one sample rate for all stems; these have 44100 Hz and 48000 Hz/);
    expect(() => renderStemMix({ stems: [stem('a', [input, input, input])], master: bypassChain() })).toThrow('a has 3 channels; rendering supports mono and stereo stems.');
    renderStemMix({ stems: [stem('a', [input], { params: heavy(), gainDb: 6, pan: 1 })], master: heavy() });
    expect(input).toEqual(copy);
  });
});

test('a short stem\'s chain tail runs on to the end of the session instead of being cut', () => {
  const ringing = editBand(bypassChain(), 'left', 0, { enabled: true, type: 'bell', frequency: 100, gain: 12, q: 8 });
  const params = validateChain({ ...ringing, eq: { ...ringing.eq, enabled: true } });
  const short = stem('short', [impulse(500, 400)], { params });
  const long = stem('long', [new Float32Array(4000)]);
  const result = renderStemMix({ stems: [short, long], master: bypassChain() });
  // The strip equals the chain run over the stem followed by silence to the session end (as live),
  // and the 100 Hz resonance still rings after the stem's last sample.
  const padded = new Float32Array(4000);
  padded[400] = 0.5;
  const expected = renderChain(params, [padded], RATE).channels[0];
  const strip = result.strips[0].channels[0];
  const x = (0 + 1) / 2;
  for (const n of [450, 499, 500, 800, 2000, 3999]) expect(strip[n]).toBeCloseTo(expected[n] * Math.cos((x * Math.PI) / 2), 6);
  expect(Math.max(...strip.subarray(500).map(Math.abs))).toBeGreaterThan(1e-4);
});
