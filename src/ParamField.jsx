import React, { useId, useState } from 'react';

const decimals = step => (String(step).split('.')[1] ?? '').length;

// A labelled control with a slider and a number box sharing one value (LAS-28). Typed values are
// applied on Enter or leaving the box; values outside the range are brought to the nearest limit.
// `log` makes the slider logarithmic (frequency, Q); the number box always shows the real value.
const LOG_STEPS = 1000;

export function ParamField({ label, unit, min, max, step, value, onChange, disabled = false, log = false }) {
  const id = useId();
  const [draft, setDraft] = useState(null);
  const shown = value.toFixed(decimals(step));
  function commit() {
    if (draft === null) return;
    const number = Number(draft);
    setDraft(null);
    if (draft.trim() === '' || !Number.isFinite(number)) return;
    onChange(Math.min(max, Math.max(min, number)));
  }
  return (
    <div className="param-field">
      <label htmlFor={id}>{label}</label>
      {log ? (
        <input id={id} type="range" min={0} max={LOG_STEPS} step={1} disabled={disabled} aria-valuetext={`${shown} ${unit}`.trim()}
          value={Math.round((Math.log(value / min) / Math.log(max / min)) * LOG_STEPS)}
          onChange={event => onChange(min * (max / min) ** (Number(event.target.value) / LOG_STEPS))} />
      ) : (
        <input id={id} type="range" min={min} max={max} step={step} value={value} disabled={disabled}
          onChange={event => onChange(Number(event.target.value))} />
      )}
      <span className="param-number">
        <input type="number" aria-label={`${label} (${unit})`} min={min} max={max} step={step} disabled={disabled}
          value={draft ?? shown} onChange={event => setDraft(event.target.value)} onBlur={commit}
          onKeyDown={event => { if (event.key === 'Enter') commit(); if (event.key === 'Escape') setDraft(null); }} />
        <span className="param-unit">{unit}</span>
      </span>
    </div>
  );
}
