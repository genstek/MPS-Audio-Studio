import { describe, expect, test } from 'vitest';
import { defaultChain, setEqMode } from '../../src/dsp/chain-params.js';
import { buildSuggestions, bandExcess, comparisonTrimDb, existingCutNear, SUGGESTION_SOURCE } from '../../src/ai/suggestions.js';
import { mergeEqProposal } from '../../src/ai/eq-proposal.js';
import { OWNERS, createPreviewCoordinator } from '../../src/ai/preview-coordinator.js';
import { createProposalSession } from '../../src/ai/proposal-session.js';

const CENTRES = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const report = overrides => ({ spectrum: { bands: CENTRES.map(centreHz => ({ centreHz, share: 0.1, levelDb: overrides[centreHz] ?? -20 })) } });

describe('deterministic EQ suggestions (LAS-120)', () => {
  test('a flat spectrum yields one disabled "nothing to suggest" item', () => {
    const items = buildSuggestions(report({}), { chain: defaultChain(), sampleRate: 48000 });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ supported: false, proposal: null, source: SUGGESTION_SOURCE });
  });

  test('a 250 Hz excess gives a measured, validated, cut-only suggestion that is labelled deterministic', () => {
    const chain = defaultChain();
    const [item] = buildSuggestions(report({ 250: -14 }), { chain, sampleRate: 48000, mediaId: 'm1' });
    expect(bandExcess(report({ 250: -14 }).spectrum.bands, 250).excessDb).toBeCloseTo(6);
    expect(item).toMatchObject({ id: 'low-mid-buildup', supported: true, source: 'deterministic-measurement' });
    expect(item.filters).toEqual([{ type: 'bell', frequency: 250, gain: -3, q: 1 }]);
    expect(item.evidence.join(' ')).toMatch(/−14\.0 dB/);
    expect(item.proposal.base.mediaId).toBe('m1');
    expect(mergeEqProposal(chain, item.proposal).eq.left.some(b => b.enabled && b.frequency === 250 && b.gain === -3)).toBe(true);
    expect(JSON.stringify(item)).not.toMatch(/model listened|AI listened/i);
  });

  test('independent EQ mode produces left and right edits', () => {
    const chain = setEqMode(defaultChain(), 'independent');
    const [item] = buildSuggestions(report({ 250: -14 }), { chain, sampleRate: 48000 });
    expect(item.proposal.edits.map(e => e.channel)).toEqual(['left', 'right']);
  });

  test('too-short audio (no bands) is disabled with a reason', () => {
    const [item] = buildSuggestions({ spectrum: { bands: [] } }, { chain: defaultChain(), sampleRate: 48000 });
    expect(item).toMatchObject({ supported: false });
    expect(item.unsupportedReason).toMatch(/too short/);
  });

  test('Apply commits once, Preview does not commit, and a manual edit makes it stale', () => {
    let chain = defaultChain();
    const previews = [];
    const coordinator = createPreviewCoordinator(value => previews.push(value));
    let commits = 0;
    const [item] = buildSuggestions(report({ 250: -14 }), { chain, sampleRate: 48000, mediaId: 'm1' });
    const session = createProposalSession(item.proposal, {
      getChain: () => chain, getContext: () => ({ projectId: null, mediaId: 'm1', sampleRate: 48000 }), coordinator, commit: params => { commits++; chain = params; }, owner: OWNERS.ai,
    });
    session.preview(true);
    expect(commits).toBe(0);
    expect(previews.at(-1)).not.toBeNull();
    session.apply();
    expect(commits).toBe(1);
    expect(previews.at(-1)).toBeNull();

    chain = defaultChain();
    const fresh = createProposalSession(item.proposal, {
      getChain: () => chain, getContext: () => ({ projectId: null, mediaId: 'm1', sampleRate: 48000 }), coordinator, commit: () => {}, owner: OWNERS.ai,
    });
    chain = { ...chain, limiter: { ...chain.limiter, ceiling: -2 } };
    expect(fresh.stale).toBe(true);
    expect(() => fresh.preview(true)).toThrow(/Ask for a new suggestion/);
  });

  test('with the EQ bypassed nothing is suggested, because a cut would not be audible', () => {
    const chain = { ...defaultChain(), eq: { ...defaultChain().eq, enabled: false } };
    const items = buildSuggestions(report({ 250: -14 }), { chain, sampleRate: 48000 });
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({ id: 'eq-bypassed', supported: false, proposal: null });
    expect(items[0].unsupportedReason).toMatch(/EQ is bypassed/);
  });

  test('an applied cut is not suggested again from the same measurement, so cuts cannot stack', () => {
    const measured = report({ 250: -14 });
    const [first] = buildSuggestions(measured, { chain: defaultChain(), sampleRate: 48000 });
    const after = mergeEqProposal(defaultChain(), first.proposal);
    const [again] = buildSuggestions(measured, { chain: after, sampleRate: 48000 });
    expect(again).toMatchObject({ id: 'low-mid-buildup', supported: false, proposal: null });
    expect(again.unsupportedReason).toMatch(/already cuts near 250 Hz \(−3\.0 dB at 250 Hz\)/);
    expect(after.eq.left.filter(b => b.enabled && b.gain < 0)).toHaveLength(1);
  });

  test('only an enabled cut within half an octave blocks a suggestion', () => {
    const withBand = (band, channel = 'left') => {
      const chain = setEqMode(defaultChain(), 'independent');
      chain.eq[channel][0] = { enabled: true, type: 'bell', q: 1, ...band };
      return chain;
    };
    expect(existingCutNear(withBand({ frequency: 300, gain: -2 }), 250)).toMatchObject({ frequency: 300 });
    expect(existingCutNear(withBand({ frequency: 300, gain: -2 }, 'right'), 250)).toMatchObject({ frequency: 300 });
    expect(existingCutNear(withBand({ frequency: 1000, gain: -2 }), 250)).toBeNull(); // two octaves away
    expect(existingCutNear(withBand({ frequency: 250, gain: 2 }), 250)).toBeNull(); // a boost is not a cut
    expect(existingCutNear(withBand({ frequency: 250, gain: -2, enabled: false }), 250)).toBeNull();
    expect(existingCutNear(withBand({ frequency: 250, gain: -2, type: 'high-pass' }), 250)).toBeNull();
  });

  test('A/B trim turns the louder side down and never boosts', () => {
    expect(comparisonTrimDb('B', 2)).toBe(-2); // B louder: B plays lower
    expect(comparisonTrimDb('A', 2)).toBe(0);
    expect(comparisonTrimDb('A', -1.5)).toBe(-1.5); // B quieter (a cut): A plays lower
    expect(comparisonTrimDb('B', -1.5)).toBe(0);
    expect(comparisonTrimDb('A', 0)).toBe(0);
    expect(comparisonTrimDb('B', null)).toBe(0); // not measured yet or silent
    expect(comparisonTrimDb('A', Number.NaN)).toBe(0);
  });
});
