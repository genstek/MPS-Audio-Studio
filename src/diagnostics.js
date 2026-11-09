// Opt-in playback diagnostics (LAS-166). A bounded ring buffer of small events that explain why the
// processed sound changed: EQ edits, chain revisions, worklet ACK/refusal, chain resets, output
// gains, Match Loudness renders and preview ownership. Off by default; when off, record() returns
// at once. Privacy: only numbers, booleans and short enum-like strings are kept. File names, paths,
// messages, audio and spectra are never accepted (strings longer than 40 chars or with path/space
// characters are dropped). Nothing is sent anywhere; export() returns JSON on demand.
// record() is called from the main thread only; the audio thread just adds two counters to the
// meters message it already posts.
export const CAPACITY = 500;
const SAFE_STRING = /^[A-Za-z0-9_.:-]{1,40}$/;

export function createDiagnostics({ capacity = CAPACITY, now = () => performance.now(), wall = () => Date.now(), buildSha = 'unknown', enabled = false } = {}) {
  let on = enabled;
  let events = [];
  let dropped = 0;
  let seq = 0;
  const counters = { resets: 0, nonFiniteInputs: 0, processorErrors: 0, refusals: 0 };
  const sanitize = data => {
    const clean = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === 'number') clean[key] = Number.isFinite(value) ? Math.round(value * 1000) / 1000 : String(value);
      else if (typeof value === 'boolean' || value === null) clean[key] = value;
      else if (typeof value === 'string' && SAFE_STRING.test(value)) clean[key] = value;
    }
    return clean;
  };
  return {
    get enabled() { return on; },
    enable() { on = true; },
    disable() { on = false; },
    clear() { events = []; dropped = 0; seq = 0; Object.keys(counters).forEach(key => { counters[key] = 0; }); },
    record(type, data = {}) {
      if (!on) return;
      if (events.length >= capacity) { events.shift(); dropped++; }
      events.push({ seq: seq++, t: Math.round(now() * 100) / 100, wall: wall(), type, ...sanitize(data) });
    },
    count(name, by = 1) { if (on && name in counters) counters[name] += by; },
    // Worklet counters are cumulative; keep the largest seen so a restarted processor never lowers them.
    setCounter(name, value) { if (on && name in counters && Number.isFinite(value)) counters[name] = Math.max(counters[name], value); },
    export() {
      return JSON.stringify({ schema: 'mps-diagnostics-1', buildSha, enabled: on, capacity, dropped, counters: { ...counters }, events }, null, 2);
    },
  };
}

// A short stable fingerprint of numbers (FNV-1a over the JSON), so two states can be compared
// without storing their values.
export function fingerprint(value) {
  const text = JSON.stringify(value) ?? '';
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 0x01000193) >>> 0; }
  return hash.toString(16).padStart(8, '0');
}

// A compact, value-free summary of the EQ part of a chain: enabled flag and how many bands are active.
export function eqSummary(params) {
  const eq = params?.eq;
  const active = list => (Array.isArray(list) ? list.filter(band => band && band.enabled === true && Math.abs(band.gain ?? 0) > 0.001).length : 0);
  return { eqEnabled: eq?.enabled === true, activeBandsL: active(eq?.left), activeBandsR: active(eq?.right) };
}

/* global __BUILD_SHA__ */
const sha = typeof __BUILD_SHA__ === 'string' ? __BUILD_SHA__ : 'unknown';
const flagged = (() => {
  try { return globalThis.localStorage?.getItem('mps-diagnostics') === '1'; } catch { return false; }
})();
// The app-wide instance. Enable with localStorage.setItem('mps-diagnostics','1') and reload, or
// window.mpsDiagnostics.enable(); read with window.mpsDiagnostics.export().
export const diagnostics = createDiagnostics({ buildSha: sha, enabled: flagged });
if (typeof window !== 'undefined') window.mpsDiagnostics = diagnostics;
