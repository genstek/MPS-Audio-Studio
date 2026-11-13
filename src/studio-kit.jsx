import React, { useMemo } from 'react';
import { BOUNDS } from './dsp/chain-params.js';

// Presentational primitives shared by the studio layouts (LAS-45). They hold no audio state: they
// draw values handed in from the one app state (chain params, stem summary, meter store) and call
// the handlers they are given. Anything without a backing feature is a PlannedSlot (inert).

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const fmtDb = db => (db === -Infinity || db === null ? '−∞' : `${db > 0 ? '+' : db < 0 ? '−' : ''}${Math.abs(db).toFixed(1)}`);

// Rotary control. Interactive (role=slider: arrows, Page keys, Home/End, vertical drag) when
// onChange is given; otherwise a read-only dial (role=img) that only shows a real value.
export function Knob({ label, value, min, max, step = 1, unit = '', digits = 0, onChange, disabled = false, size = 34, tone, format }) {
  const t = clamp((value - min) / (max - min), 0, 1);
  const angle = -135 + t * 270;
  const interactive = Boolean(onChange) && !disabled;
  const text = format ? format(value) : `${value.toFixed(digits).replace('-', '−')}${unit ? ` ${unit}` : ''}`;
  const set = next => onChange(Number(clamp(Math.round(next / step) * step, min, max).toFixed(4)));
  function key(event) {
    const delta = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: step * 10, PageDown: -step * 10 }[event.key];
    if (delta !== undefined) { event.preventDefault(); set(value + delta); }
    else if (event.key === 'Home') { event.preventDefault(); set(min); }
    else if (event.key === 'End') { event.preventDefault(); set(max); }
  }
  function down(event) {
    const startY = event.clientY, start = value;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const move = e => set(start + ((startY - e.clientY) / 150) * (max - min));
    const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  const rad = ((angle - 90) * Math.PI) / 180;
  const r = size / 2;
  const props = interactive
    ? { role: 'slider', tabIndex: 0, 'aria-label': label, 'aria-valuemin': min, 'aria-valuemax': max, 'aria-valuenow': value, 'aria-valuetext': text, onKeyDown: key, onPointerDown: down }
    : { role: 'img', 'aria-label': `${label} ${text}${onChange ? ' (unavailable)' : ' (read-only)'}` };
  return (
    <span className={`kit-knob${interactive ? ' is-live' : ''}`} style={{ '--knob-size': `${size}px`, '--knob-tone': tone }}>
      <span className="kit-knob-dial" {...props}>
        <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
          <circle cx={r} cy={r} r={r - 2} className="kit-knob-body" />
          <line x1={r} y1={r} x2={r + Math.cos(rad) * (r - 4)} y2={r + Math.sin(rad) * (r - 4)} className="kit-knob-pointer" />
        </svg>
      </span>
      <span className="kit-knob-label" aria-hidden="true">{label}</span>
      <span className="kit-knob-value" aria-hidden="true">{text}</span>
    </span>
  );
}

// Upright fader scale. Live when onChange is given (a real range input, turned upright); read-only
// otherwise (a depiction of a real value, not focusable and not draggable).
const FADER_TICKS = [10, 6, 0, -6, -12, -24, -48];
export function Fader({ value, min = -60, max = 10, onChange, label, disabled = false, readOnlyNote = 'read-only' }) {
  const pos = db => `${(1 - (clamp(db, min, max) - min) / (max - min)) * 100}%`;
  const interactive = Boolean(onChange) && !disabled;
  return (
    <span className="kit-fader" data-live={interactive}>
      <span className="kit-fader-scale" aria-hidden="true">{FADER_TICKS.map(t => <span key={t} style={{ top: pos(t) }}>{t > 0 ? `+${t}` : String(t).replace('-', '−')}</span>)}</span>
      <span className="kit-fader-rail" role={interactive ? undefined : 'img'} aria-label={interactive ? undefined : `${label} ${fmtDb(value)} dB (${readOnlyNote})`}>
        <span className="kit-fader-cap" style={{ top: pos(value) }} aria-hidden="true" />
      </span>
    </span>
  );
}

// Bar of one real level in dBFS (null = silent). Callers pass readings from the shared meter store.
export function MeterBar({ db, label, floor = -60 }) {
  const level = db === null || db === undefined ? 0 : clamp(((db - floor) / -floor) * 100, 0, 100);
  return (
    <span className="kit-meter" role="meter" aria-label={label} aria-valuemin={floor} aria-valuemax={0} aria-valuenow={Math.round(clamp(db ?? floor, floor, 0))}>
      <span className="kit-meter-fill" style={{ height: `${level}%` }} />
    </span>
  );
}

export function StripFrame({ name, tone, selected = false, children, className = '', ...rest }) {
  return (
    <section className={`kit-strip ${className}`} data-selected={selected} style={{ '--strip-tone': tone }} aria-label={name} {...rest}>
      <header className="kit-strip-head"><span className="kit-strip-name" title={name}>{name}</span></header>
      {children}
    </section>
  );
}

// An empty channel position: no name, no fader, no meter, not focusable. The group announces it once.
export function PlannedSlots({ count, label = 'Planned channel positions — not available yet' }) {
  if (count <= 0) return null;
  return (
    <div className="kit-planned-group" role="group" aria-label={label} data-testid="planned-slots">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="kit-planned" aria-hidden="true" data-planned="true"><span>PLANNED</span></div>
      ))}
    </div>
  );
}

// EQ response drawn from the real enabled bands is the existing EqThumbnail; this adds the dB/Hz
// frame around it. The spectrum under it is the single shared OutputSpectrum when the layout has one.
export function CurveFrame({ title, children, caption, xLabels, yLabels, className = '' }) {
  return (
    <figure className={`kit-curve ${className}`}>
      <div className="kit-curve-plot">
        {children}
        {yLabels && <span className="kit-curve-y" aria-hidden="true">{yLabels.map(y => <span key={y}>{y}</span>)}</span>}
      </div>
      {xLabels && <span className="kit-curve-x" aria-hidden="true">{xLabels.map(x => <span key={x}>{x}</span>)}</span>}
      <figcaption><strong>{title}</strong>{caption ? ` · ${caption}` : ''}</figcaption>
    </figure>
  );
}

// Static transfer curve of the real compressor settings (threshold, ratio, soft knee): output level
// against input level in dBFS. It is the configured law, not a live measurement.
export function CompCurve({ compressor }) {
  const { threshold, ratio, knee, enabled } = compressor;
  const path = useMemo(() => {
    const out = x => {
      const over = x - threshold;
      if (knee > 0 && Math.abs(over) <= knee / 2) return x + ((1 / ratio - 1) * (over + knee / 2) ** 2) / (2 * knee);
      return over > 0 ? threshold + over / ratio : x;
    };
    const px = x => ((x + 60) / 60) * 100, py = y => (1 - (clamp(y, -60, 0) + 60) / 60) * 100;
    return Array.from({ length: 61 }, (_, i) => `${i ? 'L' : 'M'}${px(-60 + i).toFixed(1)},${py(out(-60 + i)).toFixed(1)}`).join('');
  }, [threshold, ratio, knee]);
  return (
    <svg className={`kit-comp-curve${enabled ? '' : ' is-bypassed'}`} viewBox="0 0 100 100" preserveAspectRatio="none" role="img"
      aria-label={`Compressor curve: threshold ${threshold} dB, ratio ${ratio} to 1${enabled ? '' : ', bypassed'}`}>
      <line x1="0" y1="100" x2="100" y2="0" className="kit-comp-unity" />
      <path d={path} />
    </svg>
  );
}

// Small label that says where a panel's numbers come from (never styled as an operational control).
export function Provenance({ children }) { return <p className="kit-provenance">{children}</p>; }

export { BOUNDS };
