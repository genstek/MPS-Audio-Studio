// Shared view of the engine's one stem session (LAS-45 Stage 2). The session inside the audio
// engine stays the only owner of stem state; this store just publishes it, so the Stems dialog and
// the channel banks of layouts A–D show and edit the same gain, pan, mute and solo.
// Two slices keep rendering cheap: `state` changes on edits and transport changes; `live` (position
// and meter levels) changes ten times a second while the stems play, from one timer however many
// components listen.
export const STEM_POLL_MS = 100;
const IDLE_STATE = { stems: [], playing: false, duration: 0, rate: null };
const IDLE_LIVE = { position: 0, levels: { stems: [], master: null } };

export function createStemStore({ setTimer = setInterval, clearTimer = clearInterval } = {}) {
  let getEngine = () => null;
  let state = IDLE_STATE;
  let live = IDLE_LIVE;
  let timer = null;
  const stateListeners = new Set();
  const liveListeners = new Set();
  const session = () => getEngine()?.stemSession?.() ?? null;
  const emit = listeners => listeners.forEach(listener => listener());

  function poll() {
    const current = session();
    if (!current || !current.playing()) { refresh(); return; }
    live = { position: current.position(), levels: getEngine().stemLevels() };
    emit(liveListeners);
  }
  // Re-reads the session after any change (an edit, a transport action, stems added or removed).
  function refresh() {
    const current = session();
    state = current
      ? { stems: current.stems(), playing: current.playing(), duration: current.duration(), rate: getEngine().sampleRate() }
      : IDLE_STATE;
    // Meters hold no stale reading once playback has stopped.
    live = current ? { position: current.position(), levels: state.playing ? live.levels : IDLE_LIVE.levels } : IDLE_LIVE;
    if (state.playing && timer === null) timer = setTimer(poll, STEM_POLL_MS);
    if (!state.playing && timer !== null) { clearTimer(timer); timer = null; }
    emit(stateListeners);
    emit(liveListeners);
  }
  return {
    // The app hands over how to reach its engine once that exists (as the meter store does).
    attach(next) { getEngine = next; },
    subscribe(listener) { stateListeners.add(listener); return () => stateListeners.delete(listener); },
    subscribeLive(listener) { liveListeners.add(listener); return () => liveListeners.delete(listener); },
    get: () => state,
    getStems: () => state.stems,
    getLive: () => live,
    refresh,
    // Calls one method of the session (setGain, setPan, setMute, setSolo, setOffset, remove, pause,
    // stop, seek) and publishes the result. Returns false when no session exists.
    act(action, ...args) {
      const current = session();
      if (!current) return false;
      current[action](...args);
      refresh();
      return true;
    },
    // Starts every stem together through the engine (it stops single-track playback first).
    async play() {
      const started = await getEngine().playStems();
      refresh();
      return started;
    },
    // Stops polling; listeners stay (React re-runs effects in development and keeps its subscriptions).
    dispose() { if (timer !== null) clearTimer(timer); timer = null; },
  };
}
