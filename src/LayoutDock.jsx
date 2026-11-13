import React from 'react';
import { OutputSpectrum, PlayerDisplay } from './Player.jsx';
import { measuredRows } from './measured-summary.js';
import { formatMasterDb } from './MasterLevel.jsx';

// Reusable instrument panels for the studio layouts (LAS-45). Each one only shows state that
// exists: the real-time monitor meters/spectrum from the one shared meter store, the finished
// offline analysis report, the listening choice and Master Level. Nothing here measures or
// estimates anything itself, and nothing is interactive unless it drives the real app.
const jump = id => () => {
  const target = document.getElementById(id);
  target?.scrollIntoView?.({ block: 'nearest' });
  target?.focus?.();
};

export function SessionFacts({ listening, masterDb, track, stemCount }) {
  const source = track ? track.name : stemCount ? `${stemCount} stem${stemCount > 1 ? 's' : ''}` : 'None loaded';
  return (
    <>
      <dl className="dock-facts">
        <dt>Source</dt><dd title={source}>{source}</dd>
        <dt>Listening</dt><dd>{listening === 'processed' ? 'Processed' : 'Original'}</dd>
        <dt>Monitor level</dt><dd>{formatMasterDb(masterDb)}</dd>
      </dl>
      <p className="fine-print">Monitor level is a listening preference, not the export gain.</p>
    </>
  );
}

export function MeasuredPanel({ analysis, file, heading = 'Measured · offline' }) {
  const { measured, source, rows } = measuredRows(analysis, file);
  return (
    <section className="dock-section" aria-label={heading} data-testid="measured-panel" data-measured={measured}>
      <h2 className="dock-title">{heading}</h2>
      {measured ? (
        <dl className="dock-facts">{rows.flatMap(([name, value]) => [<dt key={`${name}-t`}>{name}</dt>, <dd key={name}>{value}</dd>])}</dl>
      ) : <p className="dock-na">Not analyzed yet</p>}
      <p className="fine-print">{source}</p>
      <p className="fine-print">Real-time LUFS and true peak: not available (offline measurement only).</p>
    </section>
  );
}

export function RealtimePanel({ engine, meters, full = false, heading = 'Real-time · monitor output' }) {
  return (
    <section className="dock-section dock-realtime" aria-label={heading} data-testid="realtime-panel">
      <h2 className="dock-title">{heading}</h2>
      {full ? <PlayerDisplay engine={engine} store={meters} /> : <OutputSpectrum engine={engine} store={meters} />}
      <p className="fine-print">Spectrum and the level bars in the Tracks footer read the monitor bus after the Original/Processed switch and Master Level.</p>
    </section>
  );
}

// Read-only depiction of the real stem session (gain/pan/mute/solo are edited in the Stems
// mixer; binding these strips to the same state is Stage 2).
export function StemStrips({ stems }) {
  const open = () => document.querySelector('[data-stems-open]')?.click();
  return (
    <section className="dock-section stem-strips" aria-label="Stem channels (read-only)" data-testid="stem-strips">
      <h2 className="dock-title">Stem channels</h2>
      {stems.length === 0 ? <p className="dock-na">No stems in this session</p> : (
        <ul className="stem-list">
          {stems.map((stem, index) => (
            <li key={`${stem.name}-${index}`} className="stem-strip">
              <span className="stem-name" title={stem.name}>{stem.name}</span>
              <span className="stem-gain">{Number(stem.gainDb ?? 0).toFixed(1).replace('-', '−')} dB</span>
              <span className="stem-flags">{stem.mute ? 'MUTE ' : ''}{stem.solo ? 'SOLO ' : ''}{`pan ${Math.round((stem.pan ?? 0) * 100)}`}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="heading-button" onClick={open}>Open Stems mixer</button>
      <p className="fine-print">Read-only view. Edit gain, pan, mute and solo in the Stems mixer (live strips: Stage 2).</p>
    </section>
  );
}

export function WorkspaceNav() {
  return (
    <nav className="dock-nav" aria-label="Workspace sections">
      {[['Transport', 'transport-region'], ['Tracks', 'tracks-region'], ['Mixer', 'mixer-region'], ['Master', 'master-region']].map(([name, id]) => (
        <button key={id} type="button" onClick={jump(id)}>{name}</button>
      ))}
    </nav>
  );
}

// Layout-specific composition of the panels above. Layout A and D keep their work areas on the
// left; B puts channel strips and instruments in a bottom dock; C leads with measurement.
export function LayoutDock({ layout, listening, masterDb, track, stemCount, stems, analysis, file, engine, meters }) {
  return (
    <aside className="layout-dock panel" aria-label="Studio instruments" data-layout-dock={layout}>
      {layout === 'd' && <WorkspaceNav />}
      {layout !== 'c' && (
        <section className="dock-section" aria-label={layout === 'a' ? 'Monitor' : 'Session'}>
          <h2 className="dock-title">{layout === 'a' ? 'Monitor' : 'Session'}</h2>
          <SessionFacts listening={listening} masterDb={masterDb} track={track} stemCount={stemCount} />
        </section>
      )}
      {layout === 'a' && <WorkspaceNav />}
      {(layout === 'b' || layout === 'd') && <StemStrips stems={stems} />}
      {layout === 'b' && <RealtimePanel engine={engine} meters={meters} />}
      {layout === 'c' && (
        <>
          <RealtimePanel engine={engine} meters={meters} full />
          <section className="dock-section" aria-label="Session">
            <h2 className="dock-title">Session</h2>
            <SessionFacts listening={listening} masterDb={masterDb} track={track} stemCount={stemCount} />
          </section>
        </>
      )}
      <MeasuredPanel analysis={analysis} file={file} heading={layout === 'c' ? 'Loudness & stereo · offline' : 'Measured · offline'} />
    </aside>
  );
}
