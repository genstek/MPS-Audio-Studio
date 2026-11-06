import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BANDS_PER_CHANNEL, BAND_TYPES, BOUNDS, editBand, resolveForSampleRate, setEqMode } from './dsp/chain-params.js';
import { designBand } from './dsp/eq-design.js';
import { biquadResponseDb } from './dsp/biquad.js';
import { ParamField } from './ParamField.jsx';
import { useEased } from './ProcessorPreviews.jsx';
import { HelpTip } from './HelpTip.jsx';
import { GraphicEqEditor } from './GraphicEqEditor.jsx';

// The 24-band EQ editor (LAS-28). The curve is the real transfer function of the enabled bands at
// the playback sample rate; the spectrum behind it is measured from what is being heard.
//
// Pointer mapping: x = frequency on a log scale from 20 Hz to min(20 kHz, 0.45 × rate); y = gain,
// ±24 dB across the plot (bands are limited to ±18 dB). Dragging a point moves its band;
// double-clicking empty space switches on the next free band there.
// Keyboard on a point: ←/→ frequency by 1/12 octave (Shift: ½ octave), ↑/↓ gain by 0.5 dB
// (Shift: 3 dB), Page Up/Page Down Q × or ÷ 1.25, Delete switches the band off.
const VIEW = { width: 600, height: 220, left: 34, right: 8, top: 8, bottom: 20 };
const PLOT_W = VIEW.width - VIEW.left - VIEW.right;
const PLOT_H = VIEW.height - VIEW.top - VIEW.bottom;
const AXIS_DB = 24;
const TYPE_LABELS = { bell: 'Bell', 'low-shelf': 'Low shelf', 'high-shelf': 'High shelf', 'high-pass': 'High-pass', 'low-pass': 'Low-pass' };
const hasGain = type => type === 'bell' || type === 'low-shelf' || type === 'high-shelf';
const roundFrequency = f => (f >= 100 ? Math.round(f) : Math.round(f * 10) / 10);
const clamp = (value, [min, max]) => Math.min(max, Math.max(min, value));
const frequencyLabel = f => (f >= 1000 ? `${Number((f / 1000).toFixed(2))} kHz` : `${Number(f.toFixed(1))} Hz`);
const gainLabel = g => `${g > 0 ? '+' : g < 0 ? '−' : ''}${Math.abs(g).toFixed(1)} dB`;

function scales(sampleRate) {
  const fMax = Math.min(BOUNDS.frequency[1], 0.45 * sampleRate);
  const span = Math.log(fMax / BOUNDS.frequency[0]);
  return {
    fMax,
    x: f => VIEW.left + (Math.log(f / BOUNDS.frequency[0]) / span) * PLOT_W,
    f: x => BOUNDS.frequency[0] * Math.exp(((x - VIEW.left) / PLOT_W) * span),
    y: g => VIEW.top + ((AXIS_DB - Math.max(-AXIS_DB, Math.min(AXIS_DB, g))) / (2 * AXIS_DB)) * PLOT_H,
    g: y => AXIS_DB - ((y - VIEW.top) / PLOT_H) * 2 * AXIS_DB,
  };
}

function responseOf(bands, sampleRate) {
  const designs = bands.filter(band => band.enabled).map(band => designBand(band, sampleRate));
  return f => designs.reduce((sum, coefficients) => sum + biquadResponseDb(coefficients, f, sampleRate), 0);
}

function curvePath(response, scale) {
  const points = [];
  for (let i = 0; i <= 160; i++) {
    const f = BOUNDS.frequency[0] * (scale.fMax / BOUNDS.frequency[0]) ** (i / 160);
    points.push(`${i ? 'L' : 'M'}${scale.x(f).toFixed(1)},${scale.y(response(f)).toFixed(1)}`);
  }
  return points.join('');
}

// Small curve for the mixer strip (LAS-63): the configured response, shown and updated whether or
// not audio plays; it moves to a new shape over a short transition (none with reduced motion) and
// turns grey, still visible, when the EQ is bypassed. The numbers are in the editor.
const THUMB_POINTS = 96;
export function EqThumbnail({ params, sampleRate }) {
  const target = useMemo(() => {
    const resolved = resolveForSampleRate(params, sampleRate).params;
    const response = responseOf(resolved.eq.left, sampleRate);
    const scale = scales(sampleRate);
    return Array.from({ length: THUMB_POINTS + 1 }, (_, i) => scale.y(response(BOUNDS.frequency[0] * (scale.fMax / BOUNDS.frequency[0]) ** (i / THUMB_POINTS))));
  }, [params, sampleRate]);
  const ys = useEased(target);
  const path = ys.map((y, i) => `${i ? 'L' : 'M'}${(VIEW.left + (i / THUMB_POINTS) * PLOT_W).toFixed(1)},${y.toFixed(1)}`).join('');
  return (
    <svg className={`eq-thumbnail${params.eq.enabled ? '' : ' is-bypassed'}`} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} aria-hidden="true" preserveAspectRatio="none">
      <line x1={VIEW.left} x2={VIEW.width - VIEW.right} y1={VIEW.top + PLOT_H / 2} y2={VIEW.top + PLOT_H / 2} />
      <path d={path} />
    </svg>
  );
}

function Spectrum({ engine, sampleRate, scale }) {
  const canvas = useRef(null);
  useEffect(() => {
    let frame;
    let last = 0;
    let data;
    const draw = time => {
      frame = requestAnimationFrame(draw);
      if (time - last < 33 || document.hidden) return; // about 30 frames a second
      last = time;
      const element = canvas.current;
      const analyser = engine.current?.analyser();
      if (!element || !analyser) return;
      const width = element.clientWidth * devicePixelRatio, height = element.clientHeight * devicePixelRatio;
      if (element.width !== Math.round(width)) element.width = Math.round(width);
      if (element.height !== Math.round(height)) element.height = Math.round(height);
      if (!data || data.length !== analyser.frequencyBinCount) data = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(data);
      const g = element.getContext('2d');
      g.clearRect(0, 0, element.width, element.height);
      const sx = element.width / VIEW.width, sy = element.height / VIEW.height;
      g.beginPath();
      g.moveTo(scale.x(BOUNDS.frequency[0]) * sx, (VIEW.top + PLOT_H) * sy);
      for (let k = 1; k < data.length; k++) {
        const f = (k * sampleRate) / (2 * data.length);
        if (f < BOUNDS.frequency[0] || f > scale.fMax) continue;
        const level = Math.max(analyser.minDecibels, Math.min(analyser.maxDecibels, data[k]));
        const y = VIEW.top + PLOT_H * (1 - (level - analyser.minDecibels) / (analyser.maxDecibels - analyser.minDecibels));
        g.lineTo(scale.x(f) * sx, y * sy);
      }
      g.lineTo(scale.x(scale.fMax) * sx, (VIEW.top + PLOT_H) * sy);
      g.closePath();
      g.fillStyle = 'rgba(111, 195, 178, 0.18)';
      g.fill();
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [engine, sampleRate, scale]);
  return <canvas ref={canvas} className="eq-spectrum" aria-hidden="true" />;
}

export function EqEditor({ params, update, sampleRate, engine, designPreview = false }) {
  const [view, setView] = useState('parametric');
  const graphic = designPreview && view === 'graphic';
  const linked = params.eq.mode === 'link';
  const [side, setSide] = useState('left');
  const channel = linked ? 'left' : side;
  const [selected, setSelected] = useState(0);
  const svg = useRef(null);
  const drag = useRef(null);
  const scale = useMemo(() => scales(sampleRate), [sampleRate]);
  const resolved = useMemo(() => resolveForSampleRate(params, sampleRate).params, [params, sampleRate]);
  const bands = resolved.eq[channel];
  const other = linked ? null : resolved.eq[channel === 'left' ? 'right' : 'left'];
  const response = useMemo(() => responseOf(bands, sampleRate), [bands, sampleRate]);
  const path = useMemo(() => curvePath(response, scale), [response, scale]);
  const otherPath = useMemo(() => (other ? curvePath(responseOf(other, sampleRate), scale) : null), [other, sampleRate, scale]);
  const band = params.eq[channel][selected];

  const edit = (index, changes, key) => update(p => editBand(p, channel, index, changes), key);
  function chooseChannel(next) {
    if (next === 'link') update(p => setEqMode(p, 'link'));
    else {
      setSide(next);
      if (linked) update(p => setEqMode(p, 'independent'));
    }
  }
  function toPlot(event) {
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(svg.current.getScreenCTM().inverse());
    return { frequency: roundFrequency(clamp(scale.f(point.x), [BOUNDS.frequency[0], scale.fMax])), gain: Math.round(clamp(scale.g(point.y), BOUNDS.gain) * 10) / 10 };
  }
  function pointerDown(event, index) {
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { index, key: `drag-${channel}-${index}-${event.timeStamp}` };
    setSelected(index);
  }
  function pointerMove(event) {
    if (!drag.current) return;
    const { frequency, gain } = toPlot(event);
    const current = params.eq[channel][drag.current.index];
    edit(drag.current.index, hasGain(current.type) ? { frequency, gain } : { frequency }, drag.current.key);
  }
  function addBand(event) {
    if (event.target !== svg.current && !event.target.classList.contains('eq-hit')) return;
    const free = params.eq[channel].findIndex(b => !b.enabled);
    if (free < 0) return;
    const { frequency, gain } = toPlot(event);
    edit(free, { enabled: true, type: 'bell', frequency, gain, q: 1 });
    setSelected(free);
  }
  function keyDown(event, index) {
    const current = params.eq[channel][index];
    const fine = !event.shiftKey;
    const key = `key-${channel}-${index}`;
    const changes = {
      ArrowRight: { frequency: roundFrequency(clamp(current.frequency * 2 ** (fine ? 1 / 12 : 1 / 2), [BOUNDS.frequency[0], scale.fMax])) },
      ArrowLeft: { frequency: roundFrequency(clamp(current.frequency / 2 ** (fine ? 1 / 12 : 1 / 2), BOUNDS.frequency)) },
      ArrowUp: hasGain(current.type) ? { gain: Math.round(clamp(current.gain + (fine ? 0.5 : 3), BOUNDS.gain) * 10) / 10 } : null,
      ArrowDown: hasGain(current.type) ? { gain: Math.round(clamp(current.gain - (fine ? 0.5 : 3), BOUNDS.gain) * 10) / 10 } : null,
      PageUp: { q: Math.round(clamp(current.q * 1.25, BOUNDS.q) * 100) / 100 },
      PageDown: { q: Math.round(clamp(current.q / 1.25, BOUNDS.q) * 100) / 100 },
      Delete: { enabled: false },
      Backspace: { enabled: false },
    }[event.key];
    if (!changes) return;
    event.preventDefault();
    edit(index, changes, key);
  }

  const gridFrequencies = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].filter(f => f <= scale.fMax);
  return (
    <div className="eq-editor">
      {designPreview && <div className="eq-view-switch" role="group" aria-label="EQ editor view">
        <button type="button" aria-pressed={graphic} onClick={() => setView('graphic')}>Graphic</button>
        <button type="button" aria-pressed={!graphic} onClick={() => setView('parametric')}>Parametric</button>
        <span className="fine-print">Same EQ · two editing views</span>
      </div>}
      <div className="eq-toolbar">
        <fieldset className="segmented">
          <legend>Edit <HelpTip id="eq.channels" className="inline" /></legend>
          {[['link', 'Link'], ['left', 'Left'], ['right', 'Right']].map(([value, label]) => (
            <label key={value}><input type="radio" name="eq-channel" value={value} checked={(linked ? 'link' : side) === value} onChange={() => chooseChannel(value)} />{label}</label>
          ))}
        </fieldset>
        <label className="toggle"><input type="checkbox" checked={params.eq.enabled} onChange={e => update(p => ({ ...p, eq: { ...p.eq, enabled: e.target.checked } }))} />EQ on</label><HelpTip id="eq.on" className="inline" />
<span className="fine-print" aria-hidden="true">Curve</span><HelpTip id="eq.curve" className="inline" />
      </div>
      <div className="eq-plot">
        <Spectrum engine={engine} sampleRate={sampleRate} scale={scale} />
        <svg ref={svg} viewBox={`0 0 ${VIEW.width} ${VIEW.height}`} role="group" aria-label={`EQ response, ${linked ? 'both channels (Link)' : `${channel} channel`}`}
          onPointerMove={graphic ? undefined : pointerMove} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onDoubleClick={graphic ? undefined : addBand}>
          <rect className="eq-hit" x={VIEW.left} y={VIEW.top} width={PLOT_W} height={PLOT_H} />
          {gridFrequencies.map(f => (
            <g key={f} className="eq-grid"><line x1={scale.x(f)} x2={scale.x(f)} y1={VIEW.top} y2={VIEW.top + PLOT_H} /><text x={scale.x(f)} y={VIEW.height - 6}>{f >= 1000 ? `${f / 1000}k` : f}</text></g>
          ))}
          {[18, 12, 6, 0, -6, -12, -18].map(g => (
            <g key={g} className={g === 0 ? 'eq-grid zero' : 'eq-grid'}><line x1={VIEW.left} x2={VIEW.width - VIEW.right} y1={scale.y(g)} y2={scale.y(g)} /><text x={VIEW.left - 4} y={scale.y(g) + 3} textAnchor="end">{g}</text></g>
          ))}
          {otherPath && <path className="eq-curve other" d={otherPath} />}
          <path className="eq-curve" d={path} />
          {!graphic && bands.map((b, index) => b.enabled && (
            <circle key={index} className={index === selected ? 'eq-point selected' : 'eq-point'} tabIndex={0} role="button"
              cx={scale.x(b.frequency)} cy={scale.y(hasGain(b.type) ? b.gain : response(b.frequency))} r={index === selected ? 8 : 6}
              aria-label={`Band ${index + 1}: ${TYPE_LABELS[b.type]}, ${frequencyLabel(b.frequency)}${hasGain(b.type) ? `, ${gainLabel(b.gain)}` : ''}, Q ${b.q}`}
              onPointerDown={event => pointerDown(event, index)} onFocus={() => setSelected(index)} onKeyDown={event => keyDown(event, index)} />
          ))}
        </svg>
      </div>
      {graphic ? <GraphicEqEditor params={params} channel={channel} update={update} sampleRate={sampleRate} /> : <>
      <p className="fine-print">Drag a point, or focus it and use the arrow keys (Shift for bigger steps, Page Up/Down for Q, Delete to switch off). Double-click to add a band. The shaded area is the live spectrum of what you hear.</p>
      <div className="band-picker" role="group" aria-label="Bands">
        {params.eq[channel].map((b, index) => (
          <button key={index} type="button" className={b.enabled ? 'on' : ''} aria-pressed={index === selected} onClick={() => setSelected(index)}
            aria-label={`Band ${index + 1}${b.enabled ? ' (on)' : ''}`}>{index + 1}</button>
        ))}
        <HelpTip id="eq.bands" />
      </div>
      <section className="band-fields" aria-label={`Band ${selected + 1} settings`}>
        <div className="band-fields-row">
          <label className="toggle"><input type="checkbox" checked={band.enabled} onChange={e => edit(selected, { enabled: e.target.checked })} />Band {selected + 1} on</label><HelpTip id="eq.band-on" className="inline" />
          <label className="select-field">Type
            <select value={band.type} onChange={e => edit(selected, { type: e.target.value })}>
              {BAND_TYPES.map(type => <option key={type} value={type}>{TYPE_LABELS[type]}</option>)}
            </select>
          </label><HelpTip id="eq.type" className="inline" />
        </div>
        <ParamField label="Frequency" unit="Hz" min={BOUNDS.frequency[0]} max={BOUNDS.frequency[1]} step={1} value={band.frequency} log help="eq.frequency"
          onChange={value => edit(selected, { frequency: roundFrequency(value) }, `field-f-${channel}-${selected}`)} />
        <ParamField label="Gain" unit="dB" min={BOUNDS.gain[0]} max={BOUNDS.gain[1]} step={0.1} value={band.gain} disabled={!hasGain(band.type)} help="eq.gain"
          onChange={value => edit(selected, { gain: Math.round(value * 10) / 10 }, `field-g-${channel}-${selected}`)} />
        <ParamField label="Q" unit="" min={BOUNDS.q[0]} max={BOUNDS.q[1]} step={0.01} value={band.q} log help="eq.q"
          onChange={value => edit(selected, { q: Math.round(value * 100) / 100 }, `field-q-${channel}-${selected}`)} />
        {band.frequency > scale.fMax && <p className="fine-print">Above {frequencyLabel(scale.fMax)} for this sample rate: it runs at {frequencyLabel(scale.fMax)}.</p>}
      </section>
      <p className="fine-print">{BANDS_PER_CHANNEL} bands per channel. In Link mode an edit applies to both channels.</p>
      </>}
    </div>
  );
}
