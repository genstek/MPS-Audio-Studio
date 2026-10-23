import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createAudioEngine } from './audio-engine.js';
import './styles.css';

function App() {
  const [track, setTrack] = useState(null);
  const [status, setStatus] = useState('No audio loaded');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const engine = useRef(null);

  useEffect(() => {
    engine.current = createAudioEngine(() => setStatus('Stopped'));
    return () => engine.current.dispose();
  }, []);

  async function importAudio(event) {
    const file = event.target.files[0];
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const metadata = await engine.current.load(file);
      setTrack({ name: file.name, ...metadata });
      setStatus('Ready');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setBusy(false);
      event.target.value = '';
    }
  }

  async function play() {
    setBusy(true);
    setError('');
    try {
      await engine.current.play();
      setStatus('Playing');
    } catch {
      setError('Audio could not start. Try pressing Play again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main>
      <header className="masthead">
        <div className="brand"><span className="brand-mark" aria-hidden="true">MPS</span><div><p className="eyebrow">LOCAL AUDIO WORKSPACE</p><h1>MPS Audio Studio</h1></div></div>
        <span className="version">SPRINT 0 <span aria-hidden="true">/</span> WEB MIXER</span>
      </header>

      <section className="transport panel" aria-label="Transport">
        <div><p className="eyebrow">SESSION 001</p><h2>Untitled project</h2></div>
        <div className="transport-buttons">
          <button className="primary" onClick={play} disabled={!track || busy || status === 'Playing'}>▶ Play</button>
          <button onClick={() => { engine.current.pause(); setStatus('Paused'); }} disabled={busy || status !== 'Playing'}>Ⅱ Pause</button>
          <button onClick={() => { engine.current.stop(); setStatus('Stopped'); }} disabled={!track || busy}>■ Stop</button>
        </div>
        <p role="status" className="status">{busy ? 'Loading audio…' : status}</p>
      </section>

      <div className="workspace">
        <section className="tracks panel" aria-labelledby="tracks-title">
          <div className="panel-heading"><h2 id="tracks-title">Tracks</h2><span className="badge">{track ? '01 TRACK' : '00 TRACKS'}</span></div>
          <div className="track-space"><div className="track-content">
            <span className="audio-icon" aria-hidden="true"><span>♫</span></span>
            <h3 title={track ? track.name : undefined}>{track ? track.name : 'Your session starts here'}</h3>
            <p className="track-info">{track ? `${track.duration.toFixed(1)} seconds · ${track.channels} channel(s) · ${track.sampleRate.toLocaleString()} Hz decoded` : 'Import a WAV file to start listening.'}</p>
            <label className="file-picker">{track ? 'Replace WAV' : 'Import WAV'}
              <input type="file" accept=".wav,audio/wav" aria-label="Import WAV" onChange={importAudio} disabled={busy} />
            </label>
            <p className="fine-print">WAV up to 100 MiB · Files stay on your device</p>
          </div></div>
          {error && <p role="alert" className="error">{error}</p>}
          <div className="track-footer">SINGLE-TRACK PLAYBACK <span>Waveform & seeking coming soon</span></div>
        </section>

        <section className="master panel" aria-labelledby="master-title">
          <div className="panel-heading"><h2 id="master-title">Master</h2><span className="badge">STEREO</span></div>
          <div className="master-body" role="region" aria-label="Master details" tabIndex={0}><p className="eyebrow">OUTPUT STAGE</p><div className="master-symbol" aria-hidden="true">L <span>│</span> R</div><p>Direct playback</p><p className="muted">Output trim and measured meters coming soon.</p></div>
          <div className="master-level"><label>Master level<input aria-label="Master level" type="range" min="0" max="100" defaultValue="75" disabled /></label><p className="fine-print">Level control unavailable</p></div>
          <button disabled>Export WAV — coming soon</button>
        </section>
      </div>

      <section className="mixer panel" aria-labelledby="mixer-title">
        <div className="panel-heading"><h2 id="mixer-title">Mixer</h2><span className="badge">PROCESSING MODULES · COMING SOON</span></div>
        <div className="strips" role="group" aria-label="Processing modules" tabIndex={0}>{['Input', 'EQ', 'Dynamics', 'Space'].map((name, index) => (
          <section className="strip" key={name} aria-label={`${name} channel strip`}>
            <div className="strip-title"><span className="strip-number">0{index + 1}</span><h3>{name}</h3></div>
            <div className="knob" aria-hidden="true" />
            <p>Coming soon</p>
            <button disabled aria-label={`${name} processing unavailable`}>Unavailable</button>
          </section>
        ))}</div>
      </section>
      <footer><span className="connection">LOCAL / WEB AUDIO</span><span>Playback foundation · EQ, dynamics, multitrack and export are planned.</span></footer>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
