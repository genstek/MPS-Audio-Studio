import React from 'react';
import { BOUNDS, SPACE_PRESETS } from './dsp/chain-params.js';
import { DynamicsThumbnail, LimiterThumbnail, SpaceThumbnail } from './ProcessorPreviews.jsx';
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
      <div className="transfer-graph" aria-label="Compressor transfer curve (configured)" role="img"><DynamicsThumbnail compressor={settings} large /></div>
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
      <div className="transfer-graph" aria-label="Limiter ceiling curve (configured)" role="img"><LimiterThumbnail limiter={settings} large /></div>
      {LIMITER_FIELDS.map(([name, label, unit, step, bounds]) => (
        <ParamField key={name} label={label} unit={unit} min={bounds[0]} max={bounds[1]} step={step} value={settings[name]}
          onChange={value => update(setField('limiter', name, value), `limiter-${name}`)} />
      ))}
      <p className="fine-print">True-peak limiter (4× oversampled detection, 1.5 ms look-ahead). Latency{latency ? ` ${latency} samples (${((latency / sampleRate) * 1000).toFixed(1)} ms)` : ''}; the original is delayed by the same amount so the comparison lines up.</p>
    </div>
  );
}

// Space (LAS-64): a stereo reverb between the compressor and the limiter.
const SPACE_FIELDS = [
  ['mix', 'Mix (wet)', '%', 1, false],
  ['preDelay', 'Pre-delay', 'ms', 1, false],
  ['decay', 'Decay (RT60)', 's', 0.01, true],
  ['damping', 'Damping', '%', 1, false],
];

// The preset whose values the settings match, or 'custom'.
export function spacePresetName(space) {
  return Object.entries(SPACE_PRESETS).find(([, values]) => Object.entries(values).every(([key, value]) => space[key] === value))?.[0] ?? 'custom';
}

export function SpaceEditor({ params, update }) {
  const settings = params.space;
  const preset = spacePresetName(settings);
  return (
    <div className="module-editor">
      <div className="module-row">
        <label className="toggle"><input type="checkbox" checked={settings.enabled} onChange={e => update(setField('space', 'enabled', e.target.checked))} />Space on</label>
        <label className="select-field">Preset
          <select value={preset} onChange={e => update(p => ({ ...p, space: { ...p.space, ...SPACE_PRESETS[e.target.value] } }))}>
            {Object.keys(SPACE_PRESETS).map(name => <option key={name} value={name}>{name}</option>)}
            <option value="custom" disabled>Custom</option>
          </select>
        </label>
      </div>
      <div className="space-graph"><SpaceThumbnail space={settings} large /></div>
      {SPACE_FIELDS.map(([name, label, unit, step, log]) => (
        <ParamField key={name} label={label} unit={unit} min={BOUNDS[name][0]} max={BOUNDS[name][1]} step={step} value={settings[name]} log={log}
          onChange={value => update(setField('space', name, Number((Math.round(value / step) * step).toFixed(step < 1 ? 2 : 0))), `space-${name}`)} />
      ))}
      <p className="fine-print">Stereo reverb (an 8-line feedback delay network) placed after the compressor and before the limiter, so the limiter's ceiling also holds the reverb. The left and right inputs are summed; the reverb comes back as decorrelated stereo (a mono track gets mono reverb). Decay is the time for low frequencies to fall by 60 dB; damping makes high frequencies fall faster. Changes glide over about 20 ms; switching Space off fades the reverb out over 20 ms. Pause and Stop let the tail ring out; removing or replacing the track clears it. Room, Hall and Plate are starting points of this one algorithm, not models of real rooms or plates. Export can include or cut the tail.</p>
    </div>
  );
}
