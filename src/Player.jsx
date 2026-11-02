import React, { useEffect, useRef, useSyncExternalStore } from 'react';
import { HelpTip, WithHelp } from './HelpTip.jsx';

// Player (LAS-67): FF/RWD, a seekable timeline with a time ruler, Left/Right needle meters, electronic
// level/peak bars with a clip indicator and an output spectrum. Behaviour only; the tape-deck or
// hybrid look is chosen in LAS-44/65 and applied by LAS-45.
//
// Measurement tap: the monitor bus (LAS-68), i.e. what is sent to the speakers after the
// Original/Processed switch, loudness matching and Master Level. Mono tracks reach both sides.
// - Needles: RMS of the last 2048 samples, smoothed with a 65 ms time constant (99 % of a step in
//   about 300 ms, VU-like ballistics), on a dBFS scale. They are not calibrated VU meters.
// - Bars: sample peak (held 1.5 s, then falling 20 dB/s) and RMS, in dBFS.
// - Clip: lights when a sample at or beyond 0 dBFS reached the speakers; stays lit until reset.
// - Spectrum: the monitor bus analyser (4096-point FFT, 0.75 smoothing), dB per frequency.
// Readings are taken about 30 times a second only while audio plays or the meters are falling.
export const SKIP_SECONDS = 5;
export const HOLD_DELAY_MS = 400;
export const HOLD_REPEAT_MS = 200; // holding FF/RWD seeks 5 s every 200 ms: 25 s per second
const FRAME_MS = 33;
const NEEDLE_TAU = 0.065;
const PEAK_HOLD_S = 1.5;
const PEAK_FALL_DB_S = 20;
export const METER_FLOOR_DB = -60;

const toDb = value => (value > 1e-6 ? 20 * Math.log10(value) : null);
const clock = seconds => {
  const tenths = Math.round(Math.max(0, seconds) * 10);
  return `${Math.floor(tenths / 600)}:${String(((tenths % 600) / 10).toFixed(1)).padStart(4, '0')}`;
};
const dbText = db => (db === null || db <= METER_FLOOR_DB ? '−∞' : db.toFixed(1).replace('-', '−'));

// One reading loop shared by every meter on the page (an external store for React).
// attach(getEngine) gives it the audio engine, read only while the loop runs.
export function createMeterStore() {
  let getEngine = () => null;
  const listeners = new Set();
  const fresh = () => ({ rms: null, peak: null, hold: null, holdAge: 0 });
  let snapshot = { left: fresh(), right: fresh(), clip: false, running: false };
  let frame = null;
  let last = 0;
  let wanted = false;
  const smooth = { left: 0, right: 0 };

  function step(now) {
    frame = null;
    const dt = last ? Math.min(0.2, (now - last) / 1000) : FRAME_MS / 1000;
    last = now;
    const levels = getEngine()?.outputLevels();
    const next = { clip: snapshot.clip, running: true };
    let active = false;
    for (const side of ['left', 'right']) {
      const reading = levels?.[side] ?? { rms: 0, peak: 0, clipped: false };
      const k = 1 - Math.exp(-dt / NEEDLE_TAU);
      smooth[side] += (reading.rms - smooth[side]) * k;
      const peakDb = toDb(reading.peak);
      const before = snapshot[side];
      let hold = before.hold, holdAge = before.holdAge + dt;
      if (peakDb !== null && (hold === null || peakDb >= hold)) { hold = peakDb; holdAge = 0; } else if (hold !== null && holdAge > PEAK_HOLD_S) {
        hold -= PEAK_FALL_DB_S * dt;
        if (hold < METER_FLOOR_DB) hold = null;
      }
      next[side] = { rms: toDb(smooth[side]), peak: peakDb, hold, holdAge };
      if (reading.clipped) next.clip = true;
      if (smooth[side] > 1e-6 || reading.peak > 0 || hold !== null) active = true;
    }
    snapshot = next;
    listeners.forEach(listener => listener());
    if (wanted || active) schedule();
    else { snapshot = { ...snapshot, running: false }; last = 0; listeners.forEach(listener => listener()); }
  }
  function schedule() {
    if (frame !== null) return;
    frame = setTimeout(() => requestAnimationFrame(step), FRAME_MS);
  }
  return {
    attach(next) { getEngine = next; },
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    get: () => snapshot,
    // playing: keep reading; otherwise read until the meters have fallen to rest.
    setPlaying(playing) { wanted = playing; if (listeners.size) schedule(); },
    resetClip() { snapshot = { ...snapshot, clip: false }; listeners.forEach(listener => listener()); },
    stop() { if (frame !== null) clearTimeout(frame); frame = null; },
  };
}
const useMeters = store => useSyncExternalStore(store.subscribe, store.get);

// FF / RWD: a click (or Enter/Space) skips 5 s; holding the pointer repeats every 200 ms after
// 400 ms. Navigation only: audio never plays backwards.
export function SeekButton({ direction, onSkip, disabled }) {
  const timers = useRef({});
  const label = direction < 0 ? `Rewind ${SKIP_SECONDS} seconds` : `Fast forward ${SKIP_SECONDS} seconds`;
  const stop = () => { clearTimeout(timers.current.delay); clearInterval(timers.current.repeat); timers.current = {}; };
  useEffect(() => stop, []);
  function down(event) {
    if (event.button !== 0 || disabled) return;
    event.preventDefault();
    stop();
    onSkip(direction * SKIP_SECONDS);
    timers.current.delay = setTimeout(() => { timers.current.repeat = setInterval(() => onSkip(direction * SKIP_SECONDS), HOLD_REPEAT_MS); }, HOLD_DELAY_MS);
  }
  return (
    <button type="button" className="seek-button" aria-label={label} title={`${label} (hold to keep going)`} disabled={disabled}
      onPointerDown={down} onPointerUp={stop} onPointerLeave={stop} onPointerCancel={stop}
      onClick={event => { if (event.detail === 0) onSkip(direction * SKIP_SECONDS); }}>
      {direction < 0 ? '◀◀' : '▶▶'}
    </button>
  );
}

// Seekable timeline with a time ruler. Dragging shows the target and seeks on release; the keyboard
// seeks at once: ←/→ 1 s, Page Down/Up 10 s, Home start, End end.
export function Timeline({ position, duration, onSeek, disabled, scrub, setScrub }) {
  const shown = scrub ?? position;
  const ticks = duration > 0 ? [0, 0.25, 0.5, 0.75, 1].map(f => f * duration) : [];
  function keyDown(event) {
    const delta = { ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -10, PageUp: 10 }[event.key];
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); onSeek(event.key === 'Home' ? 0 : duration); return; }
    if (delta === undefined) return;
    event.preventDefault();
    onSeek(Math.max(0, Math.min(duration, position + delta)));
  }
  return (
    <div className="timeline">
      <input type="range" aria-label="Timeline" min={0} max={duration || 1} step={0.01} value={Math.min(shown, duration || 0)} disabled={disabled}
        aria-valuetext={`${clock(shown)} of ${clock(duration)}`}
        onPointerDown={() => setScrub(position)} onPointerUp={event => { setScrub(null); onSeek(Number(event.currentTarget.value)); }}
        onChange={event => (scrub !== null ? setScrub(Number(event.target.value)) : onSeek(Number(event.target.value)))} onKeyDown={keyDown} />
      <div className="timeline-ruler" aria-hidden="true">{ticks.map((t, i) => <span key={i} style={{ left: `${(t / duration) * 100}%` }}>{clock(t)}</span>)}</div>
    </div>
  );
}

// Electronic L/R bars: RMS (filled) and sample peak hold (line), clip indicator.
export function BarMeters({ store }) {
  const m = useMeters(store);
  const pct = db => `${db === null ? 0 : Math.max(0, Math.min(100, ((db - METER_FLOOR_DB) / -METER_FLOOR_DB) * 100))}%`;
  return (
    <div className="bar-meters">
      {['left', 'right'].map(side => (
        <div key={side} className="bar-meter" role="meter" aria-label={`${side === 'left' ? 'Left' : 'Right'} output level`} aria-valuemin={METER_FLOOR_DB} aria-valuemax={0}
          aria-valuenow={Math.round(Math.max(METER_FLOOR_DB, m[side].peak ?? METER_FLOOR_DB))} aria-valuetext={`peak ${dbText(m[side].peak)} dBFS, RMS ${dbText(m[side].rms)} dBFS`}>
          <span className="bar-side" aria-hidden="true">{side === 'left' ? 'L' : 'R'}</span>
          <span className="bar-track"><span className="bar-rms" style={{ width: pct(m[side].rms) }} /><span className="bar-hold" style={{ left: pct(m[side].hold) }} /></span>
          <span className="bar-value" aria-hidden="true">{dbText(m[side].hold)}</span>
        </div>
      ))}
      <WithHelp id="transport.clip" className="clip-wrap"><button type="button" className={`clip-led${m.clip ? ' on' : ''}`} aria-pressed={m.clip} aria-label={m.clip ? 'Clipping detected at the output; reset' : 'No clipping at the output'} onClick={() => store.resetClip()}>CLIP</button></WithHelp>
      <HelpTip id="transport.meters" className="inline meters-help" />
    </div>
  );
}

// One analog-style needle meter (dBFS scale from −40 to 0; red above −6).
const NEEDLE_MIN = -40;
export function NeedleMeter({ store, side }) {
  const m = useMeters(store);
  const db = m[side].rms;
  const angle = d => -50 + ((Math.max(NEEDLE_MIN, Math.min(0, d ?? NEEDLE_MIN)) - NEEDLE_MIN) / -NEEDLE_MIN) * 100;
  const point = (d, r) => { const a = (angle(d) * Math.PI) / 180; return [60 + r * Math.sin(a), 70 - r * Math.cos(a)]; };
  const name = side === 'left' ? 'Left' : 'Right';
  const [nx, ny] = point(db, 58);
  return (
    <figure className="needle-meter" role="meter" aria-label={`${name} needle meter (VU-style RMS)`} aria-valuemin={NEEDLE_MIN} aria-valuemax={0}
      aria-valuenow={Math.round(Math.max(NEEDLE_MIN, db ?? NEEDLE_MIN))} aria-valuetext={`${dbText(db)} dBFS RMS`}>
      <svg viewBox="0 0 120 78" aria-hidden="true">
        {[-40, -30, -20, -10, -6, -3, 0].map(d => {
          const [x1, y1] = point(d, 48), [x2, y2] = point(d, 54), [tx, ty] = point(d, 63);
          return <g key={d} className={d > -6 ? 'needle-tick hot' : 'needle-tick'}><line x1={x1} y1={y1} x2={x2} y2={y2} /><text x={tx} y={ty + 3}>{d}</text></g>;
        })}
        <line className="needle" x1={60} y1={70} x2={nx} y2={ny} />
        <circle className="needle-pivot" cx={60} cy={70} r={3} />
      </svg>
      <figcaption>{side === 'left' ? 'L' : 'R'} · dBFS RMS</figcaption>
    </figure>
  );
}

// The output spectrum with frequency (Hz) and level (dB) scales.
const SPEC_MIN_HZ = 20, SPEC_MAX_HZ = 20000, SPEC_MIN_DB = -100, SPEC_MAX_DB = 0;
export function OutputSpectrum({ engine, store }) {
  const canvas = useRef(null);
  const m = useMeters(store);
  useEffect(() => {
    if (!m.running) return undefined;
    let frame, last = 0, data;
    const draw = time => {
      frame = requestAnimationFrame(draw);
      if (time - last < FRAME_MS || document.hidden) return;
      last = time;
      const element = canvas.current;
      const analyser = engine.current?.outputAnalyser();
      if (!element) return;
      const width = Math.round(element.clientWidth * devicePixelRatio), height = Math.round(element.clientHeight * devicePixelRatio);
      if (element.width !== width) element.width = width;
      if (element.height !== height) element.height = height;
      const g = element.getContext('2d');
      g.clearRect(0, 0, width, height);
      if (!analyser) return;
      if (!data || data.length !== analyser.frequencyBinCount) data = new Float32Array(analyser.frequencyBinCount);
      analyser.getFloatFrequencyData(data);
      const rate = analyser.context.sampleRate;
      const x = f => (Math.log(f / SPEC_MIN_HZ) / Math.log(SPEC_MAX_HZ / SPEC_MIN_HZ)) * width;
      const y = db => height * (1 - (Math.max(SPEC_MIN_DB, Math.min(SPEC_MAX_DB, db)) - SPEC_MIN_DB) / (SPEC_MAX_DB - SPEC_MIN_DB));
      g.beginPath();
      g.moveTo(0, height);
      for (let k = 1; k < data.length; k++) {
        const f = (k * rate) / (2 * data.length);
        if (f < SPEC_MIN_HZ || f > SPEC_MAX_HZ) continue;
        g.lineTo(x(f), y(data[k]));
      }
      g.lineTo(width, height);
      g.closePath();
      g.fillStyle = 'rgba(111, 195, 178, 0.25)';
      g.strokeStyle = 'rgba(111, 195, 178, 0.9)';
      g.fill();
      g.stroke();
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [engine, m.running]);
  const xPct = f => `${(Math.log(f / SPEC_MIN_HZ) / Math.log(SPEC_MAX_HZ / SPEC_MIN_HZ)) * 100}%`;
  return (
    <figure className="output-spectrum" aria-label="Output spectrum (what you hear)" role="img">
      <div className="spectrum-plot">
        <canvas ref={canvas} aria-hidden="true" />
        <div className="spectrum-db" aria-hidden="true">{[0, -30, -60, -90].map(d => <span key={d} style={{ top: `${(d / SPEC_MIN_DB) * 100}%` }}>{d}</span>)}</div>
      </div>
      <div className="spectrum-hz" aria-hidden="true">{[50, 100, 500, 1000, 5000, 10000].map(f => <span key={f} style={{ left: xPct(f) }}>{f >= 1000 ? `${f / 1000}k` : f}</span>)}</div>
      <figcaption>Spectrum · dB / Hz{m.running ? '' : ' · no signal'}</figcaption>
    </figure>
  );
}

export function PlayerDisplay({ engine, store }) {
  return (
    <div className="player-display" role="group" aria-label="Output meters">
      <WithHelp id="transport.needles" className="display-help"><NeedleMeter store={store} side="left" /></WithHelp>
      <WithHelp id="transport.spectrum" className="display-help"><OutputSpectrum engine={engine} store={store} /></WithHelp>
      <NeedleMeter store={store} side="right" />
    </div>
  );
}
