import React, { useRef, useState } from 'react';
import { api, uploadFile } from './account-api.js';
import { startAnalysis } from './analysis-client.js';
import { readWavHeader } from './dsp/wav-decode.js';
import { compareProfiles, keyMeasures, MIN_SEGMENT_SECONDS, tonalBalance, toProfile } from './reference-profiles.js';

const UNAVAILABLE = 'Accounts are unavailable right now. Measuring still works on this device.';
const show = (value, unit, digits = 1) => (value === null || value === undefined ? '—' : `${value.toFixed(digits).replace('-', '−')}${unit ? ` ${unit}` : ''}`);
const percent = value => `${Math.round(value * 100)} %`;

function Measures({ profile }) {
  const balance = tonalBalance(profile);
  return (
    <table className="analysis-table">
      <caption>Measured segment {profile.input.segment.start.toFixed(1)}–{profile.input.segment.end.toFixed(1)} s</caption>
      <tbody>
        {keyMeasures(profile).map(({ name, value, unit }) => <tr key={name}><th scope="row">{name}</th><td>{show(value, unit, name === 'Correlation' ? 2 : 1)}</td></tr>)}
        <tr><th scope="row">Tonal balance (low / mid / high)</th><td>{percent(balance.low)} / {percent(balance.mid)} / {percent(balance.high)}</td></tr>
      </tbody>
    </table>
  );
}

// Reference profiles (LAS-30): measure a segment of a reference WAV on this device; save the file
// and its profile to the private library (signed in); list, reanalyse and delete saved profiles.
// A profile is a set of measurements; nothing is trained or learned from it.
export function ReferencesDialog() {
  const dialog = useRef(null);
  const job = useRef(null);
  const [file, setFile] = useState(null);
  const [header, setHeader] = useState(null);
  const [form, setForm] = useState({ start: 0, end: 0, name: '', style: '', sourceVersion: '' });
  const [measured, setMeasured] = useState(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [signedIn, setSignedIn] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [checks, setChecks] = useState({});

  const feedback = (note, problem = '') => { setMessage(note); setError(problem); };

  async function refresh() {
    const session = await api('/auth/session');
    if (session.unavailable) { setSignedIn(false); return feedback('', UNAVAILABLE); }
    setSignedIn(Boolean(session.data.user));
    if (!session.data.user) return setProfiles([]);
    const list = await api('/profiles');
    if (list.ok) setProfiles(list.data.profiles);
  }

  async function open() {
    dialog.current.showModal();
    await refresh();
  }

  async function choose(event) {
    const chosen = event.target.files[0];
    event.target.value = '';
    if (!chosen) return;
    setMeasured(null);
    try {
      const info = readWavHeader(await chosen.slice(0, 65536).arrayBuffer(), chosen.size);
      setFile(chosen);
      setHeader(info);
      setForm({ start: 0, end: Number(Math.min(info.duration, 30).toFixed(1)), name: chosen.name.replace(/\.wav$/i, ''), style: '', sourceVersion: '' });
      feedback(`${chosen.name}: ${info.duration.toFixed(1)} s, ${info.sampleRate.toLocaleString('en-US')} Hz, ${info.channels === 1 ? 'mono' : 'stereo'}. Choose the segment to measure.`);
    } catch (failure) {
      setFile(null);
      setHeader(null);
      feedback('', failure.message);
    }
  }

  function measure(event) {
    event.preventDefault();
    const start = Number(form.start), end = Number(form.end);
    if (!(end - start >= MIN_SEGMENT_SECONDS)) return feedback('', `Choose a segment of at least ${MIN_SEGMENT_SECONDS} seconds.`);
    if (start < 0 || end > header.duration + 1e-9) return feedback('', `Choose a segment inside the file (0 to ${header.duration.toFixed(1)} s).`);
    setMeasured(null);
    setBusy('Measuring the segment…');
    feedback('');
    job.current?.cancel();
    const current = startAnalysis(file, stage => setBusy(stage), { start, end });
    job.current = current;
    current.result.then(report => {
      setBusy('');
      if (report.loudness.state !== 'ok') return feedback('', report.loudness.state === 'silent' ? 'This segment is silent; choose one with music.' : 'This segment is too short to measure.');
      setMeasured({ report, file });
      feedback(report.clipping.clippedRuns ? `Measured. Note: ${report.clipping.clippedRuns} clipped runs; the reference may be distorted.` : 'Measured.');
    }, failure => { setBusy(''); if (failure.name !== 'AbortError') feedback('', failure.message); });
  }

  async function save() {
    setBusy('Saving to your private library…');
    feedback('');
    const fail = (problem) => { setBusy(''); feedback('', problem); };
    const list = await api('/projects');
    if (list.unavailable) return fail(UNAVAILABLE);
    if (list.status === 401) { setSignedIn(false); return fail('Sign in (Account) to save references.'); }
    let project = list.data.projects.find(p => p.name === 'References');
    if (!project) {
      const created = await api('/projects', { method: 'POST', body: { name: 'References' } });
      if (!created.ok) return fail(created.data.message ?? 'Saving failed. Nothing was saved.');
      project = created.data;
    }
    const uploaded = await uploadFile(`/projects/${project.id}/assets?kind=reference&name=${encodeURIComponent(measured.file.name)}`, measured.file);
    if (uploaded.unavailable) return fail(UNAVAILABLE);
    if (!uploaded.ok) return fail(uploaded.data.message ?? 'The reference file could not be saved.');
    const saved = await api('/profiles', { method: 'POST', body: { assetId: uploaded.data.id, name: form.name, style: form.style, sourceVersion: form.sourceVersion, segment: measured.report.input.segment, profile: toProfile(measured.report) } });
    if (!saved.ok) {
      await api(`/assets/${uploaded.data.id}`, { method: 'DELETE' }); // no orphan reference file
      return fail(saved.data.message ?? 'The profile could not be saved.');
    }
    setBusy('');
    feedback(`Saved “${saved.data.name}” (${saved.data.style}, ${saved.data.sourceVersion}).`);
    await refresh();
  }

  async function reanalyse(profile) {
    setChecks(all => ({ ...all, [profile.id]: 'Downloading and measuring again…' }));
    const full = await api(`/profiles/${profile.id}`);
    const link = await api(`/assets/${profile.assetId}/download-link`, { method: 'POST' });
    if (!full.ok || !link.ok) return setChecks(all => ({ ...all, [profile.id]: 'The reference could not be read. Sign in again.' }));
    const response = await fetch(link.data.url, { credentials: 'same-origin' });
    const blob = new File([await response.blob()], 'reference.wav', { type: 'audio/wav' });
    startAnalysis(blob, () => {}, profile.segment).result.then(report => {
      const differences = compareProfiles(full.data.profile, report);
      setChecks(all => ({ ...all, [profile.id]: differences.length ? `Differs: ${differences.join('; ')}` : 'Reproducible: the same measurements.' }));
    }, failure => setChecks(all => ({ ...all, [profile.id]: failure.message })));
  }

  async function remove(profile) {
    const result = await api(`/profiles/${profile.id}`, { method: 'DELETE' });
    if (result.ok || result.status === 204) { feedback(`Deleted the profile “${profile.name}”. The reference file stays in your library until you delete it there.`); await refresh(); }
    else feedback('', result.data?.message ?? 'Deleting failed.');
  }

  const field = (key, label, props = {}) => (
    <label>{label}<input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} {...props} /></label>
  );
  const styles = [...new Set(profiles.map(p => p.style))];
  return (
    <>
      <button className="account-button" onClick={open}>References</button>
      <dialog ref={dialog} className="analysis-dialog" aria-labelledby="references-title">
        <div className="account-heading">
          <h2 id="references-title">Reference profiles</h2>
          <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close references">×</button>
        </div>
        <p className="fine-print">A profile is a set of measurements of one segment of a reference (loudness, dynamics, true peak, stereo, tonal balance). Nothing is trained or learned from it. Measuring happens on this device; saving stores the reference file and its profile in your private library.</p>
        <p className="account-status" role="status">{busy || message}</p>
        {error && <p className="account-error" role="alert">{error}</p>}
        <section className="account-body" aria-labelledby="measure-title">
          <h3 id="measure-title">Measure a reference</h3>
          <label className="file-picker small">Choose reference WAV<input type="file" accept=".wav,audio/wav" aria-label="Choose reference WAV" onChange={choose} /></label>
          {header && (
            <form className="reference-form" onSubmit={measure}>
              {field('start', 'Start (s)', { type: 'number', min: 0, step: 0.1, required: true })}
              {field('end', 'End (s)', { type: 'number', min: 0, step: 0.1, required: true })}
              {field('name', 'Name', { maxLength: 100 })}
              {field('style', 'Style or artist (a label, e.g. Enigma)', { maxLength: 100 })}
              {field('sourceVersion', 'Source version (e.g. 1990 album, 2003 remaster)', { maxLength: 100 })}
              <button type="submit" disabled={Boolean(busy)}>Measure segment</button>
            </form>
          )}
          {measured && (
            <>
              <Measures profile={measured.report} />
              <button type="button" className="primary" onClick={save} disabled={Boolean(busy)}>Save to my references</button>
            </>
          )}
        </section>
        <section className="account-body" aria-labelledby="saved-title">
          <h3 id="saved-title">My saved references</h3>
          {signedIn === false && <p className="fine-print">Sign in (Account) to save and list references.</p>}
          {signedIn && profiles.length === 0 && <p className="fine-print">No saved references yet.</p>}
          {styles.map(style => (
            <div key={style} className="reference-group">
              <h4>{style}</h4>
              <ul className="library-list">
                {profiles.filter(p => p.style === style).map(profile => (
                  <li key={profile.id}>
                    <span>{profile.name} · {profile.sourceVersion} · {profile.segment.start.toFixed(1)}–{profile.segment.end.toFixed(1)} s · {show(profile.measurements.integratedLufs, 'LUFS')} · {show(profile.measurements.truePeakDbtp, 'dBTP')}</span>
                    <span className="library-actions">
                      <button type="button" onClick={() => reanalyse(profile)} aria-label={`Reanalyse ${profile.name}`}>Reanalyse</button>
                      <button type="button" onClick={() => remove(profile)} aria-label={`Delete profile ${profile.name}`}>Delete</button>
                    </span>
                    {checks[profile.id] && <span className="fine-print reference-check">{checks[profile.id]}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      </dialog>
    </>
  );
}
