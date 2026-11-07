import React, { useEffect, useRef, useState } from 'react';
import { startRender } from './render-client.js';
import { spaceTailSeconds } from './dsp/chain.js';
import { HelpTip, WithHelp } from './HelpTip.jsx';
import { SUPPORTED_RATES } from './dsp/resample.js';

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
  // LAS-127: destination sample rate (null = keep the source's) and convert-only mode.
  const [targetRate, setTargetRate] = useState(null);
  const [resampleOnly, setResampleOnly] = useState(false);
  const [state, setState] = useState({ phase: 'idle' });
  const [download, setDownload] = useState(null);

  // A finished file belongs to one track and one set of settings; changing either discards it.
  useEffect(() => () => {
    job.current?.cancel();
    job.current = null;
  }, [file, params, includeTail, targetRate, resampleOnly, bitDepth]);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download.url); }, [download]);

  function run() {
    job.current?.cancel();
    setDownload(null);
    setState({ phase: 'running', stage: 'Starting…', fraction: 0 });
    const current = startRender(file, { mode: 'export', params, bitDepth, includeTail: includeTail && tailSeconds > 0 && !resampleOnly, targetSampleRate: targetRate, resampleOnly }, ({ stage, fraction }) => {
      if (job.current === current) setState({ phase: 'running', stage, fraction });
    });
    job.current = current;
    current.result.then(({ report, bytes }) => {
      if (job.current !== current) return;
      job.current = null;
      setDownload({ url: URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })), name: report.name, file, params, includeTail, targetRate, resampleOnly, bitDepth });
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

  const fresh = download && download.file === file && download.params === params && download.includeTail === includeTail && download.targetRate === targetRate && download.resampleOnly === resampleOnly && download.bitDepth === bitDepth;
  const running = state.phase === 'running';
  const report = fresh && state.phase === 'done' ? state.report : null;
  const status = running ? state.stage : state.phase === 'cancelled' ? 'Export cancelled.' : report ? 'Export ready.' : state.phase === 'done' ? 'Settings changed since the export; export again.' : '';
  return (
    <>
      <WithHelp id="master.export" className="export-wrap"><button className="export-button" onClick={() => dialog.current.showModal()} disabled={!file}>Export WAV</button></WithHelp>
      <dialog ref={dialog} className="analysis-dialog" aria-labelledby="export-title" onClose={cancel}>
        <div className="account-heading">
          <h2 id="export-title">Export processed WAV</h2>
          <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close export">×</button>
        </div>
        {file && <p className="analysis-file" title={file.name}>{file.name}</p>}
        <fieldset className="segmented" disabled={running}>
          <legend>Preset</legend>
          <label><input type="radio" name="export-preset" checked={targetRate === 96000 && bitDepth === 24} onChange={() => { setTargetRate(96000); setBitDepth(24); }} />Hi-Res WAV (96 kHz / 24-bit)</label>
          <label><input type="radio" name="export-preset" checked={targetRate === null && bitDepth === 24} onChange={() => { setTargetRate(null); setBitDepth(24); }} />Same as source (24-bit)</label>
        </fieldset>
        <fieldset className="segmented" disabled={running}>
          <legend>Sample rate</legend>
          <label><input type="radio" name="export-rate" checked={targetRate === null} onChange={() => setTargetRate(null)} />Keep original</label>
          {SUPPORTED_RATES.map(rate => <label key={rate}><input type="radio" name="export-rate" checked={targetRate === rate} onChange={() => setTargetRate(rate)} />{rate / 1000} kHz</label>)}
        </fieldset>
        <fieldset className="segmented" disabled={running}>
          <legend>Processing</legend>
          <label><input type="radio" name="export-chain" checked={!resampleOnly} onChange={() => setResampleOnly(false)} />Apply the mastering chain</label>
          <label><input type="radio" name="export-chain" checked={resampleOnly} onChange={() => setResampleOnly(true)} />Convert only (no processing)</label>
        </fieldset>
        <fieldset className="segmented" disabled={running}>
          <legend>Format <HelpTip id="export.format" className="inline" /></legend>
          <label><input type="radio" name="export-depth" checked={bitDepth === 24} onChange={() => setBitDepth(24)} />24-bit PCM</label>
          <label><input type="radio" name="export-depth" checked={bitDepth === 16} onChange={() => setBitDepth(16)} />16-bit PCM + TPDF dither</label>
        </fieldset>
        {tailSeconds > 0 && !resampleOnly && (
          <fieldset className="segmented" disabled={running}>
            <legend>Reverb tail (Space is on) <HelpTip id="export.tail" className="inline" /></legend>
            <label><input type="radio" name="export-tail" checked={includeTail} onChange={() => setIncludeTail(true)} />Include the tail (+{tailSeconds.toFixed(2)} s)</label>
            <label><input type="radio" name="export-tail" checked={!includeTail} onChange={() => setIncludeTail(false)} />Cut at the end of the source</label>
          </fieldset>
        )}
        <p className="fine-print">Channels as the source; sample rate as the source unless you choose one (converted with a band-limited, anti-aliased filter before processing; pitch and duration are unchanged, and upsampling adds no detail). The source file is never modified. 24-bit is written without dither; 16-bit adds triangular (TPDF) dither of ±1 step. The chain's latency is compensated, so the export starts exactly with the source and is exactly as long{tailSeconds > 0 ? ', plus the reverb tail (pre-delay + decay) when it is included' : ''}. Master Level (monitor volume) is not applied.</p>
        <p className="account-status" role="status">{status}</p>
        {running && <progress max={1} value={state.fraction} aria-label="Export progress" />}
        {state.phase === 'error' && <p className="account-error" role="alert">{state.message}</p>}
        {report && (
          <table className="analysis-table">
            <caption>Exported file</caption>
            <tbody>
              {[
                ...(report.resampled ? [['Conversion', `${report.sourceSampleRate.toLocaleString('en-US')} Hz → ${report.sampleRate.toLocaleString('en-US')} Hz (${report.sourceFrames.toLocaleString('en-US')} → ${report.convertedSourceFrames.toLocaleString('en-US')} samples per channel)`]] : []),
                ['Format', `${report.bitDepth}-bit PCM WAV, ${report.sampleRate.toLocaleString('en-US')} Hz, ${report.channels === 1 ? 'mono' : 'stereo'}`],
                ['Dither', report.dither],
                ['Length', `${report.duration.toFixed(3)} s (${report.frames.toLocaleString('en-US')} samples per channel)`],
                ...(report.tailFrames ? [['Reverb tail', `${report.tailFrames.toLocaleString('en-US')} samples after the source (${(report.tailFrames / report.sampleRate).toFixed(3)} s)`]] : []),
                ['Integrated loudness', level(report.integratedLufs, 'LUFS')],
                ['True peak (4× oversampled)', level(report.truePeakDbtp, 'dBTP')],
                ['Sample peak', level(report.samplePeakDbfs, 'dBFS')],
                ['Clipped samples', report.clippedSamples ? `${report.clippedSamples} (${report.resampleOnly ? 'Convert only does not run the limiter; lower the source level, or export with the mastering chain and its limiter on' : 'turn on the limiter or lower the gain'})` : 'None'],
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
