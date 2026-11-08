// UI presentation preference (LAS-58/75/76). Browser/app-local, never part of a project, preset or export,
// and never read by the audio engine.
export const UI_MODE_KEY = 'mps.uiMode';
export const UI_SKIN_KEY = 'mps.processorSkin';
export const UI_MODES = ['normal', 'processors'];
export const UI_SKINS = ['rack', 'console'];

function read(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

export function initialUiMode(search = window.location.search) {
  if (new URLSearchParams(search).get('design') === 'processors') return 'processors';
  const saved = read(UI_MODE_KEY);
  return UI_MODES.includes(saved) ? saved : 'normal';
}

export function initialSkin() {
  const saved = read(UI_SKIN_KEY);
  return UI_SKINS.includes(saved) ? saved : 'rack';
}

export function storeUi(key, value) {
  try { localStorage.setItem(key, value); } catch { /* storage unavailable: preference lasts for this session */ }
}
