import React, { useId, useState } from 'react';
import { GRAPHIC_FREQUENCIES, isGraphicBank, prepareGraphicBank, editGraphicGain, flattenGraphicBank } from './graphic-eq.js';
import { HelpTip } from './HelpTip.jsx';

const frequencyLabel = frequency => frequency >= 1000 ? `${frequency / 1000}k` : String(frequency);
const gainLabel = gain => `${gain > 0 ? '+' : ''}${gain.toFixed(1)}`;

export function GraphicEqEditor({ params, channel, update, sampleRate }) {
  const id = useId();
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
              <label htmlFor={`${id}-${i}`}>{frequencyLabel(frequency)}<span className="sr-only"> Hz gain</span></label>
              <input id={`${id}-${i}`} type="range" min={-12} max={12} step={0.5} value={bands[i].gain}
                aria-label={`${frequency} Hz gain`} aria-orientation="vertical" aria-valuetext={`${gainLabel(bands[i].gain)} dB`}
                onChange={event => update(p => editGraphicGain(p, channel, i, Number(event.target.value)), `graphic-${channel}-${i}`)} />
              <output htmlFor={`${id}-${i}`}>{gainLabel(bands[i].gain)}</output>
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
