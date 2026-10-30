import React, { useEffect, useState } from 'react';

const RANGE_DB = 24;

// Gain reduction measured by the running chain (LAS-28): the largest reduction in each ~33 ms
// report from the AudioWorklet. Shows 0 when nothing is playing.
// `active` (a track is loaded) re-subscribes once the engine has an output stage.
export function GainReductionMeter({ engine, which, label, active, compact = false }) {
  const [reduction, setReduction] = useState(0);
  useEffect(() => {
    const key = which === 'compressor' ? 'compressorGainReductionDb' : 'limiterGainReductionDb';
    let timer;
    const stop = engine.current?.onMeters(meters => {
      setReduction(meters[key]);
      clearTimeout(timer);
      timer = setTimeout(() => setReduction(0), 250); // reports stop when playback stops
    });
    return () => { stop?.(); clearTimeout(timer); };
  }, [engine, which, active]);
  const shown = Math.min(RANGE_DB, reduction);
  const meter = (
    <div className={compact ? 'gr-meter compact' : 'gr-meter'} role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={RANGE_DB}
      aria-valuenow={Number(shown.toFixed(1))} aria-valuetext={`${shown.toFixed(1)} dB gain reduction`}>
      <span className="gr-fill" style={{ height: `${(shown / RANGE_DB) * 100}%` }} />
    </div>
  );
  if (compact) return meter;
  return <div className="gr-wrap">{meter}<span className="gr-value" aria-hidden="true">GR {shown > 0 ? '−' : ''}{shown.toFixed(1)} dB</span></div>;
}
