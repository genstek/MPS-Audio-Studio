import { describe, expect, test } from 'vitest';
import { analyze } from '../../src/dsp/analysis.js';
import { renderChain } from '../../src/dsp/chain.js';
import { defaultChain, setEqMode } from '../../src/dsp/chain-params.js';
import { editGraphicGain, prepareGraphicBank } from '../../src/graphic-eq.js';
import { buildSuggestions, lowBandChanges } from '../../src/ai/suggestions.js';
import { chainRevision } from '../../src/ai/eq-proposal.js';
import { OWNERS, createPreviewCoordinator } from '../../src/ai/preview-coordinator.js';
import { createProposalSession } from '../../src/ai/proposal-session.js';

// LAS-174: suggestions are built from a real render of the file through the committed chain and the
// analysis of both versions, not from the original alone or from a drawn EQ curve. Same measurement
// the render worker's 'suggest' mode performs.
const RATE = 44100;
const CENTRES = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const tones = (seconds = 3, gains = {}) => Float32Array.from({ length: Math.round(RATE * seconds) }, (_, i) => CENTRES
  .reduce((sum, f) => sum + 0.05 * (gains[f] ?? 1) * Math.sin(2 * Math.PI * f * i / RATE + f), 0));
const stereo = (left, right = left) => [left, right];

// Limiter off so only the EQ is measured.
const base = () => ({ ...defaultChain(), limiter: { ...defaultChain().limiter, enabled: false } });
const bassBoost = (chain = base()) => {
  let next = prepareGraphicBank(chain, 'left');
  next = editGraphicGain(next, 'left', 0, 7);
  return editGraphicGain(next, 'left', 1, 8.5);
};
const measure = (chain, channels) => {
  const original = analyze(channels, RATE);
  const processed = analyze(renderChain(chain, channels, RATE).channels, RATE);
  return { original, processed, sampleRate: RATE };
};
const level = (report, hz) => report.spectrum.bands.find(b => b.centreHz === hz).levelDb;
const options = (chain, extra = {}) => ({ chain, sampleRate: RATE, projectId: 'p1', mediaId: 'm1', ...extra });

describe('processed-chain measurement (LAS-174)', () => {
  const audio = stereo(tones());
  const chain = bassBoost();
  const report = measure(chain, audio);

  test('(a) the processed spectrum differs from the original at 31.5 and 63 Hz by about the EQ boost', () => {
    const delta = hz => level(report.processed, hz) - level(report.original, hz);
    // Levels are relative to the total, which the boost itself raises, so the share rises by a little less than the gain.
    expect(delta(31.5)).toBeGreaterThan(4);
    expect(delta(31.5)).toBeLessThan(7.5);
    expect(delta(63)).toBeGreaterThan(5);
    expect(delta(63)).toBeLessThan(9);
    expect(delta(1000)).toBeLessThan(0); // unboosted bands lose share of the (now larger) total
    expect(delta(63) - delta(1000)).toBeGreaterThan(8); // about the 8.5 dB boost, independent of the total
    console.log('LAS-174 evidence (dB rel. total):', [31.5, 63, 125].map(hz => `${hz} Hz ${level(report.original, hz).toFixed(2)} -> ${level(report.processed, hz).toFixed(2)} (${delta(hz).toFixed(2)})`).join('; '));
  });

  test('the original-only analysis cannot see the boost: the old blind spot', () => {
    const items = buildSuggestions(report.original, options(chain));
    expect(items.map(i => i.id)).toEqual(['balanced']);
    expect(lowBandChanges(report.original, report.original)).toEqual([]);
  });

  test('the processed measurement reports the low-end change as a clearly marked observation, with provenance and no proposal', () => {
    const items = buildSuggestions(report, options(chain));
    const observation = items.find(i => i.id === 'low-end-change');
    expect(observation).toMatchObject({ kind: 'observation', supported: false, proposal: null, filters: [] });
    expect(observation.evidence).toHaveLength(2);
    expect(observation.evidence[0]).toMatch(/^31\.5 Hz octave: .* in the original, .* after your settings \(\+/);
    expect(observation.evidence[1]).toMatch(/^63 Hz octave/);
    expect(observation.reason).toMatch(/not a fault/);
    expect(observation.provenance).toEqual({ measuredOn: 'processed', sampleRate: RATE, durationSeconds: 3, chainRevision: chainRevision(chain), projectId: 'p1', mediaId: 'm1' });
    expect(items.some(i => i.proposal)).toBe(false); // intentional low-end boost is never "fixed"
  });

  test('(b) a measurement with no rule match is a success state, not "unavailable"', () => {
    const flat = base();
    const items = buildSuggestions(measure(flat, audio), options(flat));
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'balanced', kind: 'none', message: 'No evidence-based EQ change suggested for the measured signal.' });
    expect(items[0].evidence.join(' ')).toMatch(/250 Hz, 500 Hz and 4 kHz/);
    expect(items[0].evidence.join(' ')).toMatch(/31\.5 Hz, 63 Hz, 125 Hz/);
    expect(JSON.stringify(items[0])).not.toMatch(/unavailable/i);
  });

  test('(c) silent, short and invalid input are unavailable with a reason', () => {
    const silence = stereo(new Float32Array(RATE * 2));
    const [silent] = buildSuggestions(measure(base(), silence), options(base()));
    expect(silent).toMatchObject({ kind: 'unavailable', id: 'silent', supported: false });
    expect(silent.unsupportedReason).toMatch(/silent or too quiet/);
    const quiet = stereo(tones(2).map(v => v * 1e-6));
    expect(buildSuggestions(measure(base(), quiet), options(base()))[0].id).toBe('silent');
    const short = stereo(tones(0.05));
    expect(buildSuggestions(measure(base(), short), options(base()))[0]).toMatchObject({ kind: 'unavailable', id: 'no-spectrum' });
    for (const bad of [null, undefined, {}, { original: {}, processed: { spectrum: {} } }]) {
      expect(buildSuggestions(bad, options(base()))[0]).toMatchObject({ kind: 'unavailable', supported: false });
    }
  });

  test('(d) intentional pan and a deliberate low end are not flagged', () => {
    const panned = stereo(tones(3), new Float32Array(RATE * 3)); // hard-left content
    const flat = base();
    const items = buildSuggestions(measure(flat, panned), options(flat));
    expect(items.map(i => i.id)).toEqual(['balanced']);
    const heavyBass = stereo(tones(3, { 31.5: 4, 63: 4 })); // loud sub in the source itself, no EQ
    const heavy = buildSuggestions(measure(flat, heavyBass), options(flat));
    expect(heavy.every(i => i.proposal === null)).toBe(true);
    expect(heavy.some(i => i.id === 'low-end-change')).toBe(false); // nothing was changed by the user's settings
  });

  test('a boost that is small, or in a band that is nearly empty, is not reported', () => {
    const small = editGraphicGain(prepareGraphicBank(base(), 'left'), 'left', 1, 1.5);
    expect(buildSuggestions(measure(small, audio), options(small)).some(i => i.id === 'low-end-change')).toBe(false);
  });

  test('a mid-range excess is judged on the processed spectrum, with the original shown beside it', () => {
    const loud250 = stereo(tones(3, { 250: 2 }));
    const flat = base();
    const [item] = buildSuggestions(measure(flat, loud250), options(flat));
    expect(item).toMatchObject({ id: 'low-mid-buildup', supported: true, kind: 'proposal' });
    expect(item.evidence.join(' ')).toMatch(/\(processed\)/);
    expect(item.evidence.join(' ')).toMatch(/Original file: .* your settings change this band by/);
    // The same file with a 250 Hz cut already in the EQ: judged after the cut, so the excess is reduced.
    const cutChain = editGraphicGain(prepareGraphicBank(flat, 'left'), 'left', 3, -6);
    const after = buildSuggestions(measure(cutChain, loud250), options(cutChain));
    expect(after.some(i => i.id === 'low-mid-buildup' && i.supported)).toBe(false);
  });

  test('(e) a suggestion made for one chain revision or project goes stale when either changes', () => {
    const flat = base();
    const [item] = buildSuggestions(measure(flat, stereo(tones(3, { 250: 2 }))), options(flat));
    let current = flat;
    let project = 'p1';
    const session = createProposalSession(item.proposal, {
      getChain: () => current, getContext: () => ({ projectId: project, mediaId: 'm1', sampleRate: RATE }),
      coordinator: createPreviewCoordinator(() => {}), commit: () => {}, owner: OWNERS.ai,
    });
    expect(session.stale).toBe(false);
    project = 'p2';
    expect(session.stale).toBe(true);
    project = 'p1';
    current = editGraphicGain(prepareGraphicBank(flat, 'left'), 'left', 5, 2);
    expect(session.stale).toBe(true);
    expect(item.provenance.chainRevision).toBe(chainRevision(flat));
    expect(chainRevision(current)).not.toBe(item.provenance.chainRevision);
  });

  test('(f) a bypassed EQ is unavailable; linked mode edits once and independent mode edits each channel; the existing bank is kept', () => {
    const bypassed = { ...bassBoost(), eq: { ...bassBoost().eq, enabled: false } };
    const [off] = buildSuggestions(measure(bypassed, audio), options(bypassed));
    expect(off).toMatchObject({ id: 'eq-bypassed', kind: 'unavailable' });
    // Bypass really removes the boost from the measured audio.
    const delta = level(measure(bypassed, audio).processed, 63) - level(measure(bypassed, audio).original, 63);
    expect(Math.abs(delta)).toBeLessThan(0.5);

    const loud250 = stereo(tones(3, { 250: 2 }));
    const linked = bassBoost();
    const [a] = buildSuggestions(measure(linked, loud250), options(linked));
    expect(a.proposal.edits.map(e => e.channel)).toEqual(['linked']);
    const independent = setEqMode(linked, 'independent');
    const [b] = buildSuggestions(measure(independent, loud250), options(independent));
    expect(b.proposal.edits.map(e => e.channel)).toEqual(['left', 'right']);
    // Existing filters are untouched by a proposal's merge.
    const preview = createProposalSession(a.proposal, {
      getChain: () => linked, getContext: () => ({ projectId: 'p1', mediaId: 'm1', sampleRate: RATE }),
      coordinator: createPreviewCoordinator(() => {}), commit: () => {}, owner: OWNERS.ai,
    }).preview(true);
    expect(preview.eq.left.slice(0, 2).map(x => x.gain)).toEqual([7, 8.5]);
  });
});
