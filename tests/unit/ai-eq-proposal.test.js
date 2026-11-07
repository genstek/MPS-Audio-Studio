import { describe, expect, test, vi } from 'vitest';
import { defaultChain, editBand, setEqMode, validateChain } from '../../src/dsp/chain-params.js';
import { EQ_PROPOSAL_SCHEMA, PROVIDERS, chainRevision, createEqProposal, mergeEqProposal, validateEqPayload } from '../../src/ai/eq-proposal.js';
import { OWNERS, PreviewOwnershipError, createPreviewCoordinator } from '../../src/ai/preview-coordinator.js';
import { createProposalSession } from '../../src/ai/proposal-session.js';

const edit = (over = {}) => ({ channel: 'linked', index: 3, enabled: true, type: 'bell', frequency: 250, gain: -2, q: 1.2, ...over });
const payload = (edits = [edit()], over = {}) => ({ schema: EQ_PROPOSAL_SCHEMA, version: 1, scope: 'master', edits, reason: 'Reduce low-mid build-up.', limitations: 'Based on one measured section.', ...over });
const customised = () => {
  const chain = defaultChain();
  chain.compressor = { ...chain.compressor, enabled: true, ratio: 3 };
  chain.space = { ...chain.space, enabled: true, mix: 33 };
  chain.limiter = { ...chain.limiter, ceiling: -2 };
  return validateChain(chain);
};
const rejects = (input, pattern) => expect(() => validateEqPayload(input)).toThrow(pattern);

describe('EQ proposal contract', () => {
  test('lists the four planned providers, Grok/xAI included', () => {
    expect(PROVIDERS).toEqual(['openai', 'anthropic', 'google-gemini', 'xai-grok']);
  });

  test('a valid EQ-only merge preserves every unrelated module and does not mutate the input', () => {
    const chain = customised();
    const before = JSON.stringify(chain);
    const merged = mergeEqProposal(chain, validateEqPayload(payload()));
    expect(JSON.stringify(chain)).toBe(before);
    for (const key of ['compressor', 'space', 'limiter', 'order', 'schema', 'version']) expect(merged[key]).toEqual(chain[key]);
    expect(merged).not.toBe(chain);
    expect(merged.eq.left[3]).toMatchObject({ enabled: true, frequency: 250, gain: -2 });
  });

  test('linked EQ keeps both channels identical', () => {
    const merged = mergeEqProposal(defaultChain(), payload());
    expect(merged.eq.right).toEqual(merged.eq.left);
  });

  test('independent EQ edits only the requested channel, and linked edits are refused there', () => {
    const chain = setEqMode(defaultChain(), 'independent');
    const merged = mergeEqProposal(chain, payload([edit({ channel: 'right' })]));
    expect(merged.eq.right[3].enabled).toBe(true);
    expect(merged.eq.left).toEqual(chain.eq.left);
    expect(() => mergeEqProposal(chain, payload([edit()]))).toThrow(/independent/);
    expect(() => mergeEqProposal(defaultChain(), payload([edit({ channel: 'left' })]))).toThrow(/linked/);
  });

  test('omitted index takes the first free band; a full EQ is a recoverable error', () => {
    const merged = mergeEqProposal(defaultChain(), payload([edit({ index: undefined })]));
    expect(merged.eq.left[0].enabled).toBe(true);
    let full = defaultChain();
    for (let i = 0; i < 24; i++) full = editBand(full, 'left', i, { enabled: true });
    try {
      mergeEqProposal(full, payload([edit({ index: undefined })]));
      expect.unreachable();
    } catch (failure) {
      expect(failure.code).toBe('no-free-band');
      expect(failure.recoverable).toBe(true);
    }
    // Naming an existing band still works on a full EQ.
    expect(mergeEqProposal(full, payload([edit({ index: 5 })])).eq.left[5].gain).toBe(-2);
  });

  test('rejects invalid payloads', () => {
    rejects(payload([edit({ gain: NaN })]), /finite/);
    rejects(payload([edit({ frequency: Infinity })]), /finite/);
    rejects(payload([edit({ gain: '3' })]), /finite/);
    rejects(payload([edit({ gain: 40 })]), /between/);
    rejects(payload([edit({ q: 0 })]), /between/);
    rejects(payload([edit({ index: 24 })]), /index/);
    rejects(payload([edit({ index: 1.5 })]), /index/);
    rejects(payload([edit({ type: 'notch' })]), /type/);
    rejects(payload([edit({ channel: 'mid' })]), /channel/);
    rejects(payload([edit({ enabled: 1 })]), /enabled/);
    rejects(payload([edit({ extra: 1 })]), /unknown field/);
    rejects(payload([], {}), /1–/);
    rejects({ ...payload(), compressor: { enabled: false } }, /unknown field “compressor”/);
    rejects({ ...payload(), id: 'model-chosen' }, /unknown field “id”/);
    rejects({ ...payload(), scope: 'track' }, /master/);
    rejects({ ...payload(), version: 2 }, /version/);
    rejects(payload([edit()], { reason: '' }), /reason/);
    rejects(null, /object/);
    rejects(JSON.parse('{"schema":"mps-ai-eq-proposal","version":1,"scope":"master","edits":[{"__proto__":{"x":1},"channel":"linked","enabled":true,"type":"bell","frequency":1,"gain":0,"q":1}],"reason":"r","limitations":"l"}'), /./);
  });

  test('rejects duplicate and conflicting edits', () => {
    rejects(payload([edit(), edit({ gain: 1 })]), /conflicts/);
    rejects(payload([edit({ channel: 'left' }), edit({ channel: 'linked' })]), /conflicts/);
    expect(() => validateEqPayload(payload([edit({ channel: 'left' }), edit({ channel: 'right' })]))).not.toThrow();
  });

  test('excessive gain, sub-bass boost and total boost are refused by the EQ guards', () => {
    expect(() => mergeEqProposal(defaultChain(), payload([edit({ gain: 9 })]))).toThrow(/boosts are limited/);
    expect(() => mergeEqProposal(defaultChain(), payload([edit({ gain: -12 })]))).toThrow(/cuts are limited/);
    expect(() => mergeEqProposal(defaultChain(), payload([edit({ frequency: 30, gain: 2 })]))).toThrow(/below 40 Hz/);
    const stacked = payload([0, 1, 2, 3].map(index => edit({ index, frequency: 1000, gain: 4, q: 0.5 })));
    expect(() => mergeEqProposal(defaultChain(), stacked)).toThrow(/combined/);
    try { mergeEqProposal(defaultChain(), payload([edit({ gain: 9 })])); } catch (failure) { expect(failure.code).toBe('guard'); }
  });

  test('frequencies above the sample-rate limit are resolved without crashing', () => {
    expect(() => mergeEqProposal(defaultChain(), payload([edit({ frequency: 19000, gain: 1 })]), { sampleRate: 22050 })).not.toThrow();
  });
});

describe('preview coordinator', () => {
  test('one owner at a time; another cannot silently take over', () => {
    const sink = vi.fn();
    const coordinator = createPreviewCoordinator(sink);
    coordinator.play(OWNERS.reference, defaultChain());
    expect(coordinator.acquire(OWNERS.ai)).toBe(false);
    expect(() => coordinator.play(OWNERS.ai, defaultChain())).toThrow(PreviewOwnershipError);
    expect(sink).toHaveBeenCalledTimes(1);
    expect(coordinator.release(OWNERS.ai)).toBe(false);
    expect(coordinator.holder).toBe(OWNERS.reference);
    expect(coordinator.release(OWNERS.reference)).toBe(true);
    expect(sink).toHaveBeenLastCalledWith(null);
    expect(coordinator.acquire(OWNERS.ai)).toBe(true);
  });

  test('invalid candidates are never audible', () => {
    const sink = vi.fn();
    const coordinator = createPreviewCoordinator(sink);
    const bad = defaultChain();
    bad.limiter.ceiling = 5;
    expect(() => coordinator.play(OWNERS.ai, bad)).toThrow();
    expect(sink).not.toHaveBeenCalled();
    expect(coordinator.holder).toBe(null);
  });

  test('reset cleans up whatever owner is active and is idempotent', () => {
    const sink = vi.fn();
    const coordinator = createPreviewCoordinator(sink);
    coordinator.play(OWNERS.reference, defaultChain());
    coordinator.reset();
    coordinator.reset();
    expect(coordinator.holder).toBe(null);
    expect(sink).toHaveBeenLastCalledWith(null);
  });
});

// A tiny stand-in for useChainSettings: committed params + history, and a preview slot.
function harness({ projectId = 'p1', mediaId = 'm1' } = {}) {
  const state = { params: customised(), history: [], preview: null, context: { projectId, mediaId, sampleRate: 48000 } };
  const coordinator = createPreviewCoordinator(value => { state.preview = value; });
  const deps = owner => ({ getChain: () => state.params, getContext: () => state.context, coordinator, owner, commit: params => { state.history.push(state.params); state.params = params; } });
  const make = (input = payload(), owner = OWNERS.ai) => createProposalSession(createEqProposal(input, { chain: state.params, projectId: state.context.projectId, mediaId: state.context.mediaId, analysis: { lowMidDb: 2.1 } }), deps(owner));
  return { state, coordinator, make };
}

describe('proposal freshness and transactions', () => {
  test('preview and repeated A/B toggles never change committed settings or history', () => {
    const { state, make } = harness();
    const committed = JSON.stringify(state.params);
    const session = make();
    for (let i = 0; i < 5; i++) {
      expect(session.preview(true).eq.left[3].enabled).toBe(true);
      expect(state.preview.eq.left[3].gain).toBe(-2);
      session.preview(false);
      expect(state.preview).toBe(null);
    }
    expect(JSON.stringify(state.params)).toBe(committed);
    expect(state.history).toHaveLength(0);
    expect(session.state).toBe('fresh');
  });

  test('explicit apply commits once, releases the preview and keeps unrelated modules', () => {
    const { state, make, coordinator } = harness();
    const before = state.params;
    const session = make();
    session.preview(true);
    session.apply();
    expect(state.history).toEqual([before]);
    expect(state.preview).toBe(null);
    expect(coordinator.holder).toBe(null);
    expect(state.params.compressor).toEqual(before.compressor);
    expect(state.params.eq.left[3].enabled).toBe(true);
    expect(() => session.apply()).toThrow(/already applied/);
    expect(state.history).toHaveLength(1);
  });

  test('a changed base revision makes the proposal stale and blocks preview and apply', () => {
    const { state, make, coordinator } = harness();
    const session = make();
    session.preview(true);
    state.params = editBand(state.params, 'left', 10, { gain: 1 }); // manual edit
    expect(session.stale).toBe(true);
    expect(coordinator.holder).toBe(null); // the stale preview stopped
    expect(state.preview).toBe(null);
    expect(() => session.preview(true)).toThrow(/out of date/);
    expect(() => session.apply()).toThrow(/out of date/);
    expect(state.history).toHaveLength(0);
  });

  test('project, media and chain replacement also make a proposal stale', () => {
    for (const change of [s => { s.context = { ...s.context, projectId: 'p2' }; }, s => { s.context = { ...s.context, mediaId: 'm2' }; }, s => { s.params = defaultChain(); }]) {
      const { state, make } = harness();
      const session = make();
      change(state);
      expect(() => session.apply()).toThrow(/Ask for a new suggestion/);
    }
  });

  test('revision is stable and sensitive to every module', () => {
    const chain = customised();
    expect(chainRevision(chain)).toBe(chainRevision(structuredClone(chain)));
    const changed = structuredClone(chain);
    changed.limiter.ceiling = -3;
    expect(chainRevision(changed)).not.toBe(chainRevision(chain));
  });

  test('ownership conflict: a proposal cannot preview while the reference proposal holds the slot', () => {
    const { state, make, coordinator } = harness();
    coordinator.play(OWNERS.reference, defaultChain());
    const session = make();
    expect(() => session.preview(true)).toThrow(PreviewOwnershipError);
    expect(coordinator.holder).toBe(OWNERS.reference);
    expect(state.preview).not.toBe(null); // the reference preview is untouched
    expect(session.state).toBe('fresh');
    // Apply is still a distinct explicit action, and does not release another owner's preview.
    coordinator.release(OWNERS.reference);
    expect(session.preview(true)).toBeTruthy();
  });

  test('invalid candidates fail without partial application', () => {
    const { state, make } = harness();
    const session = make(payload([edit({ gain: 9 })]));
    expect(() => session.preview(true)).toThrow(/limited/);
    expect(() => session.apply()).toThrow(/limited/);
    expect(state.preview).toBe(null);
    expect(state.history).toHaveLength(0);
  });

  test('discard (reject/close) restores committed audio', () => {
    const { state, make, coordinator } = harness();
    const session = make();
    session.preview(true);
    session.discard();
    expect(state.preview).toBe(null);
    expect(coordinator.holder).toBe(null);
    expect(session.state).toBe('discarded');
    expect(() => session.preview(true)).toThrow(/already discarded/);
  });

  test('the proposal envelope has an opaque app-owned id, identities and no filenames', () => {
    const { state } = harness();
    const proposal = createEqProposal(payload(), { chain: state.params, projectId: 'p1', mediaId: 'm1' });
    expect(proposal.id).toMatch(/^eqp_[a-z0-9]+$/);
    expect(proposal.base).toEqual({ chainRevision: chainRevision(state.params), projectId: 'p1', mediaId: 'm1' });
    expect(Object.isFrozen(proposal)).toBe(true);
  });
});
