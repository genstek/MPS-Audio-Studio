import React, { useEffect, useRef, useState } from 'react';
import { ListenSwitch } from './ListeningControls.jsx';

const clock = seconds => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
const db = value => (value === null ? '−∞' : value.toFixed(1).replace('-', '−'));
const meterWidth = value => `${value === null ? 0 : Math.max(0, Math.min(100, ((value + 60) / 60) * 100))}%`;

function Meter({ label, level }) {
  return (
    <span className="stem-meter" role="meter" aria-label={label} aria-valuemin={-60} aria-valuemax={0} aria-valuenow={level?.peakDb ?? -60} aria-valuetext={level ? `peak ${db(level.peakDb)} dBFS` : 'silent'}>
      <span style={{ width: meterWidth(level?.peakDb ?? null) }} />
      <small>{level ? `${db(level.peakDb)} dBFS` : '—'}</small>
    </span>
  );
}

// Stem session (LAS-34): several original stems played together through the master chain, each on
// its own strip with gain, pan, mute, solo, offset and a meter of what it sends to the mix. The
// session has its own transport with seek; the single-track transport stops while it plays.
export function StemsDialog({ engine, listening, onListen, onStemsPlay }) {
  const dialog = useRef(null);
  const [stems, setStems] = useState([]);
  const [state, setState] = useState({ playing: false, position: 0, duration: 0, rate: null });
  const [levels, setLevels] = useState({ stems: [], master: null });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const refresh = () => {
    const session = engine.current.stemSession();
    if (!session) return;
    setStems(session.stems());
    setState({ playing: session.playing(), position: session.position(), duration: session.duration(), rate: engine.current.sampleRate() });
  };

  // Position and meters ten times a second while the dialog is open and playing.
  useEffect(() => {
    if (!state.playing) return undefined;
    const timer = setInterval(() => {
      const session = engine.current.stemSession();
      if (!session) return;
      setLevels(engine.current.stemLevels());
      setState(s => ({ ...s, playing: session.playing(), position: session.position() }));
    }, 100);
    return () => clearInterval(timer);
  }, [engine, state.playing]);

  async function open() {
    setError('');
    dialog.current.showModal();
    try {
      await engine.current.openStems(() => refresh());
      refresh();
    } catch (failure) {
      setError(failure.message);
    }
  }

  async function add(event) {
    const files = [...event.target.files];
    event.target.value = '';
    setError('');
    for (const file of files) {
      setBusy(`Loading ${file.name}…`);
      try {
        await engine.current.addStem(file);
      } catch (failure) {
        setError(`${file.name}: ${failure.message}`);
      }
    }
    setBusy('');
    refresh();
  }

  const act = (action, ...args) => { engine.current.stemSession()[action](...args); refresh(); };
  async function play() {
    setError('');
    try {
      if (await engine.current.playStems()) onStemsPlay();
    } catch {
      setError('Audio could not start. Try pressing Play again.');
    }
    refresh();
  }

  function close() {
    engine.current.stemSession()?.pause();
    refresh();
  }

  const notes = [];
  for (const stem of stems) {
    if (state.rate && stem.fileSampleRate !== state.rate) notes.push(`${stem.name} is ${stem.fileSampleRate.toLocaleString('en-US')} Hz; it plays resampled to ${state.rate.toLocaleString('en-US')} Hz by the browser.`);
    if (stem.fileChannels > 2) notes.push(`${stem.name} has ${stem.fileChannels} channels; it plays as a stereo downmix.`);
  }
  const ends = stems.map(stem => stem.offset + stem.duration);
  if (ends.length > 1 && Math.max(...ends) - Math.min(...ends) > 0.001) notes.push(`The stems end at different times (${Math.min(...ends).toFixed(2)}–${Math.max(...ends).toFixed(2)} s); the session lasts until the last one ends, shorter stems are silent after their end.`);

  return (
    <>
      <button className="heading-button" onClick={open}>Stems…</button>
      <dialog ref={dialog} className="analysis-dialog stems-dialog" aria-labelledby="stems-title" onClose={close}>
        <div className="account-heading">
          <h2 id="stems-title">Stem session</h2>
          <button className="dialog-close" onClick={() => dialog.current.close()} aria-label="Close stems">×</button>
        </div>
        <p className="fine-print">Original stems play together through the master chain, each on its own strip. Stems start together at their first sample; an offset delays one by whole samples. Files stay on this device and are never changed.</p>
        <p className="account-status" role="status">{busy || (stems.length ? `${stems.length} stem${stems.length > 1 ? 's' : ''} · ${clock(state.duration)}` : 'No stems yet.')}</p>
        {error && <p className="account-error" role="alert">{error}</p>}
        <label className="file-picker small">Add stem WAVs<input type="file" accept=".wav,audio/wav" multiple aria-label="Add stem WAVs" onChange={add} /></label>
        {notes.length > 0 && <ul className="comparison-conditions" aria-label="Alignment notes">{notes.map(note => <li key={note}>{note}</li>)}</ul>}
        {stems.length > 0 && (
          <>
            <section className="stems-transport" aria-label="Stem transport">
              <button className="primary" onClick={play} disabled={state.playing}>▶ Play</button>
              <button onClick={() => act('pause')} disabled={!state.playing}>Ⅱ Pause</button>
              <button onClick={() => act('stop')}>■ Stop</button>
              <label className="stems-seek">Position
                <input type="range" min="0" max={state.duration} step="0.01" value={state.position} aria-valuetext={`${clock(state.position)} of ${clock(state.duration)}`} onChange={e => act('seek', Number(e.target.value))} />
              </label>
              <span role="timer" aria-label="Stem position">{clock(state.position)} / {clock(state.duration)}</span>
              <ListenSwitch value={listening} onChange={onListen} />
              <span className="stems-master"><span className="fine-print" aria-hidden="true">Master</span><Meter label="Master level" level={levels.master} /></span>
            </section>
            <ul className="stem-strips">
              {stems.map(stem => {
                const level = levels.stems.find(l => l.id === stem.id);
                return (
                  <li key={stem.id} className={`stem-strip${stem.audible ? '' : ' is-silent'}`} aria-label={`Stem ${stem.name}`}>
                    <strong className="stem-name" title={stem.name}>{stem.name}</strong>
                    <span className="fine-print">{stem.fileSampleRate.toLocaleString('en-US')} Hz · {stem.fileChannels === 1 ? 'mono' : stem.fileChannels === 2 ? 'stereo' : `${stem.fileChannels} ch`} · {stem.duration.toFixed(2)} s</span>
                    <label>Gain (dB)<input type="range" min="-24" max="12" step="0.5" value={stem.gainDb} aria-valuetext={`${stem.gainDb} dB`} onChange={e => act('setGain', stem.id, Number(e.target.value))} /><span className="fine-print" aria-hidden="true">{stem.gainDb > 0 ? '+' : ''}{String(stem.gainDb).replace('-', '−')} dB</span></label>
                    <label>Pan<input type="range" min="-1" max="1" step="0.05" value={stem.pan} aria-valuetext={stem.pan === 0 ? 'centre' : `${Math.round(Math.abs(stem.pan) * 100)} % ${stem.pan < 0 ? 'left' : 'right'}`} onChange={e => act('setPan', stem.id, Number(e.target.value))} /></label>
                    <label>Offset (ms)<input type="number" min="0" max="600000" step="1" value={Math.round(stem.offset * 1000 * 1000) / 1000} onChange={e => act('setOffset', stem.id, Math.max(0, Number(e.target.value) / 1000))} /></label>
                    <span className="stem-toggles">
                      <button type="button" aria-pressed={stem.mute} onClick={() => act('setMute', stem.id, !stem.mute)}>Mute</button>
                      <button type="button" aria-pressed={stem.solo} onClick={() => act('setSolo', stem.id, !stem.solo)}>Solo</button>
                      <button type="button" onClick={() => act('remove', stem.id)} aria-label={`Remove ${stem.name}`}>Remove</button>
                    </span>
                    <Meter label={`${stem.name} level`} level={level} />
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </dialog>
    </>
  );
}
