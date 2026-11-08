import React, { useRef, useState } from 'react';
import { GRAPHIC_FREQUENCIES, GRAPHIC_GAIN_LIMIT, isGraphicBank, prepareGraphicBank, editGraphicGain, flattenGraphicBank } from './graphic-eq.js';
import { HelpTip } from './HelpTip.jsx';

const frequencyLabel = frequency => frequency >= 1000 ? `${frequency / 1000}k` : String(frequency);
const gainLabel = gain => `${gain > 0 ? '+' : ''}${gain.toFixed(1)}`;

const STEP = 0.5;
const THUMB = 12;
const snap = gain => Math.max(-GRAPHIC_GAIN_LIMIT, Math.min(GRAPHIC_GAIN_LIMIT, Math.round(gain / STEP) * STEP));

// Vertical gain slider built on a focusable role="slider" element rather than a native
// <input type="range"> with writing-mode, which WKWebView on macOS Ventura renders and hit-tests
// inconsistently (value jumps to an end stop while the thumb stays at 0 dB). Pointer position maps
// linearly to gain, and the thumb is positioned from the same value that is displayed.
function GraphicFader({ name, value, onChange }) {
  const ref = useRef(null);
  const fromPointer = event => {
    const box = ref.current.getBoundingClientRect();
    const span = box.height - THUMB;
    if (span <= 0) return value;
    const fraction = Math.max(0, Math.min(1, (event.clientY - box.top - THUMB / 2) / span));
    return snap(GRAPHIC_GAIN_LIMIT - fraction * 2 * GRAPHIC_GAIN_LIMIT);
  };
  const set = gain => { if (gain !== value) onChange(gain); };
  const onPointerDown = event => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.preventDefault();
    ref.current.focus();
    ref.current.setPointerCapture?.(event.pointerId);
    set(fromPointer(event));
  };
  const onPointerMove = event => { if (ref.current.hasPointerCapture?.(event.pointerId)) set(fromPointer(event)); };
  const onKeyDown = event => {
    const steps = { ArrowUp: STEP, ArrowRight: STEP, ArrowDown: -STEP, ArrowLeft: -STEP, PageUp: 3, PageDown: -3 };
    let next;
    if (event.key in steps) next = snap(value + steps[event.key]);
    else if (event.key === 'Home') next = -GRAPHIC_GAIN_LIMIT;
    else if (event.key === 'End') next = GRAPHIC_GAIN_LIMIT;
    else return;
    event.preventDefault();
    set(next);
  };
  return (
    <div ref={ref} className="graphic-fader" role="slider" tabIndex={0} aria-label={name} aria-orientation="vertical"
      aria-valuemin={-GRAPHIC_GAIN_LIMIT} aria-valuemax={GRAPHIC_GAIN_LIMIT} aria-valuenow={value} aria-valuetext={`${gainLabel(value)} dB`}
      style={{ '--fader-fraction': (GRAPHIC_GAIN_LIMIT - value) / (2 * GRAPHIC_GAIN_LIMIT) }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onKeyDown={onKeyDown} onDoubleClick={() => set(0)}>
      <span className="graphic-fader-track" aria-hidden="true" />
      <span className="graphic-fader-thumb" aria-hidden="true" />
    </div>
  );
}

export function GraphicEqEditor({ params, channel, update, sampleRate }) {
  const [resetPending, setResetPending] = useState(false);
  const bands = params.eq[channel];
  const extra = bands.slice(10).filter(band => band.enabled).length;
  const target = params.eq.mode === 'link' ? 'both channels' : `the ${channel} channel`;
  if (!isGraphicBank(bands)) return (
    <section className="graphic-setup" aria-label="Graphic EQ setup">
      <h3>Ten bands. One view.</h3>
      <p>31.5 Hz–16 kHz · ±12 dB. Set up a flat graphic bank for {target}.</p>
      <p>This replaces the frequency, gain, Q and enabled state of bands 1–10. Bands 11–24 stay unchanged. Undo restores the previous settings.</p>
      <button type="button" onClick={() => update(p => prepareGraphicBank(p, channel))}>Set up 10 graphic bands</button>
      <p className="fine-print">The band count is a design proposal. Switching views alone never changes your sound.</p>
    </section>
  );
  return (
    <section className="graphic-eq" aria-label={`Graphic EQ, ${target}`}>
      <div className="graphic-heading"><span>OCTAVE EQUALIZER</span><span>{params.eq.mode === 'link' ? 'L + R / LINK' : channel.toUpperCase()} · dB</span></div>
      <div className="graphic-bank">
        <div className="graphic-scale" aria-hidden="true"><span>+12</span><span>+6</span><span>0</span><span>−6</span><span>−12</span></div>
        <div className="graphic-faders">
          {GRAPHIC_FREQUENCIES.map((frequency, i) => (
            <div className="graphic-band" key={frequency}>
              <span className="graphic-band-label" aria-hidden="true">{frequencyLabel(frequency)}</span>
              <GraphicFader name={`${frequency} Hz gain`} value={bands[i].gain}
                onChange={gain => update(p => editGraphicGain(p, channel, i, gain), `graphic-${channel}-${i}`)} />
              <output>{gainLabel(bands[i].gain)}</output>
              <HelpTip id="eq.gain" />
            </div>
          ))}
        </div>
      </div>
      <div className="graphic-footer">
        <span className="fine-print">{extra ? `${extra} additional parametric band${extra === 1 ? '' : 's'} active; included in the curve.` : 'Bands 11–24 are off. All ten faders are ready to use.'}</span>
        {resetPending ? <div className="graphic-reset"><span>Flatten these ten bands?</span>
          <button type="button" onClick={() => { update(p => flattenGraphicBank(p, channel)); setResetPending(false); }}>Flatten bands</button>
          <button type="button" onClick={() => setResetPending(false)}>Cancel</button>
        </div> : <button type="button" className="heading-button" onClick={() => setResetPending(true)}>Reset graphic gains…</button>}
      </div>
      {sampleRate * 0.45 < 16000 && <p className="fine-print">Frequencies above {sampleRate * 0.45} Hz run at that limit for this audio. The curve shows the effective response.</p>}
    </section>
  );
}
