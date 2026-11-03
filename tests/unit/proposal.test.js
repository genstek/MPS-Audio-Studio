import { describe, expect, test } from 'vitest';
import { analyze } from '../../src/dsp/analysis.js';
import { renderChain } from '../../src/dsp/chain.js';
import { defaultChain, validateChain } from '../../src/dsp/chain-params.js';
import { renderSegment } from '../../src/dsp/segment-render.js';
import { atStrength, GUARDS, proposeChain } from '../../src/proposal.js';
import { designBand } from '../../src/dsp/eq-design.js';
import { biquadResponseDb } from '../../src/dsp/biquad.js';
import { FIXTURES } from '../fixtures/dsp-fixtures.js';
import { concat } from '../fixtures/signals.js';
import { PRESETS } from '../harness/presets.js';

const RATE = 44100;
const SECTION = { start: 4, end: 8 };
const f32 = samples => Float32Array.from(samples);
const PROGRAMME = FIXTURES.programme(RATE).map(channel => f32(concat(channel, channel, channel))); // 12 s
const gain = (channels, db) => channels.map(channel => channel.map(v => v * 10 ** (db / 20)));
const tilt = (channels, passes) => channels.map(channel => {
  let out = channel;
  for (let p = 0; p < passes; p++) { let state = 0; out = out.map(v => { state += 0.17 * (v - state); return v - 0.8 * state; }); }
  return out;
});
const mastered = channels => renderChain(PRESETS.master, channels, RATE).channels;

function propose(mix, reference, section = SECTION) {
  const renderSection = params => {
    const rendered = renderSegment(params, mix, RATE, section);
    return { report: analyze(rendered.channels, RATE), meters: rendered.meters };
  };
  return proposeChain({ reference: analyze(reference, RATE, section), original: analyze(mix, RATE, section), sampleRate: RATE, renderSection });
}
// Shared by two tests: the proposal towards a mastered reference (computed once).
let masteredCase = null;
function towardsMastered() {
  if (!masteredCase) {
    const reference = mastered(PROGRAMME);
    masteredCase = { reference, proposal: propose(PROGRAMME, reference) };
  }
  return masteredCase;
}
const moduleOf = (proposal, name) => proposal.modules.find(m => m.module === name);
const enabledBands = params => params.eq.left.filter(band => band.enabled);
const row = (proposal, name) => proposal.evaluation.rows.find(r => r.name === name);

describe('reference-guided proposal', () => {
  test('towards a mastered reference: every module explains itself and the rendered result is closer', () => {
    const { proposal } = towardsMastered();
    for (const m of proposal.modules) {
      expect(m.reasons.length, m.module).toBeGreaterThan(0);
      expect(typeof m.range, m.module).toBe('string');
      expect(m.uncertainty.length, m.module).toBeGreaterThan(0);
    }
    expect(moduleOf(proposal, 'EQ').status).toBe('proposed');
    expect(moduleOf(proposal, 'EQ').values[0]).toMatch(/bell, Q 1\.41, [+−]\d+\.\d dB$/);
    expect(moduleOf(proposal, 'Limiter').status).toBe('proposed');
    expect(moduleOf(proposal, 'Width')).toMatchObject({ status: 'not proposed' });
    const tonal = row(proposal, 'Largest octave-band difference');
    expect(tonal.after).toBeLessThan(tonal.before / 2);
    const loudness = row(proposal, 'Integrated loudness difference');
    expect(Math.abs(loudness.after)).toBeLessThan(Math.abs(loudness.before));
    expect(Math.abs(loudness.after)).toBeLessThan(1);
    expect(proposal.evaluation.truePeakDbtp).toBeLessThanOrEqual(GUARDS.ceilingDbtp + 0.1);
    expect(proposal.note).toMatch(/does not recover how the reference was mastered/);
  }, 60_000);

  test('extreme tonal differences are bounded by the EQ guards and say so', () => {
    const proposal = propose(PROGRAMME, tilt(PROGRAMME, 3)); // a reference with far more top end
    const bands = enabledBands(proposal.params);
    for (const band of bands) {
      expect(band.gain).toBeLessThanOrEqual(GUARDS.bandBoostDb);
      expect(band.gain).toBeGreaterThanOrEqual(GUARDS.bandCutDb);
      if (band.frequency < GUARDS.noBoostBelowHz) expect(band.gain).toBeLessThanOrEqual(0);
    }
    const designs = bands.map(band => designBand(band, RATE));
    let largest = -Infinity;
    for (let i = 0; i <= 400; i++) {
      const f = 20 * (19845 / 20) ** (i / 400);
      largest = Math.max(largest, designs.reduce((db, c) => db + biquadResponseDb(c, f, RATE), 0));
    }
    expect(largest).toBeLessThanOrEqual(GUARDS.totalBoostDb + 0.05);
    expect(moduleOf(proposal, 'EQ').guardNotes.join(' ')).toMatch(/cuts stop at −6 dB|boosts stop at \+4 dB|scaled/);
  }, 60_000);

  test('a mix with a wide loudness range against a compressed reference: slow compression within the guard brings the range closer', () => {
    const loop = FIXTURES.programme(RATE);
    const wide = loop.map(channel => { const quiet = channel.map(v => v * 0.25); return f32(concat(quiet, quiet, channel, channel)); }); // quiet 8 s, loud 8 s
    const squeezed = renderChain(validateChain({ ...defaultChain(), compressor: { enabled: true, threshold: -30, ratio: 4, attack: 30, release: 300, knee: 6, makeup: 6, detector: 'rms' } }), wide, RATE).channels;
    const proposal = propose(wide, squeezed, { start: 3, end: 15 });
    const compressor = moduleOf(proposal, 'Compressor');
    expect(compressor.status).toBe('proposed');
    expect(compressor.reasons[0]).toMatch(/^The mix's loudness range is \d+\.\d LU wider than the reference's/);
    expect(proposal.params.compressor.ratio).toBeLessThanOrEqual(3);
    expect(proposal.evaluation.compressorReductionDb).toBeLessThanOrEqual(GUARDS.maxCompressorReductionDb);
    const range = row(proposal, 'Loudness range difference');
    expect(Math.abs(range.after)).toBeLessThan(Math.abs(range.before) - GUARDS.minRangeImprovementLu);
    // The reverse: a mix already narrower than its reference gets no compression, with the reason.
    const reverse = propose(squeezed, wide, { start: 3, end: 15 });
    expect(moduleOf(reverse, 'Compressor')).toMatchObject({ status: 'not proposed', reasons: [expect.stringMatching(/narrower than the reference's: it is already more compressed/)] });
  }, 90_000);

  test('a mix already denser and louder than the reference gets no compression and no gain', () => {
    const proposal = propose(mastered(PROGRAMME), gain(PROGRAMME, -6));
    expect(moduleOf(proposal, 'Compressor').status).toBe('not proposed');
    expect(moduleOf(proposal, 'Limiter')).toMatchObject({ status: 'not proposed', reasons: [expect.stringMatching(/louder than the reference\. The chain has no output trim/)] });
    expect(proposal.params.compressor.enabled).toBe(false);
    expect(proposal.params.limiter.inputGain).toBe(0);
  }, 60_000);

  test('a very quiet mix: input gain within its guard and the limiter guard; the crest difference is explained', () => {
    const proposal = propose(gain(PROGRAMME, -24), mastered(PROGRAMME));
    expect(moduleOf(proposal, 'Limiter').reasons[0]).toMatch(/quieter than the reference/);
    expect(proposal.params.limiter.inputGain).toBeLessThanOrEqual(GUARDS.maxInputGainDb);
    expect(proposal.evaluation.limiterReductionDb).toBeLessThanOrEqual(GUARDS.maxLimiterReductionDb);
    expect(moduleOf(proposal, 'Limiter').guardNotes.join(' ')).toMatch(/Input gain stops at 12 dB|at most 6 dB/);
  }, 60_000);

  test('width is measured but never proposed; a negative correlation warns about mono', () => {
    const inverted = [PROGRAMME[0], PROGRAMME[1].map(v => -v)];
    const proposal = propose(inverted, PROGRAMME);
    const width = moduleOf(proposal, 'Width');
    expect(width.status).toBe('not proposed');
    expect(width.reasons[1]).toBe('The chain has no width processor yet (Space is planned), so nothing is proposed.');
    expect(width.guardNotes[0]).toBe("The mix's correlation is −1.00: check mono compatibility before mastering.");
  }, 60_000);

  test('the same inputs give the same proposal', () => {
    const { reference, proposal } = towardsMastered();
    expect(propose(PROGRAMME, reference)).toEqual(proposal);
  }, 90_000);

  test('strength scales every move towards neutral and stays valid', () => {
    let params = defaultChain();
    params.eq.left[0] = { enabled: true, type: 'bell', frequency: 125, gain: -4, q: Math.SQRT2 };
    params.eq.right[0] = { ...params.eq.left[0] };
    params = validateChain({ ...params, compressor: { ...params.compressor, enabled: true, ratio: 3 }, limiter: { ...params.limiter, inputGain: 6 } });
    const half = atStrength(params, 0.5);
    expect(half.eq.left[0].gain).toBe(-2);
    expect(half.compressor.ratio).toBe(2);
    expect(half.limiter.inputGain).toBe(3);
    const none = atStrength(params, 0);
    expect(none.eq.left[0].gain).toBe(0);
    expect(none.compressor.ratio).toBe(1);
    expect(none.limiter.inputGain).toBe(0);
    expect(atStrength(params, 1)).toEqual(params);
  });
});
