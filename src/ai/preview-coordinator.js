import { validateChain } from '../dsp/chain-params.js';

// Single-owner preview (MPS-AI-01). One preview slot exists in the chain hook; this coordinator
// says who may use it. The reference proposal and the future AI assistant each use an owner name;
// a second owner cannot take the slot while another holds it, and release always restores the
// committed audio. Candidates are validated before they can be heard. It never touches the
// committed settings or their undo history: `sink(params|null)` is the hook's preview setter.
export const OWNERS = Object.freeze({ reference: 'reference-proposal', ai: 'ai-eq' });

export class PreviewOwnershipError extends Error {
  constructor(message, holder) {
    super(message);
    this.holder = holder;
  }
}

export function createPreviewCoordinator(sink) {
  let holder = null;
  const listeners = new Set();
  const notify = () => listeners.forEach(listener => listener(holder));

  const api = {
    get holder() { return holder; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    // Claims the slot. Returns false (without side effects) when another owner holds it.
    acquire(owner) {
      if (!owner) throw new TypeError('A preview owner name is required.');
      if (holder !== null && holder !== owner) return false;
      if (holder !== owner) { holder = owner; notify(); }
      return true;
    },
    // Plays `params` (validated first) for `owner`. Throws PreviewOwnershipError on a conflict and
    // the chain validation error on bad settings; in both cases what is playing does not change.
    play(owner, params) {
      if (holder !== null && holder !== owner) throw new PreviewOwnershipError(`Another preview (${holder}) is active; end it first.`, holder);
      const clean = validateChain(params);
      api.acquire(owner);
      sink(clean);
      return clean;
    },
    // Ends the owner's preview and frees the slot. A non-owner cannot release it. Idempotent.
    release(owner) {
      if (holder !== owner) return false;
      holder = null;
      sink(null);
      notify();
      return true;
    },
    // Unconditional cleanup (close, project or media replacement, legacy callers).
    reset() {
      const was = holder !== null;
      holder = null;
      sink(null);
      if (was) notify();
    },
  };
  return api;
}
