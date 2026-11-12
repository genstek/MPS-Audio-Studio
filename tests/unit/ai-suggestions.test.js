import { describe, expect, test } from 'vitest';
import { defaultChain, setEqMode } from '../../src/dsp/chain-params.js';
import { buildSuggestions, bandExcess, SUGGESTION_SOURCE } from '../../src/ai/suggestions.js';
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
});
