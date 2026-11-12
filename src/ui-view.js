// LAS-45: Classic / Console 2.0 view preference. A local UI preference only: it is not part of a
// project, a preset or an export, and never reaches the audio engine. When storage is blocked the
// choice still works for the session and the app falls back to Classic on the next load.
export const VIEW_KEY = 'mps.uiView';
export const VIEWS = ['classic', 'console'];

// Reading `localStorage` itself can throw when a browser blocks storage, so it stays inside try.
export function readStoredView(storage) {
  try {
    const saved = (storage ?? globalThis.localStorage).getItem(VIEW_KEY);
    return VIEWS.includes(saved) ? saved : 'classic';
  } catch {
    return 'classic';
  }
}

// Returns true when the preference was saved, false when storage is unavailable.
export function storeView(view, storage) {
  try {
    (storage ?? globalThis.localStorage).setItem(VIEW_KEY, view);
    return true;
  } catch {
    return false;
  }
}
