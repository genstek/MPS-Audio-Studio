import React from 'react';
import { BOUNDS } from './dsp/chain-params.js';
import { ParamField } from './ParamField.jsx';
import { GainReductionMeter } from './GainReductionMeter.jsx';

// Compressor and limiter editors (LAS-28). Every control writes the chain settings the engine
// plays and exports; nothing here is decorative.
const COMPRESSOR_FIELDS = [
  ['threshold', 'Threshold', 'dB', 0.5],
  ['ratio', 'Ratio', ': 1', 0.1],
  ['attack', 'Attack', 'ms', 0.1],
  ['release', 'Release', 'ms', 1],
  ['knee', 'Knee', 'dB', 0.5],
  ['makeup', 'Makeup gain', 'dB', 0.5],
];
const LIMITER_FIELDS = [
  ['ceiling', 'Ceiling', 'dBTP', 0.1, BOUNDS.ceiling],
  ['inputGain', 'Input gain', 'dB', 0.5, BOUNDS.inputGain],
  ['release', 'Release', 'ms', 1, BOUNDS.limiterRelease],
];

function setField(module, name, value) {
  return params => ({ ...params, [module]: { ...params[module], [name]: value } });
}

export function CompressorEditor({ params, update, engine, active }) {
  const settings = params.compressor;
  return (
    <div className="module-editor">
      <div className="module-row">
        <label className="toggle"><input type="checkbox" checked={settings.enabled} onChange={e => update(setField('compressor', 'enabled', e.target.checked))} />Compressor on</label>
        <label className="select-field">Detector
          <select value={settings.detector} onChange={e => update(setField('compressor', 'detector', e.target.value))}>
            <option value="peak">Peak</option>
            <option value="rms">RMS (10 ms)</option>
          </select>
        </label>
        <GainReductionMeter engine={engine} which="compressor" label="Compressor gain reduction" active={active} />
      </div>
      {COMPRESSOR_FIELDS.map(([name, label, unit, step]) => (
        <ParamField key={name} label={label} unit={unit} min={BOUNDS[name][0]} max={BOUNDS[name][1]} step={step} value={settings[name]}
          onChange={value => update(setField('compressor', name, value), `compressor-${name}`)} />
      ))}
      <p className="fine-print">Feed-forward, stereo-linked (follows the louder channel). Attack and release are the times to reach 63 % of a level change.</p>
    </div>
  );
}

export function LimiterEditor({ params, update, engine, active, latency, sampleRate }) {
  const settings = params.limiter;
  return (
    <div className="module-editor">
      <div className="module-row">
        <label className="toggle"><input type="checkbox" checked={settings.enabled} onChange={e => update(setField('limiter', 'enabled', e.target.checked))} />Limiter on</label>
        <GainReductionMeter engine={engine} which="limiter" label="Limiter gain reduction" active={active} />
      </div>
      {LIMITER_FIELDS.map(([name, label, unit, step, bounds]) => (
        <ParamField key={name} label={label} unit={unit} min={bounds[0]} max={bounds[1]} step={step} value={settings[name]}
          onChange={value => update(setField('limiter', name, value), `limiter-${name}`)} />
      ))}
      <p className="fine-print">True-peak limiter (4× oversampled detection, 1.5 ms look-ahead). Latency{latency ? ` ${latency} samples (${((latency / sampleRate) * 1000).toFixed(1)} ms)` : ''}; the original is delayed by the same amount so the comparison lines up.</p>
    </div>
  );
}
