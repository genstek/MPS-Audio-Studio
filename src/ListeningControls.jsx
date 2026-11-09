import React, { useEffect, useId, useRef, useState } from 'react';
import { startRender } from './render-client.js';
import { HelpTip } from './HelpTip.jsx';
import { diagnostics, eqSummary, fingerprint } from './diagnostics.js';

// Original/Processed switch (LAS-28). The same source keeps playing; only the audible path changes,
// so the position is kept.
export function ListenSwitch({ value, onChange, disabled, help = null }) {
  const group = useId();
  const control = (
    <fieldset className="segmented listen-switch" disabled={disabled}>
      <legend>Listen to</legend>
      {[['processed', 'Processed'], ['original', 'Original']].map(([option, label]) => (
        <label key={option}><input type="radio" name={group} checked={value === option} onChange={() => onChange(option)} />{label}</label>
      ))}
    </fieldset>
  );
  return help ? <span className="listen-with-help">{control}<HelpTip id={help} className="inline" /></span> : control;
}

// Loudness matching for a fair comparison: the integrated loudness (BS.1770) of the original and of
// the processed render is measured off the main thread, and the louder one is turned down by the
// difference while comparing. Re-measured 0.8 s after the settings stop changing.
export function LoudnessMatch({ engine, file, params }) {
  const [enabled, setEnabled] = useState(true);
  const [result, setResult] = useState({ status: 'idle' });
  const job = useRef(null);
  const renders = useRef(0);

  useEffect(() => {
    if (!file || !enabled) {
      engine.current?.setLoudnessMatch(null);
      return undefined;
    }
    let activeId = null;
    const timer = setTimeout(() => {
      setResult(previous => ({ ...previous, status: 'measuring' }));
      const renderId = ++renders.current;
      activeId = renderId;
      const began = performance.now();
      diagnostics.record('match.render-started', { renderId, fingerprint: fingerprint(params), ...eqSummary(params) });
      const current = startRender(file, { mode: 'match', params });
      job.current = current;
      current.result.then(({ report }) => {
        if (job.current !== current) return;
        const { originalLufs, processedLufs } = report;
        diagnostics.record('match.render-completed', { renderId, durationMs: performance.now() - began, differenceDb: originalLufs === null || processedLufs === null ? null : processedLufs - originalLufs });
        if (originalLufs === null || processedLufs === null) {
          engine.current?.setLoudnessMatch(null);
          setResult({ status: 'silent' });
          return;
        }
        const difference = processedLufs - originalLufs;
        engine.current?.setLoudnessMatch(difference > 0 ? { processedDb: -difference, originalDb: 0 } : { processedDb: 0, originalDb: difference });
        setResult({ status: 'ready', difference, originalLufs, processedLufs });
      }, failure => {
        if (failure.name !== 'AbortError' && job.current === current) setResult({ status: 'error', message: failure.message });
      });
    }, 800);
    return () => {
      clearTimeout(timer);
      if (job.current) diagnostics.record('match.render-cancelled', { renderId: activeId });
      job.current?.cancel();
      job.current = null;
    };
  }, [engine, file, params, enabled]);

  let text = 'Import a track to compare at matched loudness.';
  if (file && !enabled) text = 'Off: both versions play at their own level.';
  else if (file && result.status === 'measuring') text = 'Measuring loudness… Your EQ stays active; when the measurement finishes, the level changes smoothly to keep the comparison fair.';
  else if (file && result.status === 'silent') text = 'Cannot match: the audio is silent.';
  else if (file && result.status === 'error') text = result.message;
  else if (file && result.status === 'ready') {
    const amount = Math.abs(result.difference).toFixed(1);
    text = Math.abs(result.difference) < 0.05
      ? 'Both versions are equally loud.'
      : `Processed is ${amount} dB ${result.difference > 0 ? 'louder' : 'quieter'}; the ${result.difference > 0 ? 'processed' : 'original'} version plays ${amount} dB lower while comparing.`;
  }
  return (
    <div className="loudness-match">
      <span className="toggle-with-help"><label className="toggle"><input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />Match loudness</label><HelpTip id="master.match" className="inline" /></span>
      <p className="fine-print" aria-live="polite">{text}</p>
    </div>
  );
}
