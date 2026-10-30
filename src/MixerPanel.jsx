import React, { useEffect, useState } from 'react';
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

// The mixer (LAS-28): the mastering chain's modules in processing order, each with a real indicator
// and an editor, plus undo/redo and saved settings. Space (reverb/width) is not built yet.
export function MixerPanel({ chain, engine, track, sampleRate, listening, onListen, tools }) {
  const [editor, setEditor] = useState(null);
  const { params, update, undo, redo, canUndo, canRedo, replace, warnings, problem } = chain;
  const active = Boolean(track);

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
            <button onClick={() => setEditor(strip.editor)} aria-label={strip.edit}>Edit</button>
          </section>
        ))}
        <section className="strip" aria-label="Space channel strip">
          <div className="strip-title"><span className="strip-number">04</span><h3>Space</h3></div>
          <div className="knob" aria-hidden="true" />
          <p>Coming soon</p>
          <button disabled aria-label="Space processing unavailable">Unavailable</button>
        </section>
      </div>
      <EditorDialog title="EQ" open={editor === 'eq'} onClose={() => setEditor(null)} headerExtra={editorTools}>
        <EqEditor params={params} update={update} sampleRate={sampleRate} engine={engine} />
      </EditorDialog>
      <EditorDialog title="Dynamics" open={editor === 'dynamics'} onClose={() => setEditor(null)} headerExtra={editorTools}>
        <CompressorEditor params={params} update={update} engine={engine} active={active} />
      </EditorDialog>
      <EditorDialog title="Limiter" open={editor === 'limiter'} onClose={() => setEditor(null)} headerExtra={editorTools}>
        <LimiterEditor params={params} update={update} engine={engine} active={active} latency={track ? engine.current?.latency() : 0} sampleRate={sampleRate} />
      </EditorDialog>
    </section>
  );
}
