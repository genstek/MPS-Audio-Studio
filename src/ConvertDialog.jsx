import React, { useEffect, useRef, useState } from 'react';
import { startRender } from './render-client.js';
import { readWavHeader } from './dsp/wav-decode.js';
import { SUPPORTED_RATES, checkConversion } from './dsp/resample.js';

const num = value => value.toLocaleString('en-US');
const mib = bytes => `${(bytes / 1048576).toFixed(1)} MiB`;

// LAS-127 (Phase 2): track-level Convert. Shows the track's real source format (read from the
// file header), lets the user pick a destination rate and bit depth, shows the predicted result,
// and renders through the same worker as Export (convert only: no chain). Non-destructive: the
// source file and the session are untouched; the converted WAV is a separate download, so there
// is nothing to apply or undo in the project.
export function ConvertDialog({ file }) {
  const dialog = useRef(null);
  const job = useRef(null);
  const [read, setRead] = useState({ file: null });
  const [targetRate, setTargetRate] = useState(96000);
  const [bitDepth, setBitDepth] = useState(24);
  const [state, setState] = useState({ phase: 'idle' });
  const [download, setDownload] = useState(null);

  useEffect(() => {
    let live = true;
    file.slice(0, 4096).arrayBuffer()
      .then(head => { if (live) setRead({ file, source: readWavHeader(head, file.size) }); })
      .catch(error => { if (live) setRead({ file, error: error.message || 'The source format could not be read.' }); });
    return () => { live = false; };
  }, [file]);
  const source = read.file === file ? read.source : null;
  const sourceError = read.file === file ? read.error : '';

  useEffect(() => () => {
    job.current?.cancel();
    job.current = null;
  }, [file, targetRate, bitDepth]);
  useEffect(() => () => { if (download) URL.revokeObjectURL(download.url); }, [download]);

  let plan = null;
  let planError = '';
  if (source) {
    try {
      const frames = checkConversion({ frames: source.frames, channels: source.channels, inRate: source.sampleRate, outRate: targetRate, bitDepth });
      // Working memory: float32 input + output per channel (the worker holds both at once).
      plan = { frames, bytes: 44 + frames * source.channels * (bitDepth / 8), memory: (source.frames + frames) * source.channels * 4, noop: targetRate === source.sampleRate };
    } catch (error) { planError = error.message; }
  }

  function run() {
    job.current?.cancel();
    setDownload(null);
    setState({ phase: 'running', stage: 'Starting…', fraction: 0 });
    const current = startRender(file, { mode: 'export', bitDepth, targetSampleRate: targetRate, resampleOnly: true, includeTail: false }, ({ stage, fraction }) => {
      if (job.current === current) setState({ phase: 'running', stage, fraction });
    });
    job.current = current;
    current.result.then(({ report, bytes }) => {
      if (job.current !== current) return;
      job.current = null;
      setDownload({ url: URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' })), name: report.name, file, targetRate, bitDepth });
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

  const running = state.phase === 'running';
  const fresh = download && download.file === file && download.targetRate === targetRate && download.bitDepth === bitDepth;
  const report = fresh && state.phase === 'done' ? state.report : null;
  const status = running ? state.stage : state.phase === 'cancelled' ? 'Conversion cancelled.' : report ? 'Conversion ready.' : state.phase === 'done' ? 'Settings changed since the conversion; convert again.' : '';
  return (
    <>
      <button type="button" className="convert-button" onClick={() => dialog.current.showModal()}>Convert</button>
      <dialog ref={dialog} className="analysis-dialog" aria-labelledby="convert-title" onClose={cancel}>
        <div className="account-heading">
          <h2 id="convert-title">Convert / Resample track</h2>
          <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close convert">×</button>
        </div>
        <p className="analysis-file" title={file.name}>{file.name}</p>
        {sourceError && <p className="account-error" role="alert">{sourceError}</p>}
        {source && (
          <table className="analysis-table">
            <caption>Source and target</caption>
            <tbody>
              <tr><th scope="row">Source</th><td>{source.bitsPerSample}-bit {source.encoding === 'float' ? 'float' : 'PCM'} WAV, {num(source.sampleRate)} Hz, {source.channels === 1 ? 'mono' : `${source.channels} ch`}, {num(source.frames)} samples per channel ({source.duration.toFixed(3)} s)</td></tr>
              <tr><th scope="row">Target</th><td>{bitDepth}-bit PCM WAV, {num(targetRate)} Hz{plan ? `, ${num(plan.frames)} samples per channel (${(plan.frames / targetRate).toFixed(3)} s), about ${mib(plan.bytes)}` : ''}</td></tr>
              {plan && <tr><th scope="row">Working memory</th><td>about {mib(plan.memory)}</td></tr>}
            </tbody>
          </table>
        )}
        <fieldset className="segmented" disabled={running}>
          <legend>Target sample rate</legend>
          {SUPPORTED_RATES.map(rate => <label key={rate}><input type="radio" name="convert-rate" checked={targetRate === rate} onChange={() => setTargetRate(rate)} />{rate / 1000} kHz</label>)}
        </fieldset>
        <fieldset className="segmented" disabled={running}>
          <legend>Target bit depth</legend>
          <label><input type="radio" name="convert-depth" checked={bitDepth === 24} onChange={() => setBitDepth(24)} />24-bit PCM</label>
          <label><input type="radio" name="convert-depth" checked={bitDepth === 16} onChange={() => setBitDepth(16)} />16-bit PCM + TPDF dither</label>
        </fieldset>
        {plan?.noop && <p className="fine-print">The target rate equals the source rate: only the bit depth changes (no resampling).</p>}
        {source && plan && !plan.noop && <p className="fine-print">{targetRate > source.sampleRate ? 'Upsampling adds no detail above the source\'s bandwidth.' : 'Downsampling removes content above the new Nyquist frequency.'} Pitch and duration are unchanged. The mastering chain is not applied.</p>}
        <p className="fine-print">Non-destructive: the source file and your session are not modified. The converted WAV is a separate download, so there is nothing to apply or undo.</p>
        {planError && <p className="account-error" role="alert">{planError}</p>}
        <p className="account-status" role="status">{status}</p>
        {running && <progress max={1} value={state.fraction} aria-label="Conversion progress" />}
        {state.phase === 'error' && <p className="account-error" role="alert">{state.message}</p>}
        {report && (
          <table className="analysis-table">
            <caption>Converted file</caption>
            <tbody>
              <tr><th scope="row">Format</th><td>{report.bitDepth}-bit PCM WAV, {num(report.sampleRate)} Hz, {report.channels === 1 ? 'mono' : 'stereo'}</td></tr>
              <tr><th scope="row">Length</th><td>{report.duration.toFixed(3)} s ({num(report.frames)} samples per channel; source {num(report.sourceFrames)} samples at {num(report.sourceSampleRate)} Hz)</td></tr>
              <tr><th scope="row">Clipped samples</th><td>{report.clippedSamples || 'None'}</td></tr>
            </tbody>
          </table>
        )}
        {report && report.warnings.length > 0 && <ul className="fine-print">{report.warnings.map(text => <li key={text}>{text}</li>)}</ul>}
        <div className="library-actions">
          {running
            ? <button type="button" onClick={cancel}>Cancel conversion</button>
            : <button type="button" className="primary" onClick={run} disabled={!source || !plan}>{report ? 'Convert again' : 'Convert'}</button>}
          {report && <a className="button-link" href={download.url} download={download.name}>Save {download.name}</a>}
        </div>
      </dialog>
    </>
  );
}
