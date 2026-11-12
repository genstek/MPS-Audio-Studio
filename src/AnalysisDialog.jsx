import React, { useEffect, useRef, useState } from 'react';
import { startAnalysis } from './analysis-client.js';
import { AnalysisTimeline } from './AnalysisTimeline.jsx';

// Number formatting: one decimal for levels, a sign for values that can be either side of zero.
const fixed = (value, digits = 1) => {
  const text = value.toFixed(digits);
  return Number(text) === 0 ? text.replace('-', '') : text.replace('-', '−'); // no "−0.0"
};
const signed = (value, digits = 1) => `${value > 0 ? '+' : ''}${fixed(value, digits)}`;
const level = (value, unit, digits = 1) => (value === null ? '—' : `${fixed(value, digits)} ${unit}`);
const clock = seconds => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;

function loudnessNote(loudness) {
  if (loudness.state === 'silent') return 'Silent: no part of the audio is above the −70 LUFS gate.';
  if (loudness.state === 'too-short') return 'Too short to measure loudness (under 0.4 seconds).';
  return null;
}

function Report({ report }) {
  const { input, loudness, peaks, levels, clipping, stereo, spectrum } = report;
  const note = loudnessNote(loudness);
  const rows = [
    ['Integrated loudness', level(loudness.integratedLufs, 'LUFS')],
    ['Loudness range', level(loudness.rangeLu, 'LU')],
    ['Max momentary loudness (400 ms)', level(loudness.momentaryMaxLufs, 'LUFS')],
    ['Max short-term loudness (3 s)', loudness.state === 'ok' && loudness.shortTermMaxLufs === null ? 'Needs 3 seconds' : level(loudness.shortTermMaxLufs, 'LUFS')],
    [`True peak (${peaks.oversampling}× oversampled)`, level(peaks.truePeakDbtp, 'dBTP', 2)],
    ['Sample peak', level(peaks.samplePeakDbfs, 'dBFS', 2)],
    ['RMS level', level(levels.rmsDbfs, 'dBFS')],
    ['Crest factor (sample peak − RMS)', level(levels.crestFactorDb, 'dB')],
    ['Peak to loudness ratio (true peak − integrated)', level(levels.plrDb, 'dB')],
    ['DC offset', levels.dcOffset.map(offset => `${signed(offset * 100, 3)} %`).join(' / ')],
    ['Clipping (full-scale runs of 3+ samples)', clipping.clippedRuns ? `${clipping.clippedRuns} runs, ${clipping.clippedSamples} samples at full scale` : clipping.clippedSamples ? `None; ${clipping.clippedSamples} isolated full-scale samples` : 'None detected'],
  ];
  const stereoRows = stereo && [
    ['Correlation (L/R)', stereo.correlation === null ? '—' : signed(stereo.correlation, 2)],
    ['Side relative to mid', stereo.channelsIdentical ? 'No side signal (left = right)' : level(stereo.sideToMidDb, 'dB')],
    ['Balance (left − right)', stereo.balanceDb === null ? '—' : `${signed(stereo.balanceDb)} dB`],
    ['Loudness change in mono', stereo.monoLoudnessChangeDb === null ? (stereo.correlation !== null && stereo.correlation < -0.9 ? 'Cancels to silence' : '—') : `${signed(stereo.monoLoudnessChangeDb)} LU`],
  ];
  const table = (caption, entries) => (
    <table className="analysis-table">
      <caption>{caption}</caption>
      <tbody>{entries.map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td></tr>)}</tbody>
    </table>
  );
  return (
    <div className="analysis-report">
      {note && <p className="analysis-note">{note}</p>}
      {table('Loudness, peaks and dynamics', rows)}
      {stereoRows ? table('Stereo', stereoRows) : <p className="fine-print">Mono file: stereo measures do not apply.</p>}
      {spectrum.bands.length ? (
        <table className="analysis-table spectrum-table">
          <caption>Spectrum: share of energy per octave band</caption>
          <thead><tr><th scope="col">Band</th><th scope="col">Share</th><th scope="col">Relative to total</th></tr></thead>
          <tbody>{spectrum.bands.map(band => (
            <tr key={band.centreHz}>
              <th scope="row">{band.centreHz >= 1000 ? `${band.centreHz / 1000} kHz` : `${band.centreHz} Hz`}</th>
              <td><span className="spectrum-bar" aria-hidden="true"><span style={{ width: `${Math.round(band.share * 100)}%` }} /></span>{(band.share * 100).toFixed(1)} %</td>
              <td>{band.levelDb === null || band.levelDb < -90 ? 'below −90 dB' : level(band.levelDb, 'dB')}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : <p className="fine-print">Spectrum needs at least 8,192 samples.</p>}
      <p className="analysis-meta">
        {report.version} · {input.sampleRate.toLocaleString('en-US')} Hz · {input.channels === 1 ? 'mono' : 'stereo'} · {input.bitsPerSample}-bit {input.encoding === 'float' ? 'float' : 'PCM'} · whole file {clock(input.segment.start)}–{clock(input.segment.end)}
        <br />Source SHA-256 <code data-testid="source-sha256">{input.sha256}</code>
      </p>
    </div>
  );
}

// Analysis of the imported file (LAS-26). The work runs in a Web Worker; the file is only read.
export function AnalysisDialog({ file, renderRate = null, onSeek = () => {}, onAudition = () => {} }) {
  const dialog = useRef(null);
  const job = useRef(null);
  // Every state names the file it belongs to; a report of another file is never shown.
  const [saved, setState] = useState({ phase: 'idle', file });
  const state = saved.file === file ? saved : { phase: 'idle', file };

  function cancel() {
    job.current?.cancel();
    job.current = null;
  }

  // A new or removed track ends any analysis of the old one.
  useEffect(() => () => cancel(), [file]);

  function run() {
    cancel();
    setState({ phase: 'running', stage: 'Starting analysis…', file });
    const current = startAnalysis(file, stage => job.current === current && setState({ phase: 'running', stage, file }), undefined, { timeline: { hopSeconds: 1 } });
    job.current = current;
    current.result.then(
      report => job.current === current && setState({ phase: 'done', report, file }),
      failure => {
        if (failure.name === 'AbortError') setState({ phase: 'cancelled', file });
        else if (job.current === current) setState({ phase: 'error', message: failure.message, file });
      },
    ).finally(() => {
      if (job.current === current) job.current = null;
    });
  }

  // Closing the dialog does not stop a running analysis: the transport stays usable meanwhile and
  // reopening shows its progress or result. Cancel, a new track or removing the track stops it.
  function open() {
    dialog.current.showModal();
    if (state.phase === 'idle') run();
  }

  const running = state.phase === 'running';
  const status = running ? state.stage : state.phase === 'done' ? 'Analysis complete.' : state.phase === 'cancelled' ? 'Analysis cancelled.' : '';
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
        {state.phase === 'done' && state.report.timeline && <AnalysisTimeline timeline={state.report.timeline} renderRate={renderRate} onSeek={onSeek} onAudition={onAudition} />}
        {state.phase === 'done' && <Report report={state.report} />}
        <div className="library-actions">
          {running
            ? <button type="button" onClick={cancel}>Cancel analysis</button>
            : <button type="button" onClick={run} disabled={!file}>{state.phase === 'done' ? 'Analyze again' : 'Try again'}</button>}
        </div>
        <p className="fine-print">Measured on this device from the file's own samples; the file is only read, never changed or uploaded.</p>
      </dialog>
    </>
  );
}
