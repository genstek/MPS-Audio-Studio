// LAS-45: Studio Layout is a presentation-only preference. It is kept in this browser's
// localStorage (never in a project, preset or export) and falls back to Classic whenever storage
// is unavailable or holds an unknown value.
export const LAYOUT_KEY = 'mps.studioLayout';
export const LAYOUTS = [
  { id: 'classic', label: 'Classic' },
  { id: 'a', label: 'A · Console Focus' },
  { id: 'b', label: 'B · Analog Strip Wall' },
  { id: 'c', label: 'C · Mastering Hybrid' },
  { id: 'd', label: 'D · Digital Console Suite' },
];
export const DEFAULT_LAYOUT = 'classic';

export function isLayout(id) { return LAYOUTS.some(layout => layout.id === id); }

export function readLayout(storage) {
  try {
    const saved = (storage ?? localStorage).getItem(LAYOUT_KEY);
    return isLayout(saved) ? saved : DEFAULT_LAYOUT;
  } catch {
    return DEFAULT_LAYOUT;
  }
}

export function writeLayout(id, storage) {
  try { (storage ?? localStorage).setItem(LAYOUT_KEY, id); return true; } catch { return false; }
}
