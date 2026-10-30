import { useEffect, useRef, useState } from 'react';
import { defaultChain } from './dsp/chain-params.js';

const COALESCE_MS = 600;

// Chain settings with undo/redo (LAS-28). update(change, key) applies change(params) → params;
// edits with the same key less than COALESCE_MS apart (a drag, a held arrow key) form one undo
// step. Every applied value goes to the engine, which validates it again. A preview (LAS-32) plays
// other settings without changing the settings or their history; setPreview(null) ends it.
export function useChainSettings(engine) {
  const [state, setState] = useState(() => ({ params: defaultChain(), past: [], future: [] }));
  const [warnings, setWarnings] = useState([]);
  const [problem, setProblem] = useState('');
  const [preview, setPreview] = useState(null);
  const last = useRef({ key: null, time: 0 });
  const live = preview ?? state.params;

  useEffect(() => {
    let current = true;
    engine.current?.setChain(live).then(
      next => current && (setWarnings(next), setProblem('')),
      failure => current && setProblem(failure.message),
    );
    return () => { current = false; };
  }, [engine, live]);

  function update(change, key = null) {
    const now = Date.now();
    const merge = key !== null && last.current.key === key && now - last.current.time < COALESCE_MS;
    last.current = { key, time: now };
    setState(previous => {
      let next;
      try {
        next = change(previous.params);
      } catch (failure) {
        setProblem(failure.message);
        return previous;
      }
      if (next === previous.params) return previous;
      return { params: next, past: merge ? previous.past : [...previous.past, previous.params].slice(-100), future: [] };
    });
  }

  // Replaces all settings as one undo step (loading a file or a snapshot).
  const replace = params => update(() => params);

  function undo() {
    last.current = { key: null, time: 0 };
    setState(({ params, past, future }) => (past.length ? { params: past.at(-1), past: past.slice(0, -1), future: [params, ...future] } : { params, past, future }));
  }

  function redo() {
    last.current = { key: null, time: 0 };
    setState(({ params, past, future }) => (future.length ? { params: future[0], past: [...past, params], future: future.slice(1) } : { params, past, future }));
  }

  return { params: state.params, update, replace, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0, warnings, problem, previewing: preview !== null, setPreview };
}
