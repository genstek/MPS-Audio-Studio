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
      if (!cancelled) setStatus('');
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
                {confirming === asset.id
                  ? <button type="button" className="danger" onClick={() => remove(asset)} aria-label={`Confirm delete ${asset.name}`}>Confirm delete</button>
                  : <button type="button" onClick={() => setConfirming(asset.id)} aria-label={`Delete ${asset.name}`}>Delete</button>}
              </span>
            </li>
          ))}
        </ul>
      ))}
    </section>
  );
}
