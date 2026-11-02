import React, { useEffect, useRef, useState } from 'react';
import { ListenSwitch } from './ListeningControls.jsx';
import { parseChain } from './dsp/chain-params.js';
import { bypassChain } from './dsp/stem-render.js';
import { parsePresetFile } from './presets.js';
import { startRender } from './render-client.js';
import { MAX_AUDIO_FILE_LABEL } from './file-limits.js';
import { MasterLevel } from './MasterLevel.jsx';
import { matchStems, parseStemSession, serializeStemSession } from './stem-session-file.js';

const download = (blob, name) => {
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement('a'), { href: url, download: name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};
// A settings file for one stem: an mps-chain settings file or an mps-preset file.
async function readChainFile(file) {
  const text = await file.text();
  try {
    return parseChain(text);
  } catch (chainFailure) {
    try { return parsePresetFile(text, file.name).preset.chain; } catch { throw chainFailure; }
  }
}

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
// LAS-35: each strip has its own chain (bypass, a copy of the master settings, or a settings file),
// the session's settings can be saved and recalled, and the stem master is rendered offline.
export function StemsDialog({ engine, chain, listening, onListen, onStemsPlay, onStemsChange = () => {}, masterLevel }) {
  const dialog = useRef(null);
  const [stems, setStems] = useState([]);
  const [state, setState] = useState({ playing: false, position: 0, duration: 0, rate: null });
  const [levels, setLevels] = useState({ stems: [], master: null });
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [bitDepth, setBitDepth] = useState(24);
  const [render, setRender] = useState(null); // { report, urls } or { running, stage }
  const renderJob = useRef(null);

  const refresh = () => {
    const session = engine.current.stemSession();
    if (!session) return;
    setStems(session.stems());
    onStemsChange(session.stems().length);
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
    renderJob.current?.cancel();
    refresh();
  }

  // A stem's own chain (LAS-35): applied live, rendered offline.
  async function setStemChain(stem, params, label) {
    setError('');
    try {
      await engine.current.stemSession().setChain(stem.id, params, label);
      setMessage(`${stem.name}: chain ${label}.`);
    } catch (failure) {
      setError(`${stem.name}: ${failure.message}`);
    }
    refresh();
  }

  async function loadStemChain(stem, event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    try {
      await setStemChain(stem, await readChainFile(file), `from ${file.name}`);
    } catch (failure) {
      setError(`${file.name}: ${failure.message} Nothing was changed.`);
    }
  }

  function saveSession() {
    download(new Blob([serializeStemSession(engine.current.stemSession().stems(), chain.params)], { type: 'application/json' }), 'mps-stem-session.json');
    setMessage('Saved the session settings (no audio) as mps-stem-session.json.');
  }

  // Recall: settings apply only to the loaded stems with the same checksum; the master chain is one
  // undo step in the mixer.
  async function loadSession(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    setError('');
    let saved;
    try {
      saved = parseStemSession(await file.text());
    } catch (failure) {
      setError(`${file.name}: ${failure.message} Nothing was changed.`);
      return;
    }
    const session = engine.current.stemSession();
    const { matched, missing } = matchStems(saved.stems, session.stems());
    for (const { loadedId, saved: entry } of matched) {
      session.setOffset(loadedId, entry.offset);
      session.setGain(loadedId, entry.gainDb);
      session.setPan(loadedId, entry.pan);
      session.setMute(loadedId, entry.mute);
      session.setSolo(loadedId, entry.solo);
      await session.setChain(loadedId, entry.chain, entry.chainLabel);
    }
    chain.replace(saved.master);
    setMessage(`Recalled ${matched.length} of ${saved.stems.length} stems and the master chain.${missing.length ? ` Not loaded (no stem with the same checksum): ${missing.join(', ')}.` : ''}`);
    refresh();
  }

  function renderMaster() {
    renderJob.current?.cancel();
    setError('');
    setRender({ running: true, stage: 'Starting…' });
    const list = engine.current.stemSession().stems().map(s => ({ file: s.file, name: s.name, offsetSeconds: s.offset, gainDb: s.gainDb, pan: s.pan, mute: s.mute, solo: s.solo, params: s.params }));
    const job = startRender(null, { mode: 'stems', stems: list, params: chain.params, bitDepth }, ({ stage }) => setRender(r => (r?.running ? { running: true, stage } : r)));
    renderJob.current = job;
    job.result.then(({ report, bytes }) => {
      if (renderJob.current !== job) return;
      setRender({ report, blobs: bytes.map(b => new Blob([b], { type: 'audio/wav' })) });
    }, failure => {
      if (renderJob.current !== job) return;
      setRender(null);
      if (failure.name !== 'AbortError') setError(failure.message);
    });
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
        {message && <p className="fine-print" aria-live="polite">{message}</p>}
        {error && <p className="account-error" role="alert">{error}</p>}
        <label className="file-picker small">Add stem WAVs<input type="file" accept=".wav,audio/wav" multiple aria-label="Add stem WAVs" onChange={add} /></label>
        <p className="fine-print">Each stem WAV up to {MAX_AUDIO_FILE_LABEL}. Every stem is decoded into memory, so several long stems need much more memory than one file.</p>
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
              <span className="stems-master"><span className="fine-print" aria-hidden="true">Master</span><Meter label="Master output level" level={levels.master} /></span>
              {masterLevel && <MasterLevel value={masterLevel.value} onChange={masterLevel.onChange} compact />}
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
                    <span className="stem-chain">
                      <span className="fine-print">Chain: {stem.chainLabel}</span>
                      <button type="button" onClick={() => setStemChain(stem, chain.params, 'copy of master settings')} aria-label={`Use master settings on ${stem.name}`}>Use master settings</button>
                      <label className="file-picker small">Load settings…<input type="file" accept=".json,application/json" aria-label={`Load settings for ${stem.name}`} onChange={e => loadStemChain(stem, e)} /></label>
                      <button type="button" onClick={() => setStemChain(stem, bypassChain(), 'bypass')} aria-label={`Bypass the chain of ${stem.name}`}>Bypass</button>
                    </span>
                  </li>
                );
              })}
            </ul>
            <section className="stems-output" aria-labelledby="stems-output-title">
              <h3 id="stems-output-title">Session and render</h3>
              <div className="proposal-buttons">
                <button type="button" onClick={saveSession}>Save session file</button>
                <label className="file-picker small">Load session file…<input type="file" accept=".json,application/json" aria-label="Load stem session file" onChange={loadSession} /></label>
              </div>
              <p className="fine-print">A session file holds the strip settings, each stem's chain and the master chain, matched to stems by checksum. No audio is stored in it.</p>
              <div className="proposal-buttons">
                <label>Bit depth
                  <select value={bitDepth} onChange={e => setBitDepth(Number(e.target.value))}><option value={24}>24-bit PCM</option><option value={16}>16-bit PCM (TPDF dither)</option></select>
                </label>
                <button type="button" className="primary" onClick={renderMaster} disabled={render?.running}>Render stem master</button>
                {render?.running && <button type="button" onClick={() => { renderJob.current?.cancel(); setRender(null); }}>Cancel render</button>}
              </div>
              <p className="fine-print" aria-live="polite">{render?.running ? render.stage : render?.report ? `Rendered ${render.report.files.length} files${render.report.silent.length ? `; muted or not soloed, so not rendered: ${render.report.silent.join(', ')}` : ''}.` : 'Renders from the files themselves at their own sample rate: every audible stem through its chain, gain, pan and offset, summed through the master chain. Samples beyond full scale are clipped and counted, never normalised.'}</p>
              {render?.report && (
                <div className="table-scroll" role="region" aria-label="Rendered files" tabIndex={0}>
                <table className="analysis-table stems-render">
                  <caption>Rendered files (latency compensated: {render.report.latencyCompensatedSamples} samples per chain)</caption>
                  <thead><tr><th scope="col">File</th><th scope="col">Length</th><th scope="col">Format</th><th scope="col">Peak / true peak</th><th scope="col">Clipped</th><th scope="col"><span className="visually-hidden">Download</span></th></tr></thead>
                  <tbody>
                    {render.report.files.map((f, i) => (
                      <tr key={f.name}>
                        <th scope="row">{f.name}</th>
                        <td>{f.duration.toFixed(3)} s · {f.frames.toLocaleString('en-US')} samples</td>
                        <td>{f.sampleRate.toLocaleString('en-US')} Hz · {f.channels} ch · {f.bitDepth}-bit</td>
                        <td>{db(f.samplePeakDbfs)} dBFS / {db(f.truePeakDbtp)} dBTP</td>
                        <td>{f.clippedSamples}</td>
                        <td><button type="button" onClick={() => download(render.blobs[i], f.name)} aria-label={`Save ${f.name}`}>Save</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </section>
          </>
        )}
      </dialog>
    </>
  );
}
