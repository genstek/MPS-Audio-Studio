import { EqProposalError, chainRevision, mergeEqProposal } from './eq-proposal.js';

// Freshness and transaction rules for one EQ proposal (MPS-AI-01), reusable by a later UI.
// A proposal is valid only for the chain revision, project and media it was made against. Any manual
// edit, chain replacement, project or media change makes it stale; a stale proposal can neither
// preview nor apply. Apply is a separate explicit call and commits through `commit` (the hook's
// replace) as ONE undo step. Preview never counts as apply.
//
// deps: { getChain(): params, getContext(): { projectId, mediaId, sampleRate }, coordinator, commit(params), owner }
export function createProposalSession(proposal, deps) {
  const { getChain, getContext, coordinator, commit, owner } = deps;
  let state = 'fresh'; // fresh | stale | applied | discarded

  function staleReason() {
    const context = getContext();
    if (chainRevision(getChain()) !== proposal.base.chainRevision) return 'The settings changed after this suggestion was made.';
    if ((context.projectId ?? null) !== proposal.base.projectId) return 'The project changed.';
    if ((context.mediaId ?? null) !== proposal.base.mediaId) return 'The track changed.';
    return null;
  }

  function markStale() {
    state = 'stale';
    coordinator.release(owner); // a stale suggestion must not keep sounding
  }

  function check() {
    if (state === 'applied' || state === 'discarded') throw new EqProposalError(`This suggestion was already ${state}.`, 'stale');
    const reason = state === 'stale' ? 'This suggestion is out of date.' : staleReason();
    if (reason) {
      markStale();
      throw new EqProposalError(`${reason} Ask for a new suggestion.`, 'stale');
    }
  }

  // The processed chain this proposal would give: a fresh copy, validated, never committed.
  const candidate = () => mergeEqProposal(getChain(), proposal, { sampleRate: getContext().sampleRate });

  return {
    get id() { return proposal.id; },
    get state() { return state; },
    get stale() {
      if (state === 'fresh' && staleReason()) markStale();
      return state === 'stale';
    },
    // B of the future A/B: plays the validated candidate. preview(false) returns to A (committed).
    preview(on = true) {
      check();
      if (!on) { coordinator.release(owner); return null; }
      const params = candidate(); // validated before anything is audible
      coordinator.play(owner, params);
      return params;
    },
    // Explicit commit: revalidates freshness, then one replace() call = one undo step.
    apply() {
      check();
      const params = candidate();
      coordinator.release(owner);
      commit(params);
      state = 'applied';
      return params;
    },
    discard() {
      coordinator.release(owner);
      if (state !== 'applied') state = 'discarded';
    },
  };
}
