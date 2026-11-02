import React, { useEffect, useRef, useState } from 'react';
import { startRender } from './render-client.js';
import { spaceTailSeconds } from './dsp/chain.js';

const level = (value, unit) => (value === null || value === undefined ? '—' : `${value.toFixed(2).replace('-', '−')} ${unit}`);

// Export of the processed audio (LAS-28): the file's own samples at its own sample rate go through
// the same chain code as the preview, in a worker; latency is compensated so the export has the
// source's exact length. The source file is only read.
export function ExportDialog({ file, params }) {
  const dialog = useRef(null);
  const job = useRef(null);
  const [bitDepth, setBitDepth] = useState(24);
  // LAS-64: with Space on, the export keeps the reverb tail unless the user cuts it.
  const [includeTail, setIncludeTail] = useState(true);
  const tailSeconds = spaceTailSeconds(params);
  const [state, setState] = useState({ phase: 'idle' });
  const [download, setDownload] = useState(null);

  // A finished file belongs to one track and one set of settings; changing either discards it.
  useEffect(() => () => {
    job.current?.cancel();
    job.current = null;
  }, [file, params, includeTail]);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download.url); }, [download]);

  function run() {
    job.current?.cancel();
    setDownload(null);
    setState({ phase: 'running', stage: 'Starting…', fraction: 0 });
    const current = startRender(file, { mode: 'export', params, bitDepth, includeTail: includeTail && tailSeconds > 0 }, ({ stage, fraction }) => {
      if (job.current === current) setState({ phase: 'running', stage, fraction });
    });
    job.current = current;
    current.result.then(({ report, bytes }) => {
      if (job.current !== current) return;
      job.current = null;
      setDownload({ url: URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })), name: report.name, file, params, includeTail });
      setState({ phase: 'done', report });
    }, failure => {
      if (failure.name === 'AbortError') setState({ phase: 'cancelled' });
      else if (job.current === current) setState({ phase: 'error', message: failure.message });
    });
  }

  function cancel() {
    job.current?.cancel();
    job.current = null;
  }

  const fresh = download && download.file === file && download.params === params && download.includeTail === includeTail;
  const running = state.phase === 'running';
  const report = fresh && state.phase === 'done' ? state.report : null;
  const status = running ? state.stage : state.phase === 'cancelled' ? 'Export cancelled.' : report ? 'Export ready.' : state.phase === 'done' ? 'Settings changed since the export; export again.' : '';
  return (
    <>
      <button className="export-button" onClick={() => dialog.current.showModal()} disabled={!file}>Export WAV</button>
      <dialog ref={dialog} className="analysis-dialog" aria-labelledby="export-title" onClose={cancel}>
        <div className="account-heading">
          <h2 id="export-title">Export processed WAV</h2>
          <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close export">×</button>
        </div>
        {file && <p className="analysis-file" title={file.name}>{file.name}</p>}
        <fieldset className="segmented" disabled={running}>
          <legend>Format</legend>
          <label><input type="radio" name="export-depth" checked={bitDepth === 24} onChange={() => setBitDepth(24)} />24-bit PCM</label>
          <label><input type="radio" name="export-depth" checked={bitDepth === 16} onChange={() => setBitDepth(16)} />16-bit PCM + TPDF dither</label>
        </fieldset>
        {tailSeconds > 0 && (
          <fieldset className="segmented" disabled={running}>
            <legend>Reverb tail (Space is on)</legend>
            <label><input type="radio" name="export-tail" checked={includeTail} onChange={() => setIncludeTail(true)} />Include the tail (+{tailSeconds.toFixed(2)} s)</label>
            <label><input type="radio" name="export-tail" checked={!includeTail} onChange={() => setIncludeTail(false)} />Cut at the end of the source</label>
          </fieldset>
        )}
        <p className="fine-print">Same sample rate and channels as the source. 24-bit is written without dither; 16-bit adds triangular (TPDF) dither of ±1 step. The chain's latency is compensated, so the export starts exactly with the source and is exactly as long{tailSeconds > 0 ? ', plus the reverb tail (pre-delay + decay) when it is included' : ''}. Master Level (monitor volume) is not applied.</p>
        <p className="account-status" role="status">{status}</p>
        {running && <progress max={1} value={state.fraction} aria-label="Export progress" />}
        {state.phase === 'error' && <p className="account-error" role="alert">{state.message}</p>}
        {report && (
          <table className="analysis-table">
            <caption>Exported file</caption>
            <tbody>
              {[
                ['Format', `${report.bitDepth}-bit PCM WAV, ${report.sampleRate.toLocaleString('en-US')} Hz, ${report.channels === 1 ? 'mono' : 'stereo'}`],
                ['Dither', report.dither],
                ['Length', `${report.duration.toFixed(3)} s (${report.frames.toLocaleString('en-US')} samples per channel)`],
                ...(report.tailFrames ? [['Reverb tail', `${report.tailFrames.toLocaleString('en-US')} samples after the source (${(report.tailFrames / report.sampleRate).toFixed(3)} s)`]] : []),
                ['Integrated loudness', level(report.integratedLufs, 'LUFS')],
                ['True peak (4× oversampled)', level(report.truePeakDbtp, 'dBTP')],
                ['Sample peak', level(report.samplePeakDbfs, 'dBFS')],
                ['Clipped samples', report.clippedSamples ? `${report.clippedSamples} (turn on the limiter or lower the gain)` : 'None'],
                ['Latency compensated', `${report.latencyCompensatedSamples} samples`],
              ].map(([name, value]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td></tr>)}
            </tbody>
          </table>
        )}
        {report && report.warnings.length > 0 && <ul className="fine-print">{report.warnings.map(text => <li key={text}>{text}</li>)}</ul>}
        <div className="library-actions">
          {running
            ? <button type="button" onClick={cancel}>Cancel export</button>
            : <button type="button" className="primary" onClick={run} disabled={!file}>{report ? 'Export again' : 'Export'}</button>}
          {report && <a className="button-link" href={download.url} download={download.name}>Save {download.name}</a>}
        </div>
      </dialog>
    </>
  );
}
