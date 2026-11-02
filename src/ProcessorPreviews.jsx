import React, { useEffect, useRef, useState } from 'react';
import { BOUNDS } from './dsp/chain-params.js';

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
