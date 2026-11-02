import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EditorDialog } from './EditorDialog.jsx';
import { EqEditor, EqThumbnail } from './EqEditor.jsx';
import { CompressorEditor, LimiterEditor } from './ModuleEditors.jsx';
import { GainReductionMeter } from './GainReductionMeter.jsx';
import { ListenSwitch } from './ListeningControls.jsx';
import { SettingsDialog } from './SettingsDialog.jsx';

function eqCaption(eq) {
  if (!eq.enabled) return 'Bypassed';
  const count = bands => bands.filter(band => band.enabled).length;
  if (eq.mode === 'link') return count(eq.left) ? `${count(eq.left)} band${count(eq.left) === 1 ? '' : 's'} · Link` : 'Flat · Link';
  return `L ${count(eq.left)} · R ${count(eq.right)} bands`;
}

// Editor windows (LAS-61/62): each module's editor opens on its own, cascaded from the right-hand
// side of the viewport on first opening; afterwards it keeps the position it was given for the
// session. Positions and stacking are view state only: they never reach the audio engine.
const WINDOW_ORDER = ['eq', 'dynamics', 'limiter', 'space'];
// Windows open below the transport, so Play/Pause/Stop stay uncovered.
function defaultPosition(name) {
  const index = WINDOW_ORDER.indexOf(name);
  const width = Math.min(680, window.innerWidth - 32);
  const transport = document.querySelector('.transport')?.getBoundingClientRect();
  const below = transport && transport.bottom > 0 && transport.bottom < window.innerHeight / 2 ? transport.bottom + 8 : 72;
  return { x: Math.max(8, window.innerWidth - width - 16 - 36 * index), y: Math.round(Math.max(8, below + 36 * index)) };
}

// The mixer (LAS-28): the mastering chain's modules in processing order, each with a real indicator
// and an editor, plus undo/redo and saved settings. Space (reverb/width) is not built yet.
export function MixerPanel({ chain, engine, track, sampleRate, listening, onListen, tools }) {
  // name → { open, position, z, focusRequest }; the highest z is the front (active) window.
  const [windows, setWindows] = useState({});
  const top = useRef(0);
  const { params, update, undo, redo, canUndo, canRedo, replace, warnings, problem } = chain;
  const active = Boolean(track);

  const openEditor = useCallback(name => setWindows(all => {
    const current = all[name];
    const z = current?.open && current.z === top.current ? current.z : ++top.current;
    return { ...all, [name]: { position: current?.position ?? defaultPosition(name), open: true, z, focusRequest: (current?.focusRequest ?? 0) + 1 } };
  }), []);
  const closeEditor = useCallback(name => setWindows(all => ({ ...all, [name]: { ...all[name], open: false } })), []);
  // One stable set of handlers per editor, so the windows do not re-subscribe on every render.
  const handlers = useMemo(() => Object.fromEntries(WINDOW_ORDER.map(name => [name, {
    close: () => closeEditor(name),
    move: position => setWindows(all => ({ ...all, [name]: { ...all[name], position } })),
    front: () => setWindows(all => (all[name]?.z === top.current ? all : { ...all, [name]: { ...all[name], z: ++top.current } })),
    resetPosition: () => setWindows(all => ({ ...all, [name]: { ...all[name], position: defaultPosition(name) } })),
  }])), [closeEditor]);
  const openWindows = WINDOW_ORDER.filter(name => windows[name]?.open);
  const front = openWindows.reduce((best, name) => (best && windows[best].z > windows[name].z ? best : name), null);
  const resetLayout = () => setWindows(all => Object.fromEntries(Object.entries(all).map(([name, w]) => [name, { ...w, position: defaultPosition(name) }])));

  // Escape with focus on the page (not in a window) closes the front window only.
  useEffect(() => {
    if (!front) return undefined;
    function onKey(event) {
      if (event.key === 'Escape' && document.activeElement === document.body) {
        event.preventDefault();
        closeEditor(front);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [front, closeEditor]);
  const windowProps = name => ({
    open: Boolean(windows[name]?.open), position: windows[name]?.position ?? null, z: windows[name]?.z ?? 0, active: front === name,
    focusRequest: windows[name]?.focusRequest ?? 0, onClose: handlers[name].close, onMove: handlers[name].move, onFront: handlers[name].front,
    onResetPosition: handlers[name].resetPosition,
  });

  // Ctrl/Cmd+Z undoes and Shift+Ctrl/Cmd+Z (or Ctrl+Y) redoes, except while typing in a field.
  useEffect(() => {
    function onKey(event) {
      if (!(event.ctrlKey || event.metaKey) || event.target.closest('input, select, textarea')) return;
      const key = event.key.toLowerCase();
      if (key === 'z' && !event.shiftKey) { event.preventDefault(); undo(); }
      if ((key === 'z' && event.shiftKey) || key === 'y') { event.preventDefault(); redo(); }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // Editors cover part of the page, so they carry their own Undo/Redo and Original/Processed switch.
  const history = (
    <span className="history-buttons">
      <button className="heading-button" onClick={undo} disabled={!canUndo}>Undo</button>
      <button className="heading-button" onClick={redo} disabled={!canRedo}>Redo</button>
    </span>
  );
  const editorTools = <>{history}<ListenSwitch value={listening} onChange={onListen} disabled={!active} /></>;
  const strips = [
    { name: 'EQ', visual: <EqThumbnail params={params} sampleRate={sampleRate} />, caption: eqCaption(params.eq), edit: 'Edit EQ', editor: 'eq' },
    { name: 'Dynamics', visual: <GainReductionMeter engine={engine} which="compressor" label="Compressor gain reduction" active={active} compact />, caption: params.compressor.enabled ? `${params.compressor.threshold} dB · ${params.compressor.ratio}:1` : 'Off', edit: 'Edit dynamics', editor: 'dynamics' },
    { name: 'Limiter', visual: <GainReductionMeter engine={engine} which="limiter" label="Limiter gain reduction" active={active} compact />, caption: params.limiter.enabled ? `Ceiling ${params.limiter.ceiling.toFixed(1)} dBTP` : 'Off', edit: 'Edit limiter', editor: 'limiter' },
  ];
  return (
    <section className="mixer panel" aria-labelledby="mixer-title">
      <div className="panel-heading">
        <h2 id="mixer-title">Mixer</h2>
        <div className="heading-tools">
          {history}
          <button className="heading-button" onClick={resetLayout} disabled={!Object.keys(windows).length}>Reset window layout</button>
          <SettingsDialog params={params} replace={replace} />
          {tools}
        </div>
      </div>
      {(problem || warnings.length > 0) && <p className="mixer-note" aria-live="polite">{problem || warnings.join(' ')}</p>}
      <div className="strips" role="group" aria-label="Processing modules" tabIndex={0}>
        {strips.map((strip, index) => (
          <section className="strip" key={strip.name} aria-label={`${strip.name} channel strip`}>
            <div className="strip-title"><span className="strip-number">0{index + 1}</span><h3>{strip.name}</h3></div>
            <div className="strip-visual">{strip.visual}</div>
            <p>{strip.caption}</p>
            {/* Visible "Edit" (the strip title names the module); the accessible name says which. */}
            <button className={windows[strip.editor]?.open ? 'is-open' : undefined} onClick={() => openEditor(strip.editor)} aria-label={strip.edit}>Edit</button>
          </section>
        ))}
        <section className="strip" aria-label="Space channel strip">
          <div className="strip-title"><span className="strip-number">04</span><h3>Space</h3></div>
          <div className="knob" aria-hidden="true" />
          <p>Coming soon</p>
          <button disabled aria-label="Space processing unavailable">Unavailable</button>
        </section>
      </div>
      <EditorDialog title="EQ" {...windowProps('eq')} headerExtra={editorTools}>
        <EqEditor params={params} update={update} sampleRate={sampleRate} engine={engine} />
      </EditorDialog>
      <EditorDialog title="Dynamics" {...windowProps('dynamics')} headerExtra={editorTools}>
        <CompressorEditor params={params} update={update} engine={engine} active={active} />
      </EditorDialog>
      <EditorDialog title="Limiter" {...windowProps('limiter')} headerExtra={editorTools}>
        <LimiterEditor params={params} update={update} engine={engine} active={active} latency={track ? engine.current?.latency() : 0} sampleRate={sampleRate} />
      </EditorDialog>
    </section>
  );
}
