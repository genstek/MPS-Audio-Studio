import React from 'react';

const UNAVAILABLE = ['Spectrum analyzer', 'Phase / correlation', 'Loudness (LUFS)', 'True peak'];

// Instrument dock shown by layouts A–D. It only reports state that exists: the listening choice and
// Master Level come from the shared app state; analysis instruments that the engine does not
// provide are labelled "Not available" and are not interactive (LAS-45 Stage 1).
export function LayoutDock({ layout, listening, masterDb, track, stemCount }) {
  const master = masterDb === -Infinity ? 'Muted' : `${masterDb > 0 ? '+' : ''}${Number(masterDb).toFixed(1)} dB`;
  const jump = id => () => {
    const target = document.getElementById(id);
    target?.scrollIntoView?.({ block: 'nearest' });
    target?.focus?.();
  };
  return (
    <aside className="layout-dock panel" aria-label="Studio instruments" data-layout-dock={layout}>
      {layout === 'd' && (
        <nav className="dock-nav" aria-label="Workspace sections">
          {[['Transport', 'transport-region'], ['Tracks', 'tracks-region'], ['Mixer', 'mixer-region'], ['Master', 'master-region']].map(([name, id]) => (
            <button key={id} type="button" onClick={jump(id)}>{name}</button>
          ))}
        </nav>
      )}
      <div className="dock-section">
        <h2 className="dock-title">{layout === 'a' ? 'Monitor' : 'Session'}</h2>
        <dl className="dock-facts">
          <dt>Source</dt><dd>{track ? track.name : stemCount ? `${stemCount} stem${stemCount > 1 ? 's' : ''}` : 'None loaded'}</dd>
          <dt>Listening</dt><dd>{listening === 'processed' ? 'Processed' : 'Original'}</dd>
          <dt>Monitor level</dt><dd>{master}</dd>
        </dl>
        <p className="fine-print">Monitor level is a listening preference, not the export gain.</p>
      </div>
      <div className="dock-section">
        <h2 className="dock-title">Analysis</h2>
        <ul className="dock-unavailable">
          {UNAVAILABLE.map(name => <li key={name}><span>{name}</span><span className="dock-na">Not available</span></li>)}
        </ul>
      </div>
    </aside>
  );
}
