import React, { useEffect, useRef, useState } from 'react';
import { OWNERS } from './ai/preview-coordinator.js';
import { createProposalSession } from './ai/proposal-session.js';
import { buildSuggestions } from './ai/suggestions.js';
import { startAnalysis } from './analysis-client.js';
import { startRender } from './render-client.js';

// Opaque media identity (never the file name or bytes) so a suggestion goes stale when the track is replaced.
const mediaIds = new WeakMap();
let mediaCounter = 0;
const mediaIdOf = file => {
  if (!file) return null;
  if (!mediaIds.has(file)) mediaIds.set(file, `media-${++mediaCounter}`);
  return mediaIds.get(file);
};
const signed = v => `${v > 0 ? '+' : ''}${v.toFixed(1).replace('-', '−')}`;

// LAS-120: user-controlled mastering suggestions. Suggestions come from deterministic measurements
// (no model listens); Preview is B of a level-matched A/B against the current processed chain and
// never changes the settings. Apply is explicit and one undo step. The body is keyed on the file
// and on open/closed, so closing or replacing the file unmounts it and its cleanup ends any preview,
// pending analysis and level trim.
export function SuggestionsPanel({ engine, file, chain, sampleRate }) {
  const [open, setOpen] = useState(false);
  const shown = open && Boolean(file);
  return (
    <section className="suggestions" aria-labelledby="suggestions-title">
      <h3 id="suggestions-title">Suggestions</h3>
      <button type="button" aria-expanded={shown} aria-controls="suggestions-body" onClick={() => setOpen(o => !o)} disabled={!file}>{shown ? 'Close suggestions' : 'Open suggestions'}</button>
      {shown && (
        <div id="suggestions-body" onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
          <SuggestionsBody key={mediaIdOf(file)} engine={engine} file={file} chain={chain} sampleRate={sampleRate} />
        </div>
      )}
    </section>
  );
}

function SuggestionsBody({ engine, file, chain, sampleRate }) {
  const [phase, setPhase] = useState('idle'); // idle | measuring | ready
  const [items, setItems] = useState([]);
  const [sessions, setSessions] = useState({}); // id → proposal session
  const [rejected, setRejected] = useState({});
  const [applied, setApplied] = useState(null);
  const [active, setActive] = useState(null); // id previewing as B
  const [level, setLevel] = useState(null); // null | { differenceDb: number | null }
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const job = useRef(null);
  const saved = useRef(null); // engine loudness match to restore after B
  const chainRef = useRef(chain);
  const engineRef = useRef(engine);
  useEffect(() => { chainRef.current = chain; });
  const mediaId = mediaIdOf(file);

  const restoreLevel = () => {
    if (saved.current) { engineRef.current.current?.setLoudnessMatch(saved.current); saved.current = null; }
  };
  // Cleanup on unmount (close, file replace, project switch): nothing keeps sounding.
  useEffect(() => {
    const coordinator = chain.previews;
    return () => {
      job.current?.cancel();
      job.current = null;
      coordinator.release(OWNERS.ai);
      restoreLevel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A stale chain (any manual edit, undo, redo, replace) ends B. Checked in an effect, never while
  // rendering, because a stale session releases the preview slot.
  const [staleIds, setStaleIds] = useState([]);
  useEffect(() => {
    const ids = Object.entries(sessions).filter(([, session]) => session.stale).map(([id]) => id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStaleIds(previous => (previous.join() === ids.join() ? previous : ids));
    if (ids.length) {
      job.current?.cancel();
      job.current = null;
      restoreLevel();
    }
  }, [chain.params, sessions]);
  const previewAlive = chain.previewOwner === OWNERS.ai;
  const activeId = active !== null && previewAlive ? active : null;

  async function measure() {
    setError('');
    setMessage('');
    setPhase('measuring');
    const current = startAnalysis(file, () => {});
    job.current = current;
    try {
      const report = await current.result;
      if (job.current !== current) return;
      const built = buildSuggestions(report, { chain: chainRef.current.params, sampleRate, mediaId });
      const next = {};
      for (const item of built) {
        if (!item.proposal) continue;
        next[item.id] = createProposalSession(item.proposal, {
          getChain: () => chainRef.current.params,
          getContext: () => ({ projectId: null, mediaId, sampleRate }),
          coordinator: chainRef.current.previews,
          commit: params => chainRef.current.replace(params),
          owner: OWNERS.ai,
        });
      }
      setItems(built);
      setSessions(next);
      setPhase('ready');
    } catch (failure) {
      if (failure.name !== 'AbortError') { setError(failure.message); setPhase('idle'); }
    } finally {
      if (job.current === current) job.current = null;
    }
  }

  function cancelMeasure() {
    job.current?.cancel();
    job.current = null;
    setPhase('idle');
    setMessage('Measurement cancelled.');
  }

  async function preview(item) {
    setError('');
    try {
      const params = sessions[item.id].preview(true); // validated; refuses while a reference preview is active
      setActive(item.id);
      setLevel({ differenceDb: null });
      setMessage(`Previewing “${item.title}” (B). Choose Current (A) to hear your own settings.`);
      job.current?.cancel();
      const now = startRender(file, { mode: 'match', params: chainRef.current.params });
      const candidate = startRender(file, { mode: 'match', params });
      const pending = { cancel: () => { now.cancel(); candidate.cancel(); } };
      job.current = pending;
      const [a, b] = await Promise.all([now.result, candidate.result]);
      if (job.current !== pending) return;
      job.current = null;
      const difference = a.report.processedLufs === null || b.report.processedLufs === null ? null : b.report.processedLufs - a.report.processedLufs;
      setLevel({ differenceDb: difference });
      if (difference !== null && chainRef.current.previewOwner === OWNERS.ai) {
        saved.current ??= engineRef.current.current?.getLoudnessMatch() ?? { processedDb: 0, originalDb: 0 };
        // A louder candidate is turned down to the level of A; a quieter one is never boosted.
        engineRef.current.current?.setLoudnessMatch({ processedDb: saved.current.processedDb - Math.max(0, difference), originalDb: saved.current.originalDb });
      }
    } catch (failure) {
      if (failure.name === 'AbortError') return;
      chainRef.current.previews.release(OWNERS.ai);
      setActive(null);
      setLevel(null);
      setError(failure.message);
    }
  }

  function showA() {
    job.current?.cancel();
    job.current = null;
    chain.previews.release(OWNERS.ai);
    restoreLevel();
    setActive(null);
    setLevel(null);
    setMessage('Playing your current settings (A). Nothing has been applied.');
  }

  function reject(item) {
    job.current?.cancel();
    job.current = null;
    sessions[item.id].discard();
    restoreLevel();
    setRejected(r => ({ ...r, [item.id]: true }));
    setActive(null);
    setLevel(null);
    setMessage(`Rejected “${item.title}”. Your settings are unchanged.`);
  }

  function apply(item) {
    try {
      job.current?.cancel();
      job.current = null;
      restoreLevel();
      sessions[item.id].apply(); // one chain.replace = one undo step
      setApplied(item.id);
      setActive(null);
      setLevel(null);
      setMessage(`Applied “${item.title}” as one undo step. Undo restores your previous settings.`);
    } catch (failure) {
      setActive(null);
      setError(failure.message);
    }
  }

  function levelText() {
    if (!level) return '';
    if (level.differenceDb === null) return 'Level match: measuring, or unavailable because the audio is silent.';
    const amount = Math.abs(level.differenceDb).toFixed(1);
    return level.differenceDb > 0 ? `Level match: B is ${amount} dB louder and is turned down by that amount.` : `Level match: B is ${amount} dB quieter or equal and is not boosted.`;
  }

  return (
    <>
      <p className="fine-print">Computed from deterministic measurements of this file. No AI model listened to your audio. Nothing changes until you press Apply; the file on your device is never modified. Press Escape to close.</p>
      <p className="fine-print" role="status" aria-live="polite">{phase === 'measuring' ? 'Measuring this file…' : message}</p>
      {error && <p className="account-error" role="alert">{error}</p>}
      {phase !== 'ready' && (
        <div className="proposal-buttons">
          <button type="button" onClick={measure} disabled={phase === 'measuring'}>Measure and suggest</button>
          {phase === 'measuring' && <button type="button" onClick={cancelMeasure}>Cancel</button>}
        </div>
      )}
      {items.map(item => {
        const session = sessions[item.id];
        const isApplied = applied === item.id;
        const isRejected = Boolean(rejected[item.id]);
        const isStale = Boolean(session) && !isApplied && !isRejected && staleIds.includes(item.id);
        const usable = item.supported && !isApplied && !isRejected && !isStale;
        const titleId = `suggestion-${item.id}`;
        let status = 'unavailable';
        if (isApplied) status = 'applied';
        else if (isRejected) status = 'rejected';
        else if (isStale) status = 'out of date';
        else if (item.supported) status = 'EQ · measured';
        return (
          <article key={item.id} className="proposal-module" aria-labelledby={titleId}>
            <h4 id={titleId}>{item.title} <span className="proposal-status">{status}</span></h4>
            {item.supported ? (
              <dl>
                <div><dt>Measured evidence</dt>{item.evidence.map(text => <dd key={text}>{text}</dd>)}</div>
                <div><dt>Reason</dt><dd>{item.reason}</dd></div>
                <div><dt>Risk</dt><dd>{item.risk}</dd></div>
                <div><dt>Proposed EQ filters</dt>{item.filters.map(f => <dd key={f.frequency}>Bell {f.frequency} Hz, {signed(f.gain)} dB, Q {f.q}</dd>)}</div>
                <div><dt>Limits</dt><dd>{item.limitations}</dd></div>
              </dl>
            ) : <p className="fine-print">{item.unsupportedReason}</p>}
            {isStale && <p className="fine-print">The settings changed after this suggestion was made. Measure again.</p>}
            {item.supported && (
              <div className="proposal-buttons" role="group" aria-label={`${item.title} actions`}>
                <button type="button" aria-pressed={activeId === item.id} onClick={() => preview(item)} disabled={!usable}>Preview (B)</button>
                <button type="button" onClick={showA} disabled={activeId !== item.id}>Current (A)</button>
                <button type="button" className="primary" onClick={() => apply(item)} disabled={!usable}>Apply suggestion</button>
                <button type="button" onClick={() => reject(item)} disabled={!usable}>Reject</button>
              </div>
            )}
            {activeId === item.id && <p className="fine-print">{levelText()}</p>}
          </article>
        );
      })}
      {phase === 'ready' && (
        <div className="proposal-buttons">
          <button type="button" onClick={chain.undo} disabled={!chain.canUndo}>Undo</button>
          <button type="button" onClick={chain.redo} disabled={!chain.canRedo}>Redo</button>
        </div>
      )}
    </>
  );
}
