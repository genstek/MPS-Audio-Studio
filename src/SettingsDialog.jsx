import React, { useEffect, useRef, useState } from 'react';
import { api } from './account-api.js';
import { parseChain, serializeChain } from './dsp/chain-params.js';
import { parsePresetFile, serializePreset } from './presets.js';

const ORIGINS = { manual: 'saved settings', proposal: 'from a proposal', import: 'imported file' };
const describe = p => [ORIGINS[p.origin], `chain v${p.chainVersion}`, p.proposalVersion && `${p.proposalVersion} at ${p.strength} %`, p.analysisVersion].filter(Boolean).join(' · ');
const download = (text, name) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

// Saved settings (LAS-28): snapshots kept for this session, and settings files (versioned JSON,
// schema mps-chain) that can be downloaded and loaded again. Loading is one undo step.
// LAS-33: presets kept in the signed-in owner's account (save, rename, apply, export, import with
// migration, delete) and the remembered proposal decisions (list, forget).
export function SettingsDialog({ params, replace }) {
  const dialog = useRef(null);
  const [snapshots, setSnapshots] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [fileUrl, setFileUrl] = useState(null);
  const [account, setAccount] = useState('unknown'); // 'signed-in' | 'signed-out' | 'unavailable'
  const [presets, setPresets] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [presetName, setPresetName] = useState('');
  const [renaming, setRenaming] = useState(null); // { id, name }

  const feedback = (note, problem = '') => { setMessage(note); setError(problem); };

  async function refresh() {
    const list = await api('/presets');
    if (list.unavailable) return setAccount('unavailable');
    if (list.status === 401) { setAccount('signed-out'); setPresets([]); setDecisions([]); return undefined; }
    setAccount('signed-in');
    setPresets(list.data.presets);
    const remembered = await api('/decisions');
    setDecisions(remembered.ok ? remembered.data.decisions : []);
    return undefined;
  }

  async function open() {
    dialog.current.showModal();
    await refresh();
  }

  async function savePreset(event) {
    event.preventDefault();
    const saved = await api('/presets', { method: 'POST', body: { name: presetName || 'My preset', chain: params, origin: 'manual' } });
    if (!saved.ok) return feedback('', saved.data?.message ?? 'The preset could not be saved.');
    setPresetName('');
    feedback(`Saved the preset “${saved.data.name}”.`);
    return refresh();
  }

  async function applyPreset(preset) {
    const full = await api(`/presets/${preset.id}`);
    if (!full.ok) return feedback('', 'The preset could not be read.');
    try {
      replace(parseChain(JSON.stringify(full.data.chain)));
      feedback(`Applied “${preset.name}” (one undo step).`);
    } catch (failure) {
      feedback('', `“${preset.name}”: ${failure.message} Nothing was changed.`);
    }
    return undefined;
  }

  async function exportPreset(preset) {
    const full = await api(`/presets/${preset.id}`);
    if (!full.ok) return feedback('', 'The preset could not be read.');
    download(serializePreset(full.data), `${preset.name.replace(/[^\w.-]+/g, '-')}.mps-preset.json`);
    return feedback(`Downloaded “${preset.name}”.`);
  }

  async function rename(event) {
    event.preventDefault();
    const saved = await api(`/presets/${renaming.id}`, { method: 'PATCH', body: { name: renaming.name } });
    if (!saved.ok) return feedback('', saved.data?.message ?? 'Renaming failed.');
    setRenaming(null);
    feedback(`Renamed to “${saved.data.name}”.`);
    return refresh();
  }

  async function removePreset(preset) {
    const removed = await api(`/presets/${preset.id}`, { method: 'DELETE' });
    if (removed.status !== 204) return feedback('', 'Deleting failed.');
    feedback(`Deleted the preset “${preset.name}”.`);
    return refresh();
  }

  // Import: validated (and migrated from an mps-chain settings file) before anything is stored.
  async function importPreset(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return undefined;
    let parsed;
    try {
      if (file.size > 1024 * 1024) throw new Error('Preset files are small; this one is over 1 MiB.');
      parsed = parsePresetFile(await file.text(), file.name);
    } catch (failure) {
      return feedback('', `${file.name}: ${failure.message} Nothing was changed.`);
    }
    const saved = await api('/presets', { method: 'POST', body: parsed.preset });
    if (!saved.ok) return feedback('', `${file.name}: ${saved.data?.message ?? 'the preset could not be saved.'} Nothing was changed.`);
    feedback(`Imported “${saved.data.name}”${parsed.migratedFrom ? ` (migrated from an ${parsed.migratedFrom})` : ''}. Apply it when you want it.`);
    return refresh();
  }

  async function forget(id) {
    await api(id ? `/decisions/${id}` : '/decisions', { method: 'DELETE' });
    feedback(id ? 'Forgot that decision.' : 'Forgot all remembered decisions.');
    return refresh();
  }

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
      <button className="heading-button" onClick={open}>Settings…</button>
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
          <p className="fine-print">Versioned JSON (schema mps-chain v2) with every band, the compressor, Space and the limiter. Version 1 files load with Space off. Invalid or newer files are refused without changing anything.</p>
        </section>
        <section className="account-body" aria-labelledby="presets-title">
          <h3 id="presets-title">My presets</h3>
          {account === 'signed-out' && <p className="fine-print">Sign in (Account) to keep presets in your account. Settings files work without an account.</p>}
          {account === 'unavailable' && <p className="fine-print">Accounts are unavailable right now. Settings files still work.</p>}
          {account === 'signed-in' && (
            <>
              <form className="preset-form" onSubmit={savePreset}>
                <label>Preset name<input value={presetName} maxLength={100} onChange={e => setPresetName(e.target.value)} placeholder="My preset" /></label>
                <button type="submit">Save current settings as preset</button>
              </form>
              <label className="file-picker small">Import preset file…<input type="file" accept=".json,application/json" aria-label="Import preset file" onChange={importPreset} /></label>
              {presets.length === 0 && <p className="fine-print">No presets yet.</p>}
              <ul className="library-list preset-list">
                {presets.map(preset => (
                  <li key={preset.id}>
                    {renaming?.id === preset.id ? (
                      <form className="preset-form" onSubmit={rename}>
                        <label>New name<input value={renaming.name} maxLength={100} onChange={e => setRenaming({ ...renaming, name: e.target.value })} autoFocus /></label>
                        <button type="submit">Save name</button>
                      </form>
                    ) : <span>{preset.name} <span className="fine-print">· {describe(preset)}</span></span>}
                    <span className="library-actions">
                      <button type="button" onClick={() => applyPreset(preset)} aria-label={`Apply ${preset.name}`}>Apply</button>
                      <button type="button" onClick={() => setRenaming({ id: preset.id, name: preset.name })} aria-label={`Rename ${preset.name}`}>Rename</button>
                      <button type="button" onClick={() => exportPreset(preset)} aria-label={`Export ${preset.name}`}>Export</button>
                      <button type="button" onClick={() => removePreset(preset)} aria-label={`Delete ${preset.name}`}>Delete</button>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="fine-print">A preset is the complete chain (all 24 bands per channel, Link or independent, compressor, Space, limiter) with its versions; only these settings are stored, never audio.</p>
            </>
          )}
        </section>
        {account === 'signed-in' && (
          <section className="account-body" aria-labelledby="decisions-title">
            <h3 id="decisions-title">Remembered proposal decisions</h3>
            {decisions.length === 0 ? <p className="fine-print">None. A decision is remembered only when you tick “Remember my decision” on a proposal.</p> : (
              <>
                <ul className="library-list preset-list">
                  {decisions.map(d => (
                    <li key={d.id}>
                      <span>{d.decision === 'accepted' ? 'Applied' : 'Rejected'} at {d.strength} %{d.rating ? ` · rated ${d.rating}/5` : ''} · {new Date(d.createdAt).toLocaleString('en-GB')}</span>
                      <span className="library-actions"><button type="button" onClick={() => forget(d.id)} aria-label={`Forget decision from ${new Date(d.createdAt).toLocaleString('en-GB')}`}>Forget</button></span>
                    </li>
                  ))}
                </ul>
                <button type="button" onClick={() => forget(null)}>Forget all decisions</button>
              </>
            )}
            <p className="fine-print">Decisions are kept for your own reference. Nothing is trained from them and no audio is sent.</p>
          </section>
        )}
      </dialog>
    </>
  );
}
