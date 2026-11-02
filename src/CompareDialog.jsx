import React, { useId, useRef, useState } from 'react';
import { api } from './account-api.js';
import { startAnalysis } from './analysis-client.js';
import { startRender } from './render-client.js';
import { readWavHeader } from './dsp/wav-decode.js';
import { audioFileSizeProblem } from './file-limits.js';
import { compareToReference, matchLevels } from './reference-comparison.js';
import { ProposalPanel } from './ProposalPanel.jsx';

const UNAVAILABLE = 'Accounts are unavailable right now; choose a reference WAV on this device instead.';
const number = (value, digits) => {
  const text = value.toFixed(digits);
  return Number(text) === 0 ? text.replace('-', '') : text.replace('-', '−'); // no "−0.0"
};
const value = (v, unit, digits = 1) => (v === null || v === undefined ? '—' : `${number(v, digits)}${unit ? ` ${unit}` : ''}`);
const difference = (v, unit, digits = 1) => (v === null || v === undefined ? '—' : `${v > 0 ? '+' : ''}${number(v, digits)}${unit ? ` ${unit}` : ''}`);
const section = s => `${s.start.toFixed(1)}–${s.end.toFixed(1)} s`;
const CONDITION_LABELS = { unsupported: 'Not compared', uncertain: 'Uncertain', note: 'Note' };

async function sha256(bytes) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}

function Results({ result }) {
  const digits = row => (row.unit === '' ? 2 : 1);
  const groups = [...new Set(result.rows.map(row => row.group))];
  return (
    <div className="comparison-results">
      <div className="table-scroll" role="region" aria-label="Measured differences" tabIndex={0}>
      <table className="analysis-table comparison-table">
        <caption>Measured on the selected sections. Mix {section(result.sections.mix)}, reference {section(result.sections.reference)}.</caption>
        <thead>
          <tr><th scope="col">Measure</th><th scope="col">Reference</th><th scope="col">Mix</th><th scope="col">Processed mix</th><th scope="col">Mix − reference</th><th scope="col">Processed − reference</th></tr>
        </thead>
        {groups.map(group => (
          <tbody key={group}>
            <tr className="comparison-group"><th scope="colgroup" colSpan={6}>{group}</th></tr>
            {result.rows.filter(row => row.group === group).map(row => (
              <tr key={row.measure} className={row.status === 'small' ? 'comparison-small' : undefined}>
                <th scope="row" title={row.explanation}>{row.measure}<span className="fine-print comparison-explanation">{row.explanation}</span></th>
                <td>{value(row.reference, row.unit, digits(row))}</td>
                <td>{value(row.original, row.unit, digits(row))}</td>
                <td>{value(row.processed, row.unit, digits(row))}</td>
                <td>{row.status === 'not comparable' ? 'not compared' : difference(row.originalDifference, row.differenceUnit, digits(row))}</td>
                <td>{row.status === 'not comparable' ? 'not compared' : difference(row.processedDifference, row.differenceUnit, digits(row))}</td>
              </tr>
            ))}
          </tbody>
        ))}
      </table>
      </div>
      <h4>Limits of this comparison</h4>
      <ul className="comparison-conditions">
        {result.conditions.map(condition => <li key={condition.text}><strong>{CONDITION_LABELS[condition.level]}:</strong> {condition.text}</li>)}
      </ul>
      <h4>Interpretation (not a measurement)</h4>
      <ul className="comparison-interpretations">
        {result.interpretations.map(note => <li key={note.text}>{note.text}{note.confidence === 'uncertain' ? ' (uncertain: see the limits above)' : ''}</li>)}
      </ul>
    </div>
  );
}

// Mix-versus-reference comparison (LAS-31). Measures the chosen mix section (original and as
// processed with the current settings) and a reference section, shows measured differences with
// units and the limits of the comparison, and loops both at matched loudness through the output
// stage. Choosing or comparing a reference never changes the processing settings; only applying a
// proposal does (LAS-32), as one undo step.
export function CompareDialog({ engine, file, track, chain, onMonitorStart }) {
  const { params } = chain;
  const dialog = useRef(null);
  const jobs = useRef([]);
  const latestRun = useRef(0); // a comparison that was superseded or closed never shows its result
  const radio = useId();
  const [source, setSource] = useState('saved');
  const [profiles, setProfiles] = useState([]);
  const [accounts, setAccounts] = useState(null); // null: unknown; 'signed-in' | 'signed-out' | 'unavailable'
  const [profileId, setProfileId] = useState('');
  const [local, setLocal] = useState(null); // { file, header }
  const [referenceRange, setReferenceRange] = useState({ start: 0, end: 0 });
  const [mixRange, setMixRange] = useState({ start: 0, end: 0 });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [monitor, setMonitor] = useState({ on: false, audible: 'reference' });

  const cancelJobs = () => { jobs.current.forEach(job => job.cancel()); jobs.current = []; };

  async function open() {
    setError('');
    if (result && result.file !== file) setResult(null); // a comparison belongs to one track
    setMixRange({ start: 0, end: Number(Math.min(track.duration, 30).toFixed(1)) });
    dialog.current.showModal();
    const session = await api('/auth/session');
    if (session.unavailable) { setAccounts('unavailable'); setSource('local'); return; }
    if (!session.data.user) { setAccounts('signed-out'); setSource('local'); return; }
    setAccounts('signed-in');
    const list = await api('/profiles');
    const available = list.ok ? list.data.profiles : [];
    setProfiles(available);
    if (!available.length) setSource('local');
    setProfileId(id => (available.some(p => p.id === id) ? id : available[0]?.id ?? ''));
  }

  function close() {
    latestRun.current++;
    cancelJobs();
    chain.setPreview(null);
    engine.current.stopComparison();
    setMonitor(m => ({ ...m, on: false }));
    setBusy('');
  }

  async function chooseLocal(event) {
    const chosen = event.target.files[0];
    event.target.value = '';
    if (!chosen) return;
    try {
      const tooLarge = audioFileSizeProblem(chosen.size);
      if (tooLarge) throw new Error(tooLarge);
      const header = readWavHeader(await chosen.slice(0, 65536).arrayBuffer(), chosen.size);
      setLocal({ file: chosen, header });
      setReferenceRange({ start: 0, end: Number(Math.min(header.duration, 30).toFixed(1)) });
      setError('');
    } catch (failure) {
      setLocal(null);
      setError(failure.message);
    }
  }

  // The reference section's analysis report and its WAV bytes (for the monitor).
  async function measureReference(onStage) {
    if (source === 'local') {
      const { start, end } = { start: Number(referenceRange.start), end: Number(referenceRange.end) };
      if (!(end > start && start >= 0 && end <= local.header.duration + 1e-9)) throw new Error(`Choose a reference section inside the file (0 to ${local.header.duration.toFixed(1)} s).`);
      const job = startAnalysis(local.file, onStage, { start, end });
      jobs.current.push(job);
      return { report: await job.result, bytes: await local.file.arrayBuffer(), label: local.file.name, profileId: null };
    }
    const chosen = profiles.find(p => p.id === profileId);
    onStage('Reading the saved reference…');
    const full = await api(`/profiles/${chosen.id}`);
    const link = await api(`/assets/${chosen.assetId}/download-link`, { method: 'POST' });
    if (full.unavailable || link.unavailable) throw new Error(UNAVAILABLE);
    if (!full.ok || !link.ok) throw new Error('The saved reference could not be read. Sign in again.');
    const response = await fetch(link.data.url, { credentials: 'same-origin' });
    if (!response.ok) throw new Error('The saved reference file could not be downloaded.');
    const bytes = await response.arrayBuffer();
    // The stored measurements are used only for the exact file they were made from.
    if (await sha256(bytes) !== full.data.profile.input.sha256) throw new Error('The stored reference file does not match its profile (checksums differ); measure it again in References.');
    return { report: full.data.profile, bytes, label: `${chosen.name} (${chosen.style}, ${chosen.sourceVersion})`, profileId: chosen.id };
  }

  async function compare(event) {
    event.preventDefault();
    const run = ++latestRun.current;
    cancelJobs();
    chain.setPreview(null);
    engine.current.stopComparison();
    setMonitor(m => ({ ...m, on: false }));
    setResult(null);
    setError('');
    const mix = { start: Number(mixRange.start), end: Number(mixRange.end) };
    if (!(mix.end > mix.start && mix.start >= 0 && mix.end <= track.duration + 1e-9)) return setError(`Choose a mix section inside the track (0 to ${track.duration.toFixed(1)} s).`);
    if (source === 'local' && !local) return setError('Choose a reference WAV.');
    if (source === 'saved' && !profileId) return setError('Choose a saved reference.');
    const usedParams = params;
    setBusy('Measuring the mix section…');
    try {
      const render = startRender(file, { mode: 'compare', params: usedParams, segment: mix }, ({ stage }) => setBusy(stage));
      jobs.current.push(render);
      const { report: measured } = await render.result;
      const reference = await measureReference(stage => setBusy(stage));
      if (run !== latestRun.current) return;
      const comparison = compareToReference(reference.report, measured.original, measured.processed);
      jobs.current = [];
      setResult({
        ...comparison,
        id: run,
        file,
        params: usedParams,
        reference,
        sections: { mix: measured.original.input.segment, reference: reference.report.input.segment },
        gains: matchLevels({ processedDb: measured.processed.loudness.integratedLufs, originalDb: measured.original.loudness.integratedLufs, referenceDb: reference.report.loudness.integratedLufs }),
      });
      setBusy('');
    } catch (failure) {
      if (run !== latestRun.current) return;
      setBusy('');
      if (failure.name !== 'AbortError') setError(failure.message);
    }
  }

  async function toggleMonitor() {
    if (monitor.on) {
      engine.current.stopComparison();
      return setMonitor(m => ({ ...m, on: false }));
    }
    setError('');
    try {
      const started = await engine.current.startComparison({
        referenceBytes: result.reference.bytes, mixSection: result.sections.mix, referenceSection: result.sections.reference,
        gains: result.gains, audible: monitor.audible,
      });
      if (started) { onMonitorStart(); setMonitor(m => ({ ...m, on: true })); }
    } catch (failure) {
      setError(failure.message);
    }
  }

  // New matching gains after the previewed proposal was measured (LAS-32).
  function updateGains(gains) {
    setResult(r => ({ ...r, gains }));
    engine.current.compareListen(monitor.audible, gains);
  }

  function hear(audible) {
    setMonitor(m => ({ ...m, audible }));
    engine.current.compareListen(audible);
  }

  const stale = result && result.params !== params;
  const names = { reference: 'Reference', original: 'Mix', processed: 'Processed mix' };
  const gainText = result && Object.entries(names).map(([key, name]) => `${name} ${difference(result.gains[`${key}Db`], 'dB')}`).join(', ');
  const range = (state, set, label) => ['start', 'end'].map(key => (
    <label key={key}>{`${label} ${key} (s)`}<input type="number" min="0" step="0.1" required value={state[key]} onChange={e => set(r => ({ ...r, [key]: e.target.value }))} /></label>
  ));
  return (
    <>
      <button className="analyze-track" onClick={open} aria-label="Compare with a reference">Compare</button>
      <dialog ref={dialog} className="analysis-dialog compare-dialog" aria-labelledby="compare-title" onClose={close}>
        <div className="account-heading">
          <h2 id="compare-title">Compare with a reference</h2>
          <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close comparison">×</button>
        </div>
        <p className="fine-print">Measures a section of your mix (as imported and as processed with the current settings) and a section of a reference, then lets you listen to them at matched loudness. Comparing changes no settings; the reference is not processed.</p>
        <p className="account-status" role="status">{busy || (result ? `Compared with ${result.reference.label}.` : '')}</p>
        {error && <p className="account-error" role="alert">{error}</p>}
        <form className="compare-form" onSubmit={compare}>
          <fieldset className="segmented">
            <legend>Reference</legend>
            <label><input type="radio" name={radio} checked={source === 'saved'} onChange={() => setSource('saved')} disabled={accounts !== 'signed-in' || !profiles.length} />Saved reference</label>
            <label><input type="radio" name={radio} checked={source === 'local'} onChange={() => setSource('local')} />WAV on this device</label>
          </fieldset>
          {accounts === 'signed-out' && <p className="fine-print">Sign in (Account) to use saved references.</p>}
          {accounts === 'unavailable' && <p className="fine-print">{UNAVAILABLE}</p>}
          {accounts === 'signed-in' && !profiles.length && <p className="fine-print">No saved references yet (References).</p>}
          {source === 'saved' && profiles.length > 0 && (
            <label>Saved reference
              <select value={profileId} onChange={e => setProfileId(e.target.value)}>
                {profiles.map(p => <option key={p.id} value={p.id}>{p.name} · {p.style} · {p.sourceVersion} · {section(p.segment)}</option>)}
              </select>
            </label>
          )}
          {source === 'local' && (
            <>
              <label className="file-picker small">Choose reference WAV<input type="file" accept=".wav,audio/wav" aria-label="Choose reference WAV" onChange={chooseLocal} /></label>
              {local && <p className="fine-print">{local.file.name}: {local.header.duration.toFixed(1)} s, {local.header.sampleRate.toLocaleString('en-US')} Hz, {local.header.channels === 1 ? 'mono' : 'stereo'}</p>}
              {local && <div className="compare-range">{range(referenceRange, setReferenceRange, 'Reference')}</div>}
            </>
          )}
          <div className="compare-range">{range(mixRange, setMixRange, 'Mix')}</div>
          <button type="submit" className="primary" disabled={Boolean(busy)}>Measure and compare</button>
        </form>
        {result && (
          <>
            {stale && <p className="analysis-note">The settings changed since this comparison: the processed column and its matching gain are out of date. Measure again.</p>}
            <section className="compare-monitor" aria-labelledby="monitor-title">
              <h3 id="monitor-title">Listen at matched loudness</h3>
              <fieldset className="segmented" aria-label="Monitor">
                {Object.entries(names).map(([key, name]) => (
                  <label key={key}><input type="radio" name={`${radio}-monitor`} checked={monitor.audible === key} onChange={() => hear(key)} />{name}</label>
                ))}
              </fieldset>
              <button type="button" onClick={toggleMonitor}>{monitor.on ? 'Stop monitor' : 'Start monitor'}</button>
              <p className="fine-print" aria-live="polite">{monitor.on
                ? `Looping the mix ${section(result.sections.mix)} and the reference ${section(result.sections.reference)}. Matching gains: ${gainText}.`
                : `Each section loops on its own; the louder versions are turned down to the quietest (${gainText}).`}</p>
            </section>
            <Results result={result} />
            <ProposalPanel key={result.id} file={file} result={result} chain={chain} jobs={jobs} onCheckedGains={updateGains} />
          </>
        )}
      </dialog>
    </>
  );
}
