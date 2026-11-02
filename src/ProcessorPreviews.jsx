import React, { useEffect, useRef, useState } from 'react';
import { BOUNDS } from './dsp/chain-params.js';
import { compressorOutputDb, limiterOutputDb } from './previews.js';

// Configured-state previews (LAS-63, LAS-64). Each graph is computed from the settings only, so it
// is shown and updated while stopped, paused or playing, and it never pretends to be measured audio.
// Measured signals (gain reduction, levels, spectrum) are drawn separately by the meters.
// When the settings change, the shape moves to the new one over TRANSITION_MS (parameter-driven
// motion); with prefers-reduced-motion it jumps at once. Nothing animates while nothing changes.
export const TRANSITION_MS = 180;
const W = 120, H = 80;

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Returns `target` (an array of numbers), easing from the previously shown values when it changes.
export function useEased(target) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  const key = target.join(',');
  useEffect(() => {
    const start = from.current;
    if (reducedMotion() || start.length !== target.length) {
      from.current = target;
      setShown(target); // jump without animation
      return undefined;
    }
    let frame;
    const begun = performance.now();
    const step = now => {
      const t = Math.min(1, (now - begun) / TRANSITION_MS);
      const k = 1 - (1 - t) ** 3;
      const value = target.map((v, i) => start[i] + (v - start[i]) * k);
      from.current = value;
      setShown(value);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps -- the key is the target's content
  return shown;
}

// Space: level over time on a 0…(pre-delay + decay) axis: silence until the pre-delay, then a fall of
// 60 dB over the decay time (straight on a dB scale); the dashed line is the faster high-frequency
// fall set by damping. The bar at the bottom is the dry/wet balance.
export function SpaceThumbnail({ space, large = false }) {
  const [preDelay, decay, damping, mix] = useEased([space.preDelay, space.decay, space.damping, space.mix]);
  const width = large ? 480 : W, height = large ? 160 : H;
  const span = BOUNDS.preDelay[1] / 1000 + BOUNDS.decay[1] * 0.4; // fixed time axis so changes are visible
  const x = seconds => 4 + Math.min(1, seconds / span) * (width - 8);
  const y = db => 6 + (Math.min(60, -db) / 60) * (height - 22);
  const start = x(preDelay / 1000);
  const end = x(preDelay / 1000 + decay);
  const hfEnd = x(preDelay / 1000 + decay * (1 - 0.7 * (damping / 100)));
  return (
    <svg className={`space-thumbnail${space.enabled ? '' : ' is-bypassed'}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" preserveAspectRatio="none">
      <line className="preview-axis" x1={4} x2={width - 4} y1={y(-60)} y2={y(-60)} />
      <path className="preview-fill" d={`M${start},${y(-60)} L${start},${y(0)} L${end},${y(-60)} Z`} />
      <path className="preview-line" d={`M4,${y(-60)} L${start},${y(-60)} L${start},${y(0)} L${end},${y(-60)}`} />
      <path className="preview-line dashed" d={`M${start},${y(0)} L${hfEnd},${y(-60)}`} />
      <rect className="preview-axis" x={4} y={height - 10} width={width - 8} height={5} rx={2} />
      <rect className="preview-mix" x={4} y={height - 10} width={((width - 8) * mix) / 100} height={5} rx={2} />
      {large && <>
        <text x={start + 4} y={14}>pre-delay {Math.round(preDelay)} ms</text>
        <text x={Math.min(end, width - 90)} y={y(-60) - 4}>−60 dB at {(preDelay / 1000 + decay).toFixed(2)} s</text>
        <text x={6} y={height - 13}>dry/wet {Math.round(mix)} %</text>
      </>}
    </svg>
  );
}

// A dB → dB graph: input on x, output on y, both from `low` to `high` dB, with the unity diagonal.
function TransferGraph({ className, enabled, large, low, high, curve, markers = [], labels = [] }) {
  const width = large ? 320 : W, height = large ? 220 : H;
  const pad = large ? 26 : 4;
  const x = db => pad + ((db - low) / (high - low)) * (width - pad - 4);
  const y = db => 4 + ((high - Math.min(high, Math.max(low, db))) / (high - low)) * (height - pad - 4);
  let path = '';
  for (let i = 0; i <= 96; i++) {
    const input = low + ((high - low) * i) / 96;
    path += `${i ? 'L' : 'M'}${x(input).toFixed(1)},${y(curve(input)).toFixed(1)}`;
  }
  const ticks = large ? [-48, -36, -24, -12, 0].filter(t => t >= low && t <= high) : [];
  return (
    <svg className={`${className}${enabled ? '' : ' is-bypassed'}`} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" preserveAspectRatio="none">
      <rect className="preview-plot" x={pad} y={4} width={width - pad - 4} height={height - pad - 4} />
      {ticks.map(t => <g key={t} className="preview-grid"><line x1={x(t)} x2={x(t)} y1={4} y2={height - pad} /><line x1={pad} x2={width - 4} y1={y(t)} y2={y(t)} /><text x={x(t)} y={height - pad + 12} textAnchor="middle">{t}</text><text x={pad - 4} y={y(t) + 3} textAnchor="end">{t}</text></g>)}
      <line className="preview-unity" x1={x(low)} y1={y(low)} x2={x(high)} y2={y(high)} />
      {markers.map(m => <line key={m.key} className="preview-marker" x1={m.x === undefined ? pad : x(m.x)} x2={m.x === undefined ? width - 4 : x(m.x)} y1={m.y === undefined ? 4 : y(m.y)} y2={m.y === undefined ? height - pad : y(m.y)} />)}
      <path className="preview-line" d={path} />
      {large && labels.map(l => <text key={l.text} className="preview-label" x={x(l.x) + 4} y={y(l.y) - 4}>{l.text}</text>)}
      {large && <text className="preview-axis-label" x={width - 6} y={height - 4} textAnchor="end">input dB →</text>}
    </svg>
  );
}

// Dynamics: the compressor's static curve (threshold, ratio, knee, makeup); the knee region is the
// band around the threshold. The live gain-reduction meter beside it shows the measured signal.
export function DynamicsThumbnail({ compressor, large = false }) {
  const [threshold, ratio, knee, makeup] = useEased([compressor.threshold, compressor.ratio, compressor.knee, compressor.makeup]);
  const settings = { threshold, ratio, knee, makeup };
  return (
    <TransferGraph className="dynamics-thumbnail" enabled={compressor.enabled} large={large} low={-60} high={0}
      curve={input => (compressor.enabled ? compressorOutputDb(input, settings) : input)}
      markers={[{ key: 'threshold', x: threshold }, ...(knee > 0 ? [{ key: 'knee-low', x: threshold - knee / 2 }, { key: 'knee-high', x: threshold + knee / 2 }] : [])]}
      labels={[{ text: `threshold ${threshold.toFixed(1)} dB · ${ratio.toFixed(1)}:1 · knee ${knee.toFixed(1)} dB${makeup ? ` · makeup ${makeup > 0 ? '+' : ''}${makeup.toFixed(1)} dB` : ''}`, x: -58, y: -6 }]} />
  );
}

// Limiter: a steady peak's level in → out with the input gain, flattened at the ceiling (dBTP).
export function LimiterThumbnail({ limiter, large = false }) {
  const [ceiling, inputGain] = useEased([limiter.ceiling, limiter.inputGain]);
  return (
    <TransferGraph className="limiter-thumbnail" enabled={limiter.enabled} large={large} low={-24} high={0}
      curve={input => (limiter.enabled ? limiterOutputDb(input, { ceiling, inputGain }) : input)}
      markers={[{ key: 'ceiling', y: ceiling }]}
      labels={[{ text: `ceiling ${ceiling.toFixed(1)} dBTP · input +${inputGain.toFixed(1)} dB`, x: -23, y: ceiling }]} />
  );
}
