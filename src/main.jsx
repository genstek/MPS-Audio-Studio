import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createAudioEngine } from './audio-engine.js';
import { AccountDialog } from './AccountDialog.jsx';
import { AnalysisDialog } from './AnalysisDialog.jsx';
import { MixerPanel } from './MixerPanel.jsx';
import { ExportDialog } from './ExportDialog.jsx';
import { ConvertDialog } from './ConvertDialog.jsx';
import { SuggestionsPanel } from './SuggestionsPanel.jsx';
import { ListenSwitch, LoudnessMatch } from './ListeningControls.jsx';
import { useChainSettings } from './useChainSettings.js';
import { ReferencesDialog } from './ReferencesDialog.jsx';
import { CompareDialog } from './CompareDialog.jsx';
import { StemsDialog } from './StemsDialog.jsx';
import { MAX_AUDIO_FILE_LABEL } from './file-limits.js';
import { MasterLevel } from './MasterLevel.jsx';
import { clampMasterDb } from './monitor-bus.js';
import { BarMeters, PlaybackClock, PlayerDisplay, SeekButton, Timeline, createMeterStore, createPositionStore } from './Player.jsx';
import { NewProjectDialog, ProjectArea, RelinkDialog, UnsavedDialog } from './ProjectBar.jsx';
import { useProject } from './useProject.js';
import { HelpButton, HelpTip, HelpView, WithHelp } from './HelpTip.jsx';

// Master Level is a listening preference of this browser (LAS-68), kept across reloads when the
// browser allows storage; it is not part of a project, a preset or an export.
const MASTER_KEY = 'mps.masterLevelDb';
function storedMasterDb() {
  try {
    const saved = localStorage.getItem(MASTER_KEY);
    return saved === null ? 0 : clampMasterDb(saved === '-Infinity' ? -Infinity : Number(saved));
  } catch {
    return 0;
  }
}
import './styles.css';
import './processor-design.css';

// LAS-169: immutable identity from the Vite build, including packaged WebAssets.
const buildInfo = import.meta.env.VITE_MPS_BUILD_INFO ?? {
  version: 'dev', commit: 'unknown', builtAt: 'unknown',
  runNumber: null, runAttempt: null, runId: null,
};
const buildRevision = buildInfo.commit === 'unknown' ? 'SHA unknown' : buildInfo.commit.slice(0, 8);
const buildOrdinal = buildInfo.runNumber
  ? `CI #${buildInfo.runNumber}.${buildInfo.runAttempt || '1'}`
  : buildInfo.builtAt === 'unknown' ? 'local dev' : `local ${buildInfo.builtAt.slice(5, 19).replace('T', ' ')}Z`;
const buildLabel = `v${buildInfo.version} · ${buildRevision} · ${buildOrdinal}`;
const buildDetails = [
  `Version: ${buildInfo.version}`,
  `Commit: ${buildInfo.commit}`,
  `Built (UTC): ${buildInfo.builtAt}`,
  `CI run: ${buildInfo.runId || 'local'}`,
  `CI attempt: ${buildInfo.runAttempt || 'n/a'}`,
].join('\n');

// LAS-58/75/76: Graphic/Parametric EQ and the processor layouts are part of the normal studio — no URL flag.

function App() {
  const [processorSkin, setProcessorSkin] = useState('rack');
  const [track, setTrack] = useState(null);
  const [status, setStatus] = useState('No audio loaded');
  const [error, setError] = useState('');
  // What the app is waiting for ('' when idle); shown instead of the status meanwhile.
  const [busy, setBusy] = useState('');
  // The position lives outside React state (LAS-26/LAS-67): only the clock and the timeline re-render
  // with it, not the whole studio ten times a second.
  const [positionStore] = useState(createPositionStore);
  const setPosition = positionStore.set;
  // The imported File, kept only so a signed-in user can choose to save it (LAS-23).
  const [currentFile, setCurrentFile] = useState(null);
  const engine = useRef(null);
  const importInput = useRef(null);
  // Master Level (LAS-68) and how many stems are loaded (the fader works for either).
  const [masterDb, setMasterDb] = useState(storedMasterDb);
  const [stems, setStems] = useState([]); // stem session summary (LAS-34/35), for Master Level and projects
  const stemCount = stems.length;
  // Editor window layout (LAS-61/62), held here so a project can save and restore it (LAS-69).
  const [windows, setWindows] = useState({});
  function changeMaster(db) {
    const applied = engine.current.setMasterLevel(db);
    setMasterDb(applied);
    try { localStorage.setItem(MASTER_KEY, String(applied)); } catch { /* storage is optional */ }
  }

  // Player (LAS-67): one meter reading loop for the output meters, and the timeline's drag target.
  const [meters] = useState(createMeterStore);
  const [scrub, setScrub] = useState(null);

  useEffect(() => {
    engine.current = createAudioEngine(() => {
      setStatus('Stopped');
      positionStore.set(0);
    });
    engine.current.setMasterLevel(storedMasterDb());
    meters.attach(() => engine.current);
    return () => { meters.stop(); engine.current.dispose(); };
  }, [meters, positionStore]);
  useEffect(() => meters.setPlaying(status === 'Playing'), [meters, status]);
  // Seeking moves the one source (LAS-67); while paused or stopped it cues the next Play.
  // Returns false once the playhead is at either end, so a held FF/RWD stops repeating there.
  function seek(seconds) {
    const target = engine.current.seek(seconds);
    setPosition(target);
    return target > 0 && target < (track?.duration ?? 0);
  }
  const skip = delta => seek(engine.current.position() + delta);

  // Mastering chain settings and the Original/Processed choice (LAS-28).
  const chain = useChainSettings(engine);
  const [listening, setListening] = useState('processed');
  function listen(next) {
    setListening(next);
    engine.current.listen(next);
  }

  // While playing, the elapsed time is read from the engine's audio clock ten times a second.
  useEffect(() => {
    if (status !== 'Playing') return;
    const timer = setInterval(() => positionStore.set(engine.current.position()), 100);
    return () => clearInterval(timer);
  }, [status, positionStore]);

  // Loads a track (import, replacement and project relink). Rejects with the reason it failed.
  async function loadTrack(file) {
    setBusy('Loading audio…');
    setError('');
    try {
      const metadata = await engine.current.load(file);
      setTrack({ name: file.name, ...metadata });
      setCurrentFile(file);
      setStatus('Ready');
      setPosition(0);
    } finally {
      setBusy('');
    }
  }

  async function importAudio(event) {
    const file = event.target.files[0];
    if (!file) return;
    try {
      await loadTrack(file);
    } catch (failure) {
      // A superseded import was replaced by a newer choice, so it is not an error to show.
      if (failure.name !== 'SupersededError') setError(failure.message);
    } finally {
      // Clearing the picker lets the same file be chosen again.
      event.target.value = '';
    }
  }

  // New / Open project (LAS-60/69): the track and stems leave the session; files are not touched.
  function resetSession() {
    engine.current.stop();
    engine.current.unload();
    engine.current.clearStems();
    setTrack(null);
    setCurrentFile(null);
    setStems([]);
    setPosition(0);
    setError('');
    setStatus('No audio loaded');
  }
  const project = useProject({ engine, chain, listening, listen, windows, setWindows, track, currentFile, stems, setStems, resetSession, loadTrack });

  async function play() {
    setBusy('Starting playback…');
    setError('');
    try {
      // The engine resolves false when Stop, a new track or removal cancelled this start.
      if (await engine.current.play()) {
        setStatus('Playing');
        setPosition(engine.current.position()); // at once (Play from the end restarts at 0, LAS-67)
      }
    } catch {
      setError('Audio could not start. Try pressing Play again.');
    } finally {
      setBusy('');
    }
  }

  function pause() {
    engine.current.pause();
    setPosition(engine.current.position());
    setStatus('Paused');
  }

  // Pause is a toggle (LAS-11): it pauses while playing and resumes while paused.
  function togglePause() {
    if (status === 'Playing') pause();
    else if (status === 'Paused') play();
  }

  function stop() {
    engine.current.stop();
    setPosition(0);
    setStatus('Stopped');
  }

  // The reference comparison monitor (LAS-31) replaces normal playback while it runs.
  function monitorStarted() {
    setPosition(0);
    setStatus('Stopped');
  }

  // Takes the track out of the session; the file on the device is never touched (LAS-12).
  function removeTrack() {
    engine.current.unload();
    setTrack(null);
    setCurrentFile(null);
    setPosition(0);
    setError('');
    setStatus('No audio loaded');
    // The Remove button disappears, so keyboard focus moves to the import control.
    importInput.current.focus();
  }

  const playable = Boolean(track || stemCount) && !busy;
  return (
    <main data-processor-skin={processorSkin}>
      <header className="masthead">
        <div className="brand"><span className="brand-mark" aria-hidden="true">MPS</span><div><p className="eyebrow">LOCAL AUDIO WORKSPACE</p><div className="brand-title"><h1>MPS Audio Studio</h1><span className="build-identity" data-testid="build-identity" title={buildDetails} aria-label={buildDetails}>{buildLabel}</span></div></div></div>
        <div className="masthead-tools">
          {/* Project save state (LAS-69); a polite live region, not a second role=status. */}
          <span className={`version project-status${project.dirty ? ' is-dirty' : ''}${project.phase === 'error' ? ' is-error' : ''}`} aria-live="polite" title={project.status}>{project.status}</span><HelpTip id="project.status" className="inline" />
          {project.missingCount > 0 && <button type="button" className="heading-button" onClick={project.openRelink}>{project.missingCount} audio file{project.missingCount > 1 ? 's' : ''} missing — Relink…</button>}
          <WithHelp id="dialogs.references"><ReferencesDialog /></WithHelp><WithHelp id="dialogs.account"><AccountDialog currentFile={currentFile} /></WithHelp><HelpButton />
        </div>
      </header>

      <section className="transport panel" aria-label="Transport">
        <ProjectArea name={project.project.name} onNew={project.requestNew} onOpen={project.open} onSave={project.save} onSaveAs={project.saveAs} disabled={Boolean(busy)} />
        <div className="transport-buttons">
          <WithHelp id="transport.rewind"><SeekButton direction={-1} onSkip={skip} disabled={!track || Boolean(busy)} /></WithHelp>
          <WithHelp id="transport.play"><button className="primary" onClick={play} disabled={!track || busy || status === 'Playing'}><span aria-hidden="true">▶</span> Play</button></WithHelp>
          <WithHelp id="transport.pause"><button onClick={togglePause} aria-pressed={status === 'Paused'} disabled={busy || (status !== 'Playing' && status !== 'Paused')}><span aria-hidden="true">Ⅱ</span> Pause</button></WithHelp>
          <WithHelp id="transport.stop"><button onClick={stop} disabled={!track || busy}><span aria-hidden="true">■</span> Stop</button></WithHelp>
          <WithHelp id="transport.forward"><SeekButton direction={1} onSkip={skip} disabled={!track || Boolean(busy)} /></WithHelp>
        </div>
        <div className="transport-state">
          <p role="status" className="status">{busy || status}</p>
          <PlaybackClock store={positionStore} duration={track ? track.duration : 0} />
        </div>
      </section>

      <div className="workspace">
        <section className="tracks panel" aria-labelledby="tracks-title">
          <div className="panel-heading"><h2 id="tracks-title">Tracks</h2><div className="heading-tools">{track && <><WithHelp id="tracks.analyze"><AnalysisDialog file={currentFile} /></WithHelp><WithHelp id="tracks.compare"><CompareDialog engine={engine} file={currentFile} track={track} chain={chain} onMonitorStart={monitorStarted} /></WithHelp><WithHelp id="tracks.convert"><ConvertDialog file={currentFile} /></WithHelp><WithHelp id="tracks.remove"><button className="remove-track" onClick={removeTrack}>Remove track</button></WithHelp></>}<span className="badge">{track ? '01 TRACK' : '00 TRACKS'}</span></div></div>
          <div className="track-space">{track && <PlayerDisplay engine={engine} store={meters} />}<div className="track-content">
            <span className="audio-icon" aria-hidden="true"><span>♫</span></span>
            <h3 title={track ? track.name : undefined}>{track ? track.name : 'Your session starts here'}</h3>
            <p className="track-info">{track ? `${track.duration.toFixed(1)} seconds · ${track.channels} channel(s) · ${track.sampleRate.toLocaleString()} Hz decoded` : 'Import a WAV file to start listening.'}</p>
            <WithHelp id="tracks.import" className="picker-wrap"><label className="file-picker">{track ? 'Replace WAV' : 'Import WAV'}
              <input ref={importInput} type="file" accept=".wav,audio/wav" aria-label="Import WAV" onChange={importAudio} disabled={busy} />
            </label></WithHelp>
            <p className="fine-print">WAV up to {MAX_AUDIO_FILE_LABEL} · Files stay on your device</p>
          </div></div>
          {error && <p role="alert" className="error">{error}</p>}
          {project.problem && <p role="alert" className="error">{project.problem} <button type="button" className="link" onClick={project.clearProblem}>Dismiss</button></p>}
          <div className="track-footer player-footer">
            <Timeline store={positionStore} duration={track ? track.duration : 0} onSeek={seek} disabled={!track || Boolean(busy)} scrub={scrub} setScrub={setScrub} />
            <HelpTip id="transport.timeline" className="inline" />
            <BarMeters store={meters} />
          </div>
        </section>

        <section className="master panel" aria-labelledby="master-title">
          <div className="panel-heading"><h2 id="master-title">Master</h2><span className="badge">STEREO</span></div>
          <div className="master-body" role="region" aria-label="Master details" tabIndex={0}>
            <p className="eyebrow">OUTPUT STAGE</p>
            <ListenSwitch value={listening} onChange={listen} disabled={!track} help="master.listen" />
            <SuggestionsPanel engine={engine} file={currentFile} chain={chain} sampleRate={track ? track.sampleRate : 48000} />
            <LoudnessMatch engine={engine} file={currentFile} params={chain.params} />
          </div>
          <div className="master-level">
            <MasterLevel value={masterDb} onChange={changeMaster} disabled={!playable}
              reason={busy ? 'Available when the audio has loaded.' : 'Import a WAV or add stems to use the master level.'} />
          </div>
          <ExportDialog file={currentFile} params={chain.params} />
        </section>
      </div>

      <MixerPanel skin={processorSkin} onSkin={setProcessorSkin} windows={windows} setWindows={setWindows} chain={chain} engine={engine} track={track} sampleRate={track ? track.sampleRate : 48000} listening={listening} onListen={listen} tools={<WithHelp id="mixer.stems"><StemsDialog engine={engine} chain={chain} listening={listening} onListen={listen} onStemsPlay={monitorStarted} onStemsChange={setStems} masterLevel={{ value: masterDb, onChange: changeMaster }} /></WithHelp>} />
      <HelpView />
      <NewProjectDialog open={project.newOpen} onCreate={project.create} onCancel={project.cancelNew} />
      <UnsavedDialog prompt={project.prompt} onChoose={project.answer} />
      <RelinkDialog missing={project.missing} open={project.relink.open} busy={project.relink.busy} problem={project.relink.problem} onRelink={project.relinkFile} onClose={project.closeRelink} />
      <footer><span className="connection">LOCAL / WEB AUDIO</span><span>EQ, dynamics, limiter and WAV export run on this device · reference matching and multitrack are planned.</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
