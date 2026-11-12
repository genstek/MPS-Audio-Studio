import React, { useEffect, useRef, useState } from 'react';
import { startAnalysis } from './analysis-client.js';
import { displayRows, describeInput } from './analysis-display.js';
import { FORMATS, reportBlob, reportFileName, saveReport } from './analysis-report.js';
import { AnalysisTimeline } from './AnalysisTimeline.jsx';

/* global __APP_VERSION__ */
const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : null;

function Report({ report }) {
  const { input } = report;
  const { note, loudnessRows, stereoRows, bands } = displayRows(report);
  const table = (caption, entries) => (
    <table className="analysis-table">
      <caption>{caption}</caption>
      <tbody>{entries.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody>
    </table>
  );
  return (
    <div className="analysis-report">
      {note && <p className="analysis-note">{note}</p>}
      {table('Loudness, peaks and dynamics', loudnessRows)}
      {stereoRows ? table('Stereo', stereoRows) : <p className="fine-print">Mono file: stereo measures do not apply.</p>}
      {bands.length ? (
        <table className="analysis-table spectrum-table">
          <caption>Spectrum: share of energy per octave band</caption>
          <thead><tr><th scope="col">Band</th><th scope="col">Share</th><th scope="col">Relative to total</th></tr></thead>
          <tbody>{bands.map(band => (
            <tr key={band.key}>
              <th scope="row">{band.label}</th>
              <td><span className="spectrum-bar" aria-hidden="true"><span style={{ width: `${Math.round(band.share * 100)}%` }} /></span>{band.shareText}</td>
              <td>{band.levelText}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : <p className="fine-print">Spectrum needs at least 8,192 samples.</p>}
      <p className="analysis-meta">
        {describeInput(report)}
        <br />Source SHA-256 <code data-testid="source-sha256">{input.sha256}</code>
      </p>
    </div>
  );
}

// Analysis of the imported file (LAS-26). The work runs in a Web Worker; the file is only read.
export function AnalysisDialog({ file, renderRate = null, onSeek = () => {}, onAudition = () => {}, onReport = null }) {
  const dialog = useRef(null);
  const job = useRef(null);
  // Every state names the file it belongs to; a report of another file is never shown.
  const [saved, setState] = useState({ phase: 'idle', file });
  const state = saved.file === file ? saved : { phase: 'idle', file };
  // Saving the report (LAS-172) is keyed to the same file and to the run it was started from.
  const [saving, setSaving] = useState({ phase: 'idle', file });
  const [choosing, setChoosing] = useState(false);
  const savePhase = saving.file === file && saving.report === state.report ? saving : { phase: 'idle' };

  function cancel() {
    job.current?.cancel();
    job.current = null;
  }

  // A new or removed track ends any analysis of the old one.
  useEffect(() => () => cancel(), [file]);

  // LAS-45: the studio layouts show the finished report's headline values; the same report object.
  const finished = state.phase === 'done' ? state.report : null;
  useEffect(() => { onReport?.(finished ? { file, report: finished } : null); }, [finished, file, onReport]);

  function run() {
    cancel();
    setChoosing(false);
    setState({ phase: 'running', stage: 'Starting analysis…', file });
    const current = startAnalysis(file, stage => job.current === current && setState({ phase: 'running', stage, file }), undefined, { timeline: { hopSeconds: 1 } });
    job.current = current;
    current.result.then(
      report => job.current === current && setState({ phase: 'done', report, analyzedAt: new Date(), file }),
      failure => {
        if (failure.name === 'AbortError') setState({ phase: 'cancelled', file });
        else if (job.current === current) setState({ phase: 'error', message: failure.message, file });
      },
    ).finally(() => {
      if (job.current === current) job.current = null;
    });
  }

  // Saves the report already on screen: the same object, never a new run, and only a finished one.
  async function save(format) {
    if (state.phase !== 'done' || savePhase.phase === 'saving') return;
    const { report, analyzedAt } = state;
    setChoosing(false);
    setSaving({ phase: 'saving', file, report });
    try {
      const fileName = reportFileName(report.input.name, analyzedAt, FORMATS[format].extension);
      const blob = reportBlob(report, format, { analyzedAt, app: { version: APP_VERSION } });
      const outcome = await saveReport(blob, fileName, format);
      if (outcome.status === 'cancelled') setSaving({ phase: 'cancelled', file, report });
      else setSaving({ phase: 'saved', file, report, message: outcome.status === 'saved' ? `Report saved as ${outcome.fileName}.` : `Report download started: ${outcome.fileName}. Check your downloads folder.` });
    } catch (error) {
      setSaving({ phase: 'error', file, report, message: `The report could not be saved${error?.message ? `: ${error.message}` : '.'}` });
    }
  }

  // Closing the dialog does not stop a running analysis: the transport stays usable meanwhile and
  // reopening shows its progress or result. Cancel, a new track or removing the track stops it.
  function open() {
    dialog.current.showModal();
    if (state.phase === 'idle') run();
  }

  const running = state.phase === 'running';
  const done = state.phase === 'done';
  const status = running ? state.stage : done ? 'Analysis complete.' : state.phase === 'cancelled' ? 'Analysis cancelled.' : '';
  return (
    <>
      <button className="analyze-track" onClick={open} disabled={!file}>{running ? 'Analyzing…' : 'Analyze'}</button>
      <dialog ref={dialog} className="analysis-dialog" aria-labelledby="analysis-title">
        <div className="account-heading">
          <h2 id="analysis-title">Track analysis</h2>
          <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close analysis">×</button>
        </div>
        {file && <p className="analysis-file" title={file.name}>{file.name}</p>}
        <p className="account-status" role="status">{status}</p>
        {state.phase === 'error' && <p className="account-error" role="alert">{state.message}</p>}
        {done && state.report.timeline && <AnalysisTimeline timeline={state.report.timeline} renderRate={renderRate} onSeek={onSeek} onAudition={onAudition} />}
        {done && <Report report={state.report} />}
        {done && savePhase.phase === 'saved' && <p className="account-status" role="status" data-testid="save-status">{savePhase.message}</p>}
        {done && savePhase.phase === 'cancelled' && <p className="fine-print" role="status" data-testid="save-status">Save cancelled. No report was written.</p>}
        {done && savePhase.phase === 'error' && <p className="account-error" role="alert">{savePhase.message}</p>}
        <div className="library-actions">
          {running
            ? <button type="button" onClick={cancel}>Cancel analysis</button>
            : <button type="button" onClick={run} disabled={!file}>{done ? 'Analyze again' : 'Try again'}</button>}
          {done && (
            <button type="button" aria-haspopup="true" aria-expanded={choosing} onClick={() => setChoosing(value => !value)} disabled={!file || savePhase.phase === 'saving'}>
              {savePhase.phase === 'saving' ? 'Saving…' : 'Save report…'}
            </button>
          )}
          {done && choosing && (
            <span role="group" aria-label="Report format" className="library-actions">
              <button type="button" onClick={() => save('pdf')}>Save as PDF</button>
              <button type="button" onClick={() => save('json')}>Save as JSON</button>
            </span>
          )}
        </div>
        <p className="fine-print">Measured on this device from the file's own samples; the file is only read, never changed or uploaded.</p>
      </dialog>
    </>
  );
}
