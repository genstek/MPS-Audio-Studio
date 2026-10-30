import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createAudioEngine } from './audio-engine.js';
import { AccountDialog } from './AccountDialog.jsx';
import { AnalysisDialog } from './AnalysisDialog.jsx';
import { MixerPanel } from './MixerPanel.jsx';
import { ExportDialog } from './ExportDialog.jsx';
import { ListenSwitch, LoudnessMatch } from './ListeningControls.jsx';
import { useChainSettings } from './useChainSettings.js';
import { ReferencesDialog } from './ReferencesDialog.jsx';
import { CompareDialog } from './CompareDialog.jsx';
import './styles.css';

// Seconds as mm:ss.t, rounded to a tenth of a second.
function clock(seconds) {
  const tenths = Math.round(seconds * 10);
  const minutes = String(Math.floor(tenths / 600)).padStart(2, '0');
  const rest = ((tenths % 600) / 10).toFixed(1).padStart(4, '0');
  return `${minutes}:${rest}`;
}

function App() {
  const [track, setTrack] = useState(null);
  const [status, setStatus] = useState('No audio loaded');
  const [error, setError] = useState('');
  // What the app is waiting for ('' when idle); shown instead of the status meanwhile.
  const [busy, setBusy] = useState('');
  const [position, setPosition] = useState(0);
  // The imported File, kept only so a signed-in user can choose to save it (LAS-23).
  const [currentFile, setCurrentFile] = useState(null);
  const engine = useRef(null);
  const importInput = useRef(null);

  useEffect(() => {
    engine.current = createAudioEngine(() => {
      setStatus('Stopped');
      setPosition(0);
    });
    return () => engine.current.dispose();
  }, []);

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
    const timer = setInterval(() => setPosition(engine.current.position()), 100);
    return () => clearInterval(timer);
  }, [status]);

  async function importAudio(event) {
    const file = event.target.files[0];
    if (!file) return;
    setBusy('Loading audio…');
    setError('');
    try {
      const metadata = await engine.current.load(file);
      setTrack({ name: file.name, ...metadata });
      setCurrentFile(file);
      setStatus('Ready');
      setPosition(0);
    } catch (failure) {
      // A superseded import was replaced by a newer choice, so it is not an error to show.
      if (failure.name !== 'SupersededError') setError(failure.message);
    } finally {
      setBusy('');
      // Clearing the picker lets the same file be chosen again.
      event.target.value = '';
    }
  }

  async function play() {
    setBusy('Starting playback…');
    setError('');
    try {
      // The engine resolves false when Stop, a new track or removal cancelled this start.
      if (await engine.current.play()) setStatus('Playing');
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

  return (
    <main>
      <header className="masthead">
        <div className="brand"><span className="brand-mark" aria-hidden="true">MPS</span><div><p className="eyebrow">LOCAL AUDIO WORKSPACE</p><h1>MPS Audio Studio</h1></div></div>
        <div className="masthead-tools"><span className="version">SPRINT 0 <span aria-hidden="true">/</span> WEB MIXER</span><ReferencesDialog /><AccountDialog currentFile={currentFile} /></div>
      </header>

      <section className="transport panel" aria-label="Transport">
        <div><p className="eyebrow">SESSION 001</p><h2>Untitled project</h2></div>
        <div className="transport-buttons">
          <button className="primary" onClick={play} disabled={!track || busy || status === 'Playing'}>▶ Play</button>
          <button onClick={togglePause} aria-pressed={status === 'Paused'} disabled={busy || (status !== 'Playing' && status !== 'Paused')}>Ⅱ Pause</button>
          <button onClick={stop} disabled={!track || busy}>■ Stop</button>
        </div>
        <div className="transport-state">
          <p role="status" className="status">{busy || status}</p>
          <p role="timer" aria-label="Playback position" className="position">{clock(position)} / {clock(track ? track.duration : 0)}</p>
        </div>
      </section>

      <div className="workspace">
        <section className="tracks panel" aria-labelledby="tracks-title">
          <div className="panel-heading"><h2 id="tracks-title">Tracks</h2><div className="heading-tools">{track && <><AnalysisDialog file={currentFile} /><CompareDialog engine={engine} file={currentFile} track={track} params={chain.params} onMonitorStart={monitorStarted} /><button className="remove-track" onClick={removeTrack}>Remove track</button></>}<span className="badge">{track ? '01 TRACK' : '00 TRACKS'}</span></div></div>
          <div className="track-space"><div className="track-content">
            <span className="audio-icon" aria-hidden="true"><span>♫</span></span>
            <h3 title={track ? track.name : undefined}>{track ? track.name : 'Your session starts here'}</h3>
            <p className="track-info">{track ? `${track.duration.toFixed(1)} seconds · ${track.channels} channel(s) · ${track.sampleRate.toLocaleString()} Hz decoded` : 'Import a WAV file to start listening.'}</p>
            <label className="file-picker">{track ? 'Replace WAV' : 'Import WAV'}
              <input ref={importInput} type="file" accept=".wav,audio/wav" aria-label="Import WAV" onChange={importAudio} disabled={busy} />
            </label>
            <p className="fine-print">WAV up to 100 MiB · Files stay on your device</p>
          </div></div>
          {error && <p role="alert" className="error">{error}</p>}
          <div className="track-footer">SINGLE-TRACK PLAYBACK <span>Waveform & seeking coming soon</span></div>
        </section>

        <section className="master panel" aria-labelledby="master-title">
          <div className="panel-heading"><h2 id="master-title">Master</h2><span className="badge">STEREO</span></div>
          <div className="master-body" role="region" aria-label="Master details" tabIndex={0}>
            <p className="eyebrow">OUTPUT STAGE</p>
            <ListenSwitch value={listening} onChange={listen} disabled={!track} />
            <LoudnessMatch engine={engine} file={currentFile} params={chain.params} />
          </div>
          <div className="master-level"><label>Master level<input aria-label="Master level" type="range" min="0" max="100" defaultValue="75" disabled /></label><p className="fine-print">Level control unavailable</p></div>
          <ExportDialog file={currentFile} params={chain.params} />
        </section>
      </div>

      <MixerPanel chain={chain} engine={engine} track={track} sampleRate={track ? track.sampleRate : 48000} listening={listening} onListen={listen} />
      <footer><span className="connection">LOCAL / WEB AUDIO</span><span>EQ, dynamics, limiter and WAV export run on this device · reference matching and multitrack are planned.</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
