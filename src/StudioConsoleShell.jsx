import React from 'react';
import { BarMeters } from './Player.jsx';

// LAS-45 Phase 1: presentation-only chrome for the Console 2.0 view. Everything here reads real
// state (chain parameters, the output meter store) or calls existing handlers; it holds no audio
// or project state of its own. The processing strips, transport, master level, export and editor
// windows are the existing components, restyled by studio-console.css under `.studio-console`.

export function ViewSwitch({ view, onChange }) {
  return (
    <div className="view-switch" role="group" aria-label="Interface view">
      {[['classic', 'Classic'], ['console', 'Console 2.0']].map(([value, label]) => (
        <button key={value} type="button" aria-pressed={view === value} onClick={() => onChange(value)}>{label}</button>
      ))}
    </div>
  );
}

const SECTIONS = [
  ['tracks', 'Track', 'Tracks and playback'],
  ['mixer', 'Chain', 'Processing chain'],
  ['master', 'Output', 'Master and output'],
];

function goTo(id) {
  const target = document.getElementById(id);
  if (!target) return;
  target.scrollIntoView({ block: 'nearest' });
  target.focus({ preventScroll: true });
}

export function ConsoleNav({ onOpenStems, stemCount }) {
  return (
    <nav className="console-nav" aria-label="Workspace navigation">
      <p className="console-eyebrow">WORKSPACE</p>
      <ul>
        {SECTIONS.map(([id, label, name]) => (
          <li key={id}><button type="button" className="nav-item" aria-label={`Go to ${name}`} onClick={() => goTo(`console-${id}`)}>{label}</button></li>
        ))}
      </ul>
      <button type="button" className="nav-stems" onClick={onOpenStems}>Open Stems Mixer{stemCount > 0 ? ` (${stemCount})` : ''}</button>
      <p className="console-note">One imported track plus the master chain. Multi-channel stem strips are a later phase; the stems dialog is the real stem mixer.</p>
    </nav>
  );
}

const CHAIN = [['eq', 'EQ'], ['compressor', 'Dynamics'], ['limiter', 'Limiter'], ['space', 'Space']];

// Read-only signal-flow summary: honest ON/BYPASS taken from the chain parameters.
export function ChainFlow({ params }) {
  return (
    <ol className="chain-flow" aria-label="Signal flow">
      {CHAIN.map(([key, label]) => (
        <li key={key} className={params[key].enabled ? 'on' : 'bypassed'} data-module={key}>
          <span className="flow-led" aria-hidden="true" /><span className="flow-name">{label}</span>
          <span className="flow-state">{params[key].enabled ? 'ON' : 'BYPASS'}</span>
        </li>
      ))}
    </ol>
  );
}

// Output rack: the real monitor-bus meters (same store as the Tracks footer) and honest
// placeholders for measurements that need an analysis pass (Phase 3).
export function OutputRack({ meters, params, track }) {
  return (
    <div className="output-rack">
      <p className="console-eyebrow">OUTPUT · MONITOR BUS</p>
      <BarMeters store={meters} />
      <dl className="readouts">
        <div><dt>Loudness (LUFS)</dt><dd>—<span> Requires analysis</span></dd></div>
        <div><dt>True peak</dt><dd>—<span> Requires analysis</span></dd></div>
        <div><dt>Source</dt><dd>{track ? '1 track' : 'No audio'}</dd></div>
      </dl>
      <ChainFlow params={params} />
      <p className="console-note">Master level below is a listening volume only. It is not applied to the exported WAV.</p>
    </div>
  );
}
