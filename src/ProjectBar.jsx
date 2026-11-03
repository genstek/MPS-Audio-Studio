import React, { useEffect, useId, useRef, useState } from 'react';
import { MODULES, ModulePresetError, MODULE_PRESET_LIMIT, applyModulePreset, modulePresetFileName, serializeModulePreset } from './module-presets.js';
import { cleanProjectName } from './project.js';
import { HelpTip, WithHelp } from './HelpTip.jsx';

// Project area (LAS-60/69): a visible New project button and a Project menu (Open, Save, Save As)
// where "SESSION 001" used to be, the project name, and the dialogs of the project workflow.

// Keeps a modal <dialog> open while `open` is true.
function useModal(open) {
  const ref = useRef(null);
  useEffect(() => {
    const element = ref.current;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);
  return ref;
}

export function ProjectArea({ name, onNew, onOpen, onSave, onSaveAs, disabled }) {
  const [menu, setMenu] = useState(false);
  const button = useRef(null);
  const list = useRef(null);
  const id = useId();
  useEffect(() => {
    if (!menu) return undefined;
    list.current.querySelector('[role="menuitem"]').focus();
    const outside = event => { if (!list.current?.contains(event.target) && event.target !== button.current) setMenu(false); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [menu]);
  function keyDown(event) {
    const items = [...list.current.querySelectorAll('[role="menuitem"]')];
    const at = items.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); setMenu(false); button.current.focus(); }
    if (event.key === 'ArrowDown') { event.preventDefault(); items[(at + 1) % items.length].focus(); }
    if (event.key === 'ArrowUp') { event.preventDefault(); items[(at - 1 + items.length) % items.length].focus(); }
    if (event.key === 'Tab') setMenu(false);
  }
  const run = action => { setMenu(false); button.current.focus(); action(); };
  return (
    <div className="project-area">
      <div className="project-toolbar">
        <WithHelp id="project.new"><button type="button" className="project-button" onClick={onNew} disabled={disabled} aria-label="New project" title="New project">+ New</button></WithHelp>
        <span className="project-menu-wrap with-help">
          <button ref={button} type="button" className="project-button" aria-haspopup="menu" aria-expanded={menu} aria-controls={id} onClick={() => setMenu(!menu)} disabled={disabled}>Project ▾</button>
          {menu && (
            <ul ref={list} id={id} className="project-menu" role="menu" aria-label="Project" onKeyDown={keyDown}>
              <li role="none"><button type="button" role="menuitem" aria-label="Open project" aria-keyshortcuts="Control+O Meta+O" onClick={() => run(onOpen)}>Open project… <kbd>Ctrl/⌘ O</kbd></button></li>
              <li role="none"><button type="button" role="menuitem" aria-label="Save project" aria-keyshortcuts="Control+S Meta+S" onClick={() => run(onSave)}>Save project <kbd>Ctrl/⌘ S</kbd></button></li>
              <li role="none"><button type="button" role="menuitem" aria-label="Save project as" aria-keyshortcuts="Control+Shift+S Meta+Shift+S" onClick={() => run(onSaveAs)}>Save project as… <kbd>⇧ Ctrl/⌘ S</kbd></button></li>
            </ul>
          )}
          <HelpTip id="project.menu" />
        </span>
      </div>
      <h2 className="project-name" title={name}>{name}</h2>
    </div>
  );
}

// New project: a name (required) with Create / Cancel. Cancel changes nothing.
export function NewProjectDialog({ open, onCreate, onCancel }) {
  const ref = useModal(open);
  const [name, setName] = useState('');
  const [problem, setProblem] = useState('');
  useEffect(() => { if (open) { setName(''); setProblem(''); } }, [open]); // eslint-disable-line react-hooks/set-state-in-effect -- a fresh form each time it opens
  function submit(event) {
    event.preventDefault();
    const clean = cleanProjectName(name);
    if (!clean) { setProblem('Enter a project name.'); return; }
    onCreate(clean);
  }
  return (
    <dialog ref={ref} className="account-dialog" aria-labelledby="new-project-title" onCancel={event => { event.preventDefault(); onCancel(); }}>
      <form onSubmit={submit} noValidate>
        <h2 id="new-project-title">New project</h2>
        <label>Project name<input value={name} maxLength={100} autoFocus aria-invalid={Boolean(problem)} aria-describedby={problem ? 'new-project-problem' : undefined} onChange={event => { setName(event.target.value); setProblem(''); }} /></label>
        {problem && <p id="new-project-problem" className="account-error" role="alert">{problem}</p>}
        <p className="fine-print">A new project starts with no audio, default processing and closed editors. Master Level (your listening volume) is kept.</p>
        <div className="library-actions dialog-actions">
          <button type="button" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary">Create</button>
        </div>
      </form>
    </dialog>
  );
}

// Asked before New / Open replaces a session with work in it. choice: 'save' | 'discard' | 'cancel'.
export function UnsavedDialog({ prompt, onChoose }) {
  const ref = useModal(Boolean(prompt));
  return (
    <dialog ref={ref} className="account-dialog" aria-labelledby="unsaved-title" onCancel={event => { event.preventDefault(); onChoose('cancel'); }}>
      <h2 id="unsaved-title">{prompt?.dirty ? `Save changes to “${prompt?.name}”?` : `Close “${prompt?.name}”?`}</h2>
      <p className="fine-print">{prompt?.dirty ? `${prompt?.action} replaces the current session. Unsaved changes are lost if you discard them.` : `${prompt?.action} replaces the current session (the track and settings in the studio now). The saved project file is not changed.`}</p>
      <div className="library-actions dialog-actions">
        <button type="button" onClick={() => onChoose('cancel')}>Cancel</button>
        <button type="button" onClick={() => onChoose('discard')}>{prompt?.dirty ? 'Discard' : 'Continue'}</button>
        {prompt?.dirty && <button type="button" className="primary" onClick={() => onChoose('save')}>Save</button>}
      </div>
    </dialog>
  );
}

// The same WAV can sit on several stem strips (each with its own settings); each is relinked on its
// own, so their rows and labels say which strip they restore.
const stemSettings = stem => `${stem.gainDb.toFixed(1).replace('-', '−')} dB · pan ${stem.pan.toFixed(2).replace('-', '−')} · offset ${stem.offset.toFixed(2)} s${stem.mute ? ' · muted' : ''}`;
function relinkLabel(entry, entries) {
  const same = entries.filter(other => other.kind === entry.kind && other.name === entry.name);
  return same.length > 1 ? `Relink ${entry.name} (${same.indexOf(entry) + 1} of ${same.length})` : `Relink ${entry.name}`;
}
const bytes = size => (size >= 1048576 ? `${(size / 1048576).toFixed(1)} MiB` : `${Math.max(1, Math.round(size / 1024))} KiB`);

// Missing audio after Open (the project stores identities, not audio): choose each file again.
// A file with another SHA-256 is refused. Skipping keeps the project marked incomplete.
export function RelinkDialog({ missing, open, onRelink, onClose, busy, problem }) {
  const ref = useModal(open);
  const entries = [...(missing?.track ? [{ ...missing.track, kind: 'track' }] : []), ...(missing?.stems ?? []).map(stem => ({ ...stem, kind: 'stem' }))];
  return (
    <dialog ref={ref} className="analysis-dialog" aria-labelledby="relink-title" onCancel={event => { event.preventDefault(); onClose(); }}>
      <div className="account-heading">
        <h2 id="relink-title">Missing audio</h2>
        <button className="dialog-close" onClick={onClose} aria-label="Close missing audio">×</button>
      </div>
      <p className="fine-print">A project file keeps the settings and the identity of each audio file (name, size, SHA-256), not the audio. Choose each file again; a different file is refused. Nothing is uploaded.</p>
      <p className="account-status" role="status">{busy || (entries.length ? `${entries.length} file${entries.length > 1 ? 's' : ''} still missing.` : 'All audio is linked.')}</p>
      {problem && <p className="account-error" role="alert">{problem}</p>}
      <ul className="library-list">
        {entries.map(entry => (
          <li key={entry.kind === 'track' ? 'track' : `stem-${entry.slot}`}>
            <span><strong>{entry.name}</strong> <span className="fine-print">· {entry.kind === 'track' ? 'track' : `stem · ${stemSettings(entry)}`} · {bytes(entry.size)} · SHA-256 {entry.sha256.slice(0, 8)}…{entry.sha256.slice(-4)}</span></span>
            <span className="library-actions">
              <label className="file-picker small">Relink…<input type="file" accept=".wav,audio/wav" aria-label={relinkLabel(entry, entries)} disabled={Boolean(busy)} onChange={event => { const file = event.target.files[0]; event.target.value = ''; if (file) onRelink(entry, file); }} /></label>
            </span>
          </li>
        ))}
      </ul>
      <div className="library-actions dialog-actions"><button type="button" onClick={onClose}>{entries.length ? 'Continue without them' : 'Done'}</button></div>
    </dialog>
  );
}

const download = (text, name) => {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

// Section presets in each processor editor (LAS-69): this module only, one undo step on load.
export function ModulePresets({ module, params, update }) {
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  const label = MODULES[module];
  async function load(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      if (file.size > MODULE_PRESET_LIMIT) throw new ModulePresetError('Section presets are small; this file is over 1 MiB.');
      const next = applyModulePreset(await file.text(), params, module);
      update(() => next);
      setProblem('');
      setMessage(`Loaded ${file.name} into ${label} only (one undo step).`);
    } catch (failure) {
      setMessage('');
      setProblem(`${file.name}: ${failure.message} Nothing was changed.`);
    }
  }
  return (
    <div className="module-presets">
      <button type="button" className="heading-button" onClick={() => { download(serializeModulePreset(params, module), modulePresetFileName(module)); setProblem(''); setMessage(`Saved the ${label} settings as ${modulePresetFileName(module)}.`); }}>Save {label} preset</button>
      <label className="file-picker small">Load {label} preset…<input type="file" accept=".json,application/json" aria-label={`Load ${label} preset`} onChange={load} /></label>
      <span className="fine-print">Only {label}; not the project, not audio.</span>
      <HelpTip id="presets.section" className="inline" />
      {message && <p className="fine-print" aria-live="polite">{message}</p>}
      {problem && <p className="account-error" role="alert">{problem}</p>}
    </div>
  );
}
