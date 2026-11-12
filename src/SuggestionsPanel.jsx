import React, { useEffect, useRef, useState } from 'react';
import { OWNERS } from './ai/preview-coordinator.js';
import { createProposalSession } from './ai/proposal-session.js';
import { chainRevision } from './ai/eq-proposal.js';
import { buildSuggestions, comparisonTrimDb } from './ai/suggestions.js';
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
// pending analysis and A/B trim. The A/B trim is the engine's own preview trim, separate from Match
// loudness, so the two never overwrite each other.
export function SuggestionsPanel({ engine, file, chain, projectId, sampleRate }) {
  const [open, setOpen] = useState(false);
  const shown = open && Boolean(file);
  return (
    <section className="suggestions" aria-labelledby="suggestions-title">
      <h3 id="suggestions-title">Suggestions</h3>
      <button type="button" aria-expanded={shown} aria-controls="suggestions-body" onClick={() => setOpen(o => !o)} disabled={!file}>{shown ? 'Close suggestions' : 'Open suggestions'}</button>
      {shown && (
        <div id="suggestions-body" onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
          <SuggestionsBody key={mediaIdOf(file)} engine={engine} file={file} chain={chain} projectId={projectId ?? null} sampleRate={sampleRate} />
        </div>
      )}
    </section>
  );
}

function SuggestionsBody({ engine, file, chain, projectId, sampleRate }) {
  const [phase, setPhase] = useState('idle'); // idle | measuring | ready
  const [items, setItems] = useState([]);
  const [sessions, setSessions] = useState({}); // id → proposal session
  const [rejected, setRejected] = useState({});
  const [applied, setApplied] = useState(null); // { id, revision } of the chain that Apply produced
  // The A/B of one suggestion: which side is audible, and B − A in LUFS once both are measured.
  const [compare, setCompare] = useState(null); // null | { id, side: 'A' | 'B', level: 'measuring' | 'ready' | 'silent', differenceDb }
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const analysisJob = useRef(null);
  const levelJob = useRef(null);
  const chainRef = useRef(chain);
  const engineRef = useRef(engine);
  const compareRef = useRef(compare);
  const projectRef = useRef(projectId); // the open project's id: a New, Open or Save As makes suggestions stale
  useEffect(() => { chainRef.current = chain; compareRef.current = compare; projectRef.current = projectId; });
  const mediaId = mediaIdOf(file);

  const setTrim = db => engineRef.current.current?.setPreviewTrim(db);
  const cancelLevel = () => { levelJob.current?.cancel(); levelJob.current = null; };
  // Ends any A/B: stops its level measurement, frees the preview slot and removes the trim.
  const endCompare = () => {
    cancelLevel();
    chainRef.current.previews.release(OWNERS.ai);
    setTrim(0);
    setCompare(null);
  };

  // Cleanup on unmount (close, file replace, project switch): nothing keeps sounding or stays trimmed.
  useEffect(() => {
    const coordinator = chain.previews;
    const target = engineRef.current;
    return () => {
      analysisJob.current?.cancel();
      analysisJob.current = null;
      levelJob.current?.cancel();
      levelJob.current = null;
      coordinator.release(OWNERS.ai);
      target.current?.setPreviewTrim(0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The louder side of the A/B is turned down once both levels are known; nothing is boosted.
  const previewAlive = chain.previewOwner === OWNERS.ai;
  const live = compare !== null && (compare.side === 'A' || previewAlive);
  const trimDb = live && compare.level === 'ready' ? comparisonTrimDb(compare.side, compare.differenceDb) : 0;
  useEffect(() => { engineRef.current.current?.setPreviewTrim(trimDb); }, [trimDb]);

  // A stale chain (any manual edit, undo, redo, replace) or another project id ends the A/B of a stale
  // suggestion. Checked in an effect, never while rendering, because a stale session releases the
  // preview slot.
  const [staleIds, setStaleIds] = useState([]);
  useEffect(() => {
    const ids = Object.entries(sessions).filter(([, session]) => session.stale).map(([id]) => id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStaleIds(previous => (previous.join() === ids.join() ? previous : ids));
    if (compareRef.current && ids.includes(compareRef.current.id)) {
      levelJob.current?.cancel();
      levelJob.current = null;
      setCompare(null);
    }
  }, [chain.params, sessions, projectId]);

  async function measure() {
    endCompare();
    Object.values(sessions).forEach(session => session.discard());
    setItems([]);
    setSessions({});
    setRejected({});
    setApplied(null);
    setError('');
    setMessage('');
    setPhase('measuring');
    const current = startAnalysis(file, () => {});
    analysisJob.current = current;
    try {
      const report = await current.result;
      if (analysisJob.current !== current) return;
      const built = buildSuggestions(report, { chain: chainRef.current.params, sampleRate, projectId: projectRef.current, mediaId });
      const next = {};
      for (const item of built) {
        if (!item.proposal) continue;
        next[item.id] = createProposalSession(item.proposal, {
          getChain: () => chainRef.current.params,
          getContext: () => ({ projectId: projectRef.current, mediaId, sampleRate }),
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
      if (analysisJob.current === current) analysisJob.current = null;
    }
  }

  function cancelMeasure() {
    analysisJob.current?.cancel();
    analysisJob.current = null;
    setPhase('idle');
    setMessage('Measurement cancelled.');
  }

  async function preview(item) {
    setError('');
    try {
      const params = sessions[item.id].preview(true); // validated; refuses while a reference preview is active
      setMessage(`Previewing “${item.title}” (B). Choose Current (A) to hear your own settings.`);
      if (compare?.id === item.id) { // back to B of the same A/B: its levels are already known or still measuring
        setCompare({ ...compare, side: 'B' });
        return;
      }
      cancelLevel();
      setCompare({ id: item.id, side: 'B', level: 'measuring', differenceDb: null });
      const now = startRender(file, { mode: 'match', params: chainRef.current.params });
      const candidate = startRender(file, { mode: 'match', params });
      const pending = { cancel: () => { now.cancel(); candidate.cancel(); } };
      levelJob.current = pending;
      const [a, b] = await Promise.all([now.result, candidate.result]);
      if (levelJob.current !== pending) return;
      levelJob.current = null;
      const known = a.report.processedLufs !== null && b.report.processedLufs !== null;
      const differenceDb = known ? b.report.processedLufs - a.report.processedLufs : null;
      setCompare(current => (current?.id === item.id ? { ...current, level: known ? 'ready' : 'silent', differenceDb } : current));
    } catch (failure) {
      if (failure.name === 'AbortError') return;
      endCompare();
      setError(failure.message);
    }
  }

  function showA() {
    chain.previews.release(OWNERS.ai); // the committed settings play again
    setCompare(current => (current ? { ...current, side: 'A' } : current));
    setMessage('Playing your current settings (A). Nothing has been applied.');
  }

  function stopComparing() {
    endCompare();
    setMessage('Comparison ended. Your settings are unchanged.');
  }

  function reject(item) {
    endCompare();
    sessions[item.id].discard();
    setRejected(r => ({ ...r, [item.id]: true }));
    setMessage(`Rejected “${item.title}”. Your settings are unchanged.`);
  }

  function apply(item) {
    try {
      endCompare();
      const params = sessions[item.id].apply(); // one chain.replace = one undo step
      setApplied({ id: item.id, revision: chainRevision(params) });
      setMessage(`Applied “${item.title}” as one undo step. Undo restores your previous settings.`);
    } catch (failure) {
      setError(failure.message);
    }
  }

  function levelText() {
    if (!compare || compare.level === 'measuring') return 'Level match: measuring both versions…';
    if (compare.level === 'silent') return 'Level match unavailable: the audio is silent.';
    const difference = compare.differenceDb;
    const amount = Math.abs(difference).toFixed(1);
    if (Math.abs(difference) < 0.05) return 'Level match: A and B are equally loud.';
    return difference > 0
      ? `Level match: B is ${amount} dB louder, so B plays ${amount} dB lower while comparing.`
      : `Level match: B is ${amount} dB quieter, so A plays ${amount} dB lower while comparing.`;
  }

  const revision = applied ? chainRevision(chain.params) : null;
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
        const wasApplied = applied?.id === item.id;
        const isApplied = wasApplied && revision === applied.revision; // an Undo or edit after Apply makes it out of date
        const isRejected = Boolean(rejected[item.id]);
        const isStale = Boolean(session) && !isApplied && !isRejected && (wasApplied || staleIds.includes(item.id));
        const usable = item.supported && !wasApplied && !isRejected && !isStale;
        const comparing = compare?.id === item.id;
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
            {isStale && <p className="fine-print">Your settings or project changed after this suggestion was made. Choose Measure again.</p>}
            {item.supported && (
              <div className="proposal-buttons" role="group" aria-label={`${item.title} actions`}>
                <button type="button" aria-pressed={comparing && live && compare.side === 'B'} onClick={() => preview(item)} disabled={!usable}>Preview (B)</button>
                <button type="button" aria-pressed={comparing && compare.side === 'A'} onClick={showA} disabled={!comparing}>Current (A)</button>
                <button type="button" onClick={stopComparing} disabled={!comparing}>End comparison</button>
                <button type="button" className="primary" onClick={() => apply(item)} disabled={!usable}>Apply suggestion</button>
                <button type="button" onClick={() => reject(item)} disabled={!usable}>Reject</button>
              </div>
            )}
            {comparing && <p className="fine-print">{levelText()}</p>}
          </article>
        );
      })}
      {phase === 'ready' && (
        <div className="proposal-buttons">
          <button type="button" onClick={measure}>Measure again</button>
          <button type="button" onClick={chain.undo} disabled={!chain.canUndo}>Undo</button>
          <button type="button" onClick={chain.redo} disabled={!chain.canRedo}>Redo</button>
        </div>
      )}
    </>
  );
}
