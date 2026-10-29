import React, { useEffect, useRef, useState } from 'react';
import { parseChain, serializeChain } from './dsp/chain-params.js';

// Saved settings (LAS-28): snapshots kept for this session, and settings files (versioned JSON,
// schema mps-chain) that can be downloaded and loaded again. Loading is one undo step.
export function SettingsDialog({ params, replace }) {
  const dialog = useRef(null);
  const [snapshots, setSnapshots] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState(null);

  useEffect(() => {
    const url = URL.createObjectURL(new Blob([serializeChain(params)], { type: 'application/json' }));
    setFileUrl(url); // eslint-disable-line react-hooks/set-state-in-effect -- the URL is derived from params and must be revoked
    return () => URL.revokeObjectURL(url);
  }, [params]);

  function save() {
    const name = `Snapshot ${snapshots.length + 1} (${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })})`;
    setSnapshots(list => [...list, { name, params }]);
    setMessage(`Saved ${name}.`);
    setError('');
  }

  async function load(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setMessage('');
    try {
      if (file.size > 1024 * 1024) throw new Error('Settings files are small; this one is over 1 MiB.');
      replace(parseChain(await file.text()));
      setError('');
      setMessage(`Loaded ${file.name}.`);
    } catch (failure) {
      setError(`${file.name}: ${failure.message} Nothing was changed.`);
    }
  }

  return (
    <>
      <button className="heading-button" onClick={() => dialog.current.showModal()}>Settings…</button>
      <dialog ref={dialog} className="account-dialog" aria-labelledby="settings-title">
        <div className="account-heading">
          <h2 id="settings-title">Chain settings</h2>
          <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close settings">×</button>
        </div>
        <p className="account-status" role="status">{message}</p>
        {error && <p className="account-error" role="alert">{error}</p>}
        <section className="account-body" aria-labelledby="snapshots-title">
          <h3 id="snapshots-title">Snapshots (this session)</h3>
          <button type="button" onClick={save}>Save snapshot</button>
          {snapshots.length > 0 && (
            <ul className="snapshot-list">
              {snapshots.map((snapshot, index) => (
                <li key={snapshot.name}>
                  <span>{snapshot.name}</span>
                  <span className="library-actions">
                    <button type="button" onClick={() => { replace(snapshot.params); setMessage(`Restored ${snapshot.name}.`); setError(''); }}>Restore</button>
                    <button type="button" onClick={() => setSnapshots(list => list.filter((_, i) => i !== index))}>Delete</button>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="account-body" aria-labelledby="files-title">
          <h3 id="files-title">Settings file</h3>
          {fileUrl && <a className="button-link" href={fileUrl} download="mps-chain-settings.json">Download settings (.json)</a>}
          <label className="file-picker small">Load settings…<input type="file" accept=".json,application/json" aria-label="Load settings file" onChange={load} /></label>
          <p className="fine-print">Versioned JSON (schema mps-chain v1) with every band, the compressor and the limiter. Invalid or newer files are refused without changing anything.</p>
        </section>
      </dialog>
    </>
  );
}
