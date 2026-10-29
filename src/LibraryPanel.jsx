import React, { useCallback, useEffect, useState } from 'react';
import { api, uploadFile } from './account-api.js';

const size = bytes => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MiB` : `${Math.max(1, Math.round(bytes / 1024))} KiB`);

// Private library inside the Account dialog (LAS-23). Nothing is uploaded until the user presses
// Save; the text says where the copy goes and how long it stays (LAS-20/24).
export function LibraryPanel({ currentFile, onSessionEnded }) {
  const [project, setProject] = useState(null);
  const [assets, setAssets] = useState([]);
  const [status, setStatus] = useState('Loading your library…');
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(null);
  // External services the server offers (none unless configured) and the ones this user allowed.
  const [recipients, setRecipients] = useState([]);
  const [consents, setConsents] = useState([]);
  // The consent question being shown: { asset, recipient }. Nothing is sent while it is open.
  const [asking, setAsking] = useState(null);

  // Every library call goes through here: a 401 means the session ended, never a silent failure.
  const call = useCallback(async request => {
    const result = await request();
    if (result.unavailable) setError('The library is unavailable right now.');
    else if (result.status === 401) onSessionEnded();
    else if (!result.ok) setError(result.data.message ?? 'Something went wrong. Try again.');
    return result.ok ? result : null;
  }, [onSessionEnded]);

  const refresh = useCallback(async projectId => {
    const result = await call(() => api(`/projects/${projectId}`));
    if (result) setAssets(result.data.assets);
  }, [call]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await call(() => api('/projects'));
      if (!list || cancelled) return;
      const existing = list.data.projects[0];
      const created = existing ? null : await call(() => api('/projects', { method: 'POST', body: { name: 'My library' } }));
      const current = existing ?? created?.data;
      if (!current || cancelled) return;
      setProject(current);
      await refresh(current.id);
      const offered = await call(() => api('/external-recipients'));
      const allowed = await call(() => api('/account/consents'));
      if (cancelled) return;
      setRecipients(offered?.data.recipients ?? []);
      setConsents(allowed?.data.consents.map(consent => consent.recipient) ?? []);
      setStatus('');
    })();
    return () => { cancelled = true; };
  }, [call, refresh]);

  async function save() {
    setError('');
    setStatus(`Saving ${currentFile.name}…`);
    const result = await call(() => uploadFile(`/projects/${project.id}/assets?kind=source&name=${encodeURIComponent(currentFile.name)}`, currentFile));
    setStatus(result ? `Saved ${result.data.name} to your library.` : '');
    if (result) await refresh(project.id);
  }

  async function download(asset) {
    setError('');
    const result = await call(() => api(`/assets/${asset.id}/download-link`, { method: 'POST' }));
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.data.url;
    link.download = asset.name;
    link.click();
  }

  // Only after "Allow and send": record the consent for this recipient, then send this one file.
  async function allowAndSend() {
    const { asset, recipient } = asking;
    setAsking(null);
    setError('');
    if (!consents.includes(recipient.id)) {
      const granted = await call(() => api('/account/consents', { method: 'POST', body: { recipient: recipient.id } }));
      if (!granted) return;
      setConsents(list => [...list, recipient.id]);
    }
    const sent = await call(() => api(`/assets/${asset.id}/external-jobs`, { method: 'POST', body: { recipient: recipient.id } }));
    if (sent) setStatus(`Sent ${asset.name} to ${recipient.name}.`);
  }

  async function withdraw(recipient) {
    setError('');
    if (await call(() => api(`/account/consents/${recipient.id}`, { method: 'DELETE' }))) {
      setConsents(list => list.filter(id => id !== recipient.id));
      setStatus(`Withdrew permission for ${recipient.name}.`);
    }
  }

  async function remove(asset) {
    setError('');
    setConfirming(null);
    const result = await call(() => api(`/assets/${asset.id}`, { method: 'DELETE' }));
    if (result) {
      setStatus(`Deleted ${asset.name}.`);
      await refresh(project.id);
    }
  }

  return (
    <section className="library" aria-labelledby="library-title">
      <h3 id="library-title">Private library</h3>
      <p className="fine-print">Saving uploads a copy of the current track to your private library on the studio server. Only you can open it, and it stays until you delete it. Nothing else is uploaded.</p>
      <button type="button" onClick={save} disabled={!currentFile || !project}>
        {currentFile ? `Save “${currentFile.name}” to my library` : 'Import a WAV to save it'}
      </button>
      <p className="account-status" role="status">{status}</p>
      {error && <p className="account-error" role="alert">{error}</p>}
      {project && !status.startsWith('Loading') && (assets.length === 0 ? <p className="fine-print">Your library is empty.</p> : (
        <ul className="library-list" aria-label="Saved files">
          {assets.map(asset => (
            <li key={asset.id}>
              <span className="library-name" title={asset.name}>{asset.name}</span>
              <span className="fine-print">{asset.format.duration.toFixed(1)} s · {size(asset.size)}</span>
              <span className="library-actions">
                <button type="button" onClick={() => download(asset)} aria-label={`Download ${asset.name}`}>Download</button>
                {recipients.map(recipient => (
                  <button type="button" key={recipient.id} onClick={() => setAsking({ asset, recipient })} aria-label={`Send ${asset.name} to ${recipient.name}`}>Send…</button>
                ))}
                {confirming === asset.id
                  ? <button type="button" className="danger" onClick={() => remove(asset)} aria-label={`Confirm delete ${asset.name}`}>Confirm delete</button>
                  : <button type="button" onClick={() => setConfirming(asset.id)} aria-label={`Delete ${asset.name}`}>Delete</button>}
              </span>
            </li>
          ))}
        </ul>
      ))}
      {asking && (
        <div className="consent" role="group" aria-labelledby="consent-title">
          <h4 id="consent-title">Send “{asking.asset.name}” to {asking.recipient.name}?</h4>
          <p>A copy of this file leaves the studio server and goes to <strong>{asking.recipient.name}</strong>, located on {asking.recipient.location}. It is {asking.recipient.retention}. Purpose: {asking.recipient.purpose}.</p>
          <p className="fine-print">Allowing this lets the studio send files you choose to this service until you withdraw it. Cancel sends nothing.</p>
          <div className="library-actions">
            <button type="button" className="primary" onClick={allowAndSend}>Allow and send</button>
            <button type="button" onClick={() => setAsking(null)}>Cancel</button>
          </div>
        </div>
      )}
      {consents.length > 0 && (
        <div className="consents">
          <h4>External services you allowed</h4>
          <ul aria-label="Allowed external services">
            {recipients.filter(recipient => consents.includes(recipient.id)).map(recipient => (
              <li key={recipient.id}>{recipient.name} <button type="button" className="link" onClick={() => withdraw(recipient)} aria-label={`Withdraw permission for ${recipient.name}`}>Withdraw</button></li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
