import { useEffect, useRef, useState } from 'react';
import { defaultChain } from './dsp/chain-params.js';
import { audioFileSizeProblem } from './file-limits.js';
import { PROJECT_FILE_LIMIT, PROJECT_SCHEMA, PROJECT_VERSION, adoptMediaIdentity, fileNameFor, mediaIdentity, parseProject, projectKey, savedMediaIdentity, serializeProject, sha256Hex } from './project.js';

// The project workflow (LAS-60 New project, LAS-69 Save / Save As / Open).
// - Save writes to the project's file when the browser lets the studio keep a file handle (File
//   System Access API, e.g. Chrome on macOS/Windows): the first Save asks where; later Saves update
//   that file; Save As asks for a new file and gives the copy a new project id, so the original file
//   is never overwritten. Where that API is missing (Safari, Firefox, iOS) both download a new
//   .mps-project.json file; the status says "download" and nothing claims to overwrite anything.
// - "Unsaved changes" compares the session with what was last saved/opened/created. It is cleared
//   only after the write succeeded, and only for what that write contained.
// - Open validates the whole file before anything changes; a corrupt, foreign, newer or oversized
//   file is refused and the current session stays. Playback never starts on Open.
// - New / Open ask Save / Discard / Cancel when the session has work in it. Closing the page with
//   unsaved changes asks the browser's leave-page question.
const fresh = name => ({ id: crypto.randomUUID(), name, createdAt: new Date().toISOString() });
const PICKER_TYPES = [{ description: 'MPS project', accept: { 'application/json': ['.json'] } }];

const layoutOf = windows => Object.fromEntries(Object.entries(windows).filter(([, w]) => w.position).map(([name, w]) => [name, { open: Boolean(w.open), x: w.position.x, y: w.position.y }]));
const windowsFrom = layout => Object.fromEntries(Object.entries(layout).map(([name, w], i) => [name, { open: w.open, position: { x: w.x, y: w.y }, z: i + 1, focusRequest: 0 }]));
const withoutSlot = stem => { const copy = { ...stem }; delete copy.slot; return copy; };
const stemKeyOf = s => ({ name: s.name, sha256: s.sha256, offset: s.offset, gainDb: s.gainDb, pan: s.pan, mute: s.mute, solo: s.solo, chainLabel: s.chainLabel, params: s.params ?? s.chain, width: s.width });

function downloadText(text, name) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

// The browser's file input, for opening where showOpenFilePicker is missing. Resolves null on cancel.
function pickFile() {
  return new Promise(resolve => {
    const input = Object.assign(document.createElement('input'), { type: 'file', accept: '.json,application/json' });
    input.addEventListener('change', () => resolve(input.files[0] ?? null));
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

export function useProject({ engine, chain, listening, listen, windows, setWindows, track, currentFile, stems, setStems, resetSession, loadTrack }) {
  const [initial] = useState(() => fresh('Untitled project'));
  const [project, setProject] = useState(initial);
  const [baseKey, setBaseKey] = useState(() => projectKey({ project: initial, track: null, stems: [], chain: defaultChain(), listening: 'processed', windowLayout: {} }));
  const [state, setState] = useState({ phase: 'new' }); // new | created | opened | saving | saved | cancelled | error
  const [missing, setMissing] = useState(null); // { track, stems } still to relink after Open
  const [relink, setRelink] = useState({ open: false, busy: '', problem: '' });
  const [prompt, setPrompt] = useState(null); // Save / Discard / Cancel question
  const [newOpen, setNewOpen] = useState(false);
  const [problem, setProblem] = useState(''); // why Open refused a file
  const handle = useRef(null);
  const saving = useRef(false);
  const hashes = useRef(new WeakMap());

  const savedTrackKey = t => (t ? { name: t.name, size: t.size, identity: savedMediaIdentity(t.sha256) } : null);
  const trackForKey = currentFile ? { name: currentFile.name, size: currentFile.size, identity: mediaIdentity(currentFile) } : savedTrackKey(missing?.track);
  const stemsForKey = [...stems, ...(missing?.stems ?? [])].map(stemKeyOf);
  const keyNow = (p = project) => projectKey({ project: p, track: trackForKey, stems: stemsForKey, chain: chain.params, listening, windowLayout: windows });
  const dirty = keyNow() !== baseKey;
  const missingCount = (missing?.track ? 1 : 0) + (missing?.stems?.length ?? 0);
  const hasWork = Boolean(currentFile || stems.length || missingCount) || dirty;

  async function trackEntry() {
    if (!currentFile) return missing?.track ?? null;
    let sha = hashes.current.get(currentFile);
    if (!sha) {
      sha = await sha256Hex(currentFile);
      hashes.current.set(currentFile, sha);
    }
    return { name: currentFile.name, size: currentFile.size, sha256: sha, duration: track?.duration ?? null, sampleRate: track?.sampleRate ?? null, channels: track?.channels ?? null };
  }
  const stemEntries = () => [
    ...stems.map(s => ({ name: s.name, size: s.file?.size ?? 0, sha256: s.sha256, duration: s.duration, sampleRate: s.fileSampleRate, channels: s.fileChannels, offset: s.offset, gainDb: s.gainDb, pan: s.pan, mute: s.mute, solo: s.solo, chainLabel: s.chainLabel, chain: s.params, width: s.width })),
    ...(missing?.stems ?? []).map(withoutSlot), // the slot is only for relinking, not saved
  ];

  async function write(text, as, name) {
    if (typeof window.showSaveFilePicker === 'function') {
      let target = as ? null : handle.current;
      if (!target) target = await window.showSaveFilePicker({ suggestedName: fileNameFor(name), types: PICKER_TYPES });
      // createWritable() writes to a temporary file; the project file is replaced only by close().
      const writable = await target.createWritable();
      await writable.write(text);
      await writable.close();
      return { how: 'file', handle: target, fileName: target.name };
    }
    downloadText(text, fileNameFor(name));
    return { how: 'download', handle: null, fileName: fileNameFor(name) };
  }

  // Resolves true when the project was written.
  async function save({ as = false } = {}) {
    if (saving.current) return false;
    saving.current = true;
    const target = as ? { ...project, id: crypto.randomUUID() } : project;
    const key = keyNow(target); // what this save contains; later edits stay unsaved
    setState({ phase: 'saving' });
    try {
      const doc = {
        schema: PROJECT_SCHEMA, version: PROJECT_VERSION,
        project: { ...target, savedAt: new Date().toISOString() },
        media: { policy: 'manifest', track: await trackEntry(), stems: stemEntries() },
        chain: chain.params, player: { listening }, layout: { windows: layoutOf(windows) },
      };
      const result = await write(serializeProject(doc), as, target.name);
      handle.current = result.handle;
      if (as) setProject(target);
      setBaseKey(key);
      setState({ phase: 'saved', how: result.how, fileName: result.fileName });
      return true;
    } catch (failure) {
      if (failure?.name === 'AbortError') {
        setState({ phase: 'cancelled' });
        return false;
      }
      setState({ phase: 'error', message: failure?.message || 'The project could not be written.' });
      return false;
    } finally {
      saving.current = false;
    }
  }

  // Before New / Open replace the session: true to go on, false to stay.
  async function confirmReplace(action) {
    if (!hasWork) return true;
    const choice = await new Promise(resolve => setPrompt({ name: project.name, dirty, action, resolve }));
    setPrompt(null);
    if (choice === 'cancel') return false;
    if (choice === 'save') return save();
    return true;
  }

  async function create(name) {
    setNewOpen(false);
    if (!(await confirmReplace('A new project'))) return;
    resetSession();
    chain.load(defaultChain());
    listen('processed');
    setWindows({});
    const next = fresh(name);
    setProject(next);
    setMissing(null);
    handle.current = null;
    setBaseKey(projectKey({ project: next, track: null, stems: [], chain: defaultChain(), listening: 'processed', windowLayout: {} }));
    setState({ phase: 'created' });
  }

  async function open() {
    setProblem('');
    if (!(await confirmReplace('Opening another project'))) return;
    let file, fileHandle = null;
    try {
      if (typeof window.showOpenFilePicker === 'function') {
        [fileHandle] = await window.showOpenFilePicker({ types: PICKER_TYPES, multiple: false });
        file = await fileHandle.getFile();
      } else {
        file = await pickFile();
      }
    } catch (failure) {
      if (failure?.name !== 'AbortError') setProblem(`The project could not be opened: ${failure?.message ?? 'unknown error'}. Nothing was changed.`);
      return;
    }
    if (!file) return;
    let doc;
    try {
      if (file.size > PROJECT_FILE_LIMIT) throw new Error('Project files hold settings only; this file is over 5 MiB.');
      doc = parseProject(await file.text());
    } catch (failure) {
      setProblem(`${file.name}: ${failure.message} Nothing was changed.`);
      return;
    }
    resetSession();
    chain.load(doc.chain);
    listen(doc.player.listening);
    const restored = windowsFrom(doc.layout.windows);
    setWindows(restored);
    setProject(doc.project);
    handle.current = fileHandle;
    // Each saved stem keeps its own slot, so the same WAV on two strips is relinked as two strips.
    const pending = doc.media.track || doc.media.stems.length ? { track: doc.media.track, stems: doc.media.stems.map((stem, slot) => ({ ...stem, slot })) } : null;
    setMissing(pending);
    setRelink({ open: Boolean(pending), busy: '', problem: '' });
    setBaseKey(projectKey({ project: doc.project, track: savedTrackKey(doc.media.track), stems: doc.media.stems.map(stemKeyOf), chain: doc.chain, listening: doc.player.listening, windowLayout: restored }));
    setState({ phase: 'opened', fileName: file.name });
  }

  // Relink one missing file: only the file with the saved SHA-256 is accepted.
  async function relinkFile(entry, file) {
    setRelink(r => ({ ...r, busy: `Checking ${file.name}…`, problem: '' }));
    try {
      const tooLarge = audioFileSizeProblem(file.size);
      if (tooLarge) throw new Error(tooLarge);
      const sha = await sha256Hex(file);
      if (sha !== entry.sha256) throw new Error(`${file.name} is not the saved ${entry.name} (its SHA-256 differs). Choose the original file.`);
      if (entry.kind === 'track') {
        hashes.current.set(file, sha);
        adoptMediaIdentity(file, sha); // verified: the same audio as saved, so not an unsaved change
        await loadTrack(file);
        setMissing(m => (m ? { ...m, track: null } : m));
      } else {
        const session = await engine.current.openStems();
        const id = await engine.current.addStem(file);
        session.setOffset(id, entry.offset);
        session.setGain(id, entry.gainDb);
        session.setPan(id, entry.pan);
        session.setWidth(id, entry.width);
        session.setMute(id, entry.mute);
        session.setSolo(id, entry.solo);
        await session.setChain(id, entry.chain, entry.chainLabel);
        setStems(session.stems());
        setMissing(m => (m ? { ...m, stems: m.stems.filter(s => s.slot !== entry.slot) } : m)); // only the strip restored
      }
      setRelink(r => ({ ...r, busy: '', problem: '' }));
    } catch (failure) {
      setRelink(r => ({ ...r, busy: '', problem: failure.message }));
    }
  }

  // Ctrl/Cmd+S saves (not the browser's Save Page), Shift adds Save As, Ctrl/Cmd+O opens.
  const latest = useRef({});
  latest.current = { save, open }; // the shortcut handler calls the latest functions
  useEffect(() => {
    function onKey(event) {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 's') { event.preventDefault(); latest.current.save({ as: event.shiftKey }); }
      if (key === 'o') { event.preventDefault(); latest.current.open(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = event => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  let status;
  if (state.phase === 'saving') status = 'Saving…';
  else if (state.phase === 'error') status = `Save failed: ${state.message} Your work is still here.`;
  else if (dirty) status = 'Unsaved changes';
  else if (state.phase === 'saved') status = state.how === 'file' ? `Saved to ${state.fileName}` : `Saved as a download (${state.fileName})`;
  else if (state.phase === 'opened') status = `Opened ${state.fileName}`;
  else status = 'Not saved yet';

  return {
    project, dirty, status, phase: state.phase, missing, missingCount, problem, clearProblem: () => setProblem(''),
    requestNew: () => setNewOpen(true), newOpen, cancelNew: () => setNewOpen(false), create,
    open, save: () => save(), saveAs: () => save({ as: true }),
    prompt, answer: choice => prompt?.resolve(choice),
    relink, openRelink: () => setRelink(r => ({ ...r, open: true })), closeRelink: () => setRelink(r => ({ ...r, open: false, problem: '' })), relinkFile,
  };
}
