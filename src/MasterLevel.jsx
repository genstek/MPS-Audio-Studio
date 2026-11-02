import React, { useId } from 'react';
import { MASTER_MAX_DB, MASTER_MIN_DB } from './monitor-bus.js';

// Master Level fader (LAS-68): a monitor volume from mute (−∞ dB) to 0 dB (unity) in 0.5 dB steps,
// after the Original/Processed switch, for the single track and the stems. It changes what you
// hear and the output meters, never the exported WAV.
// Keyboard: ←/↓ and →/↑ 0.5 dB, Page Down/Up 6 dB, Home mute, End 0 dB; double-click or "0 dB"
// resets to unity. The step below −60 dB is mute.
const STEP = 0.5;
const MUTE_POSITION = MASTER_MIN_DB - STEP;
const TICKS = [0, -12, -24, -36, -48];

export const formatMasterDb = db => (db === -Infinity ? '−∞ dB' : `${db === 0 ? '0.0' : db.toFixed(1).replace('-', '−')} dB`);
const position = db => (db === -Infinity ? MUTE_POSITION : db);
const percent = value => `${((value - MUTE_POSITION) / (MASTER_MAX_DB - MUTE_POSITION)) * 100}%`;

export function MasterLevel({ value, onChange, disabled, reason, compact = false }) {
  const id = useId();
  const fromPosition = next => (next <= MUTE_POSITION ? -Infinity : Math.min(MASTER_MAX_DB, Math.round(next / STEP) * STEP));
  function keyDown(event) {
    const steps = { PageUp: 12, PageDown: -12 }[event.key];
    if (!steps) return;
    event.preventDefault();
    const current = position(value);
    onChange(fromPosition(Math.max(MUTE_POSITION, Math.min(MASTER_MAX_DB, current + steps * STEP))));
  }
  const text = value === -Infinity ? 'Muted (−∞ dB)' : formatMasterDb(value);
  return (
    <div className={compact ? 'master-fader compact' : 'master-fader'}>
      <div className="master-fader-row">
        <label htmlFor={id}>Master level</label>
        <span className="master-value" aria-hidden="true">{disabled ? '—' : formatMasterDb(value)}</span>
        <button type="button" className="master-reset" onClick={() => onChange(0)} disabled={disabled || value === 0} aria-label="Reset master level to 0 dB">0 dB</button>
      </div>
      <input id={id} type="range" aria-label="Master level" min={MUTE_POSITION} max={MASTER_MAX_DB} step={STEP} value={position(value)} disabled={disabled}
        aria-valuetext={text} onChange={event => onChange(fromPosition(Number(event.target.value)))} onKeyDown={keyDown} onDoubleClick={() => onChange(0)} />
      {!compact && (
        <div className="master-scale" aria-hidden="true">
          {TICKS.map(tick => <span key={tick} style={{ left: percent(tick), transform: tick === 0 ? 'translateX(-100%)' : 'translateX(-50%)' }}>{tick === 0 ? '0 dB' : String(tick).replace('-', '−')}</span>)}
          <span style={{ left: 0 }}>−∞</span>
        </div>
      )}
      <p className="fine-print master-note">{disabled ? reason : 'Monitor volume · not in exported WAV'}</p>
    </div>
  );
}
