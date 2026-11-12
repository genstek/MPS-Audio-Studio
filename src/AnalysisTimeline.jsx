import React, { useState } from 'react';

// Timeline of the time-indexed analysis (LAS-173). Everything drawn is a measured series from the
// worker's result; nothing is estimated here. Selecting a marker or clicking a chart seeks the
// existing transport; "Play from here" auditions through the same transport.
const clock = seconds => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, '0')}`;
const W = 520, H = 70;
// A window with audio in one channel only has no finite balance; it is drawn at the chart's edge
// (the chart clamps values to its range) instead of leaving a gap.
const balanceOf = stereo => stereo.balanceDb ?? (stereo.oneSided === 'left' ? Infinity : stereo.oneSided === 'right' ? -Infinity : null);

function Chart({ title, unit, series, duration, min, max, ticks, markers, selected, onPick }) {
  const x = t => (duration > 0 ? (t / duration) * W : 0);
  const y = v => H - ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * H;
  // A gap (null) breaks the line rather than being drawn as a value.
  const runs = [];
  let run = [];
  for (const [t, v] of series) {
    if (v === null) { if (run.length) runs.push(run); run = []; } else run.push(`${x(t).toFixed(1)},${y(v).toFixed(1)}`);
  }
  if (run.length) runs.push(run);
  function click(event) {
    const box = event.currentTarget.getBoundingClientRect();
    onPick(Math.max(0, Math.min(duration, ((event.clientX - box.left) / box.width) * duration)));
  }
  return (
    <figure className="timeline-chart">
      <figcaption>{title} <span className="fine-print">({unit})</span></figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${title} over time, ${series.filter(([, v]) => v !== null).length} measured points`} onClick={click} preserveAspectRatio="none">
        {ticks.map(tick => <line key={tick} x1="0" x2={W} y1={y(tick)} y2={y(tick)} className="timeline-grid" />)}
        {markers.map(m => <rect key={m.id} x={x(m.start)} width={Math.max(2, x(m.end) - x(m.start))} y="0" height={H} className={`timeline-marker-span${m.id === selected ? ' selected' : ''}`} />)}
        {runs.map((points, i) => <polyline key={i} points={points.join(' ')} className="timeline-line" />)}
      </svg>
      <span className="timeline-scale fine-print">{ticks.map(tick => tick).join(' · ')} {unit} · 0:00–{clock(duration)}</span>
    </figure>
  );
}

export function AnalysisTimeline({ timeline, renderRate, onSeek, onAudition }) {
  const [selectedId, setSelected] = useState(null);
  const { input, markers } = timeline;
  const selected = markers.find(m => m.id === selectedId) ?? null;
  const centre = w => (w.start + w.end) / 2;
  const stereo = timeline.spectral.filter(w => w.stereo);
  const pick = marker => { setSelected(marker.id); onSeek(marker.start); };
  const rate = hz => `${hz.toLocaleString('en-US')} Hz`;
  return (
    <section className="analysis-timeline" aria-label="Analysis timeline">
      <h3>Timeline</h3>
      <p className="fine-print">
        Audio source rate {rate(input.sampleRate)}{renderRate ? ` · rendering (audio context) rate ${rate(renderRate)}${renderRate !== input.sampleRate ? ' — differs from the source; playback is resampled' : ''}` : ' · rendering rate not known yet'}.
        Hop {timeline.hopSeconds.toFixed(1)} s; {timeline.points.length} loudness points, {timeline.spectral.length} spectral windows.
      </p>
      {timeline.notes.map(note => <p key={note} className="analysis-note">{note}</p>)}
      {timeline.points.length > 0 && <Chart title="Short-term loudness (3 s)" unit="LUFS" series={timeline.points.map(p => [p.time, p.shortTermLufs])} duration={input.duration} min={-60} max={0} ticks={[-60, -40, -20, 0]} markers={markers} selected={selectedId} onPick={onSeek} />}
      {stereo.length > 0 && <Chart title="L/R correlation (2 s windows)" unit="−1…+1" series={stereo.map(w => [centre(w), w.stereo.correlation])} duration={input.duration} min={-1} max={1} ticks={[-1, 0, 1]} markers={markers} selected={selectedId} onPick={onSeek} />}
      {stereo.length > 0 && <Chart title="Channel balance, left − right (2 s windows)" unit="dB" series={stereo.map(w => [centre(w), balanceOf(w.stereo)])} duration={input.duration} min={-12} max={12} ticks={[-12, 0, 12]} markers={markers} selected={selectedId} onPick={onSeek} />}
      {timeline.spectral.length > 0 && <Chart title="Air band 4–8 kHz, shape relative to total (2 s windows)" unit="dB" series={timeline.spectral.map(w => [centre(w), w.bands?.air?.relativeDb ?? null])} duration={input.duration} min={-60} max={0} ticks={[-60, -30, 0]} markers={markers} selected={selectedId} onPick={onSeek} />}
      <h4>Markers ({markers.length})</h4>
      {markers.length === 0
        ? <p className="fine-print">No markers: no measured change crossed the observation thresholds. That does not prove the file is free of problems.</p>
        : <ul className="timeline-markers">{markers.map(m => (
          <li key={m.id}><button type="button" aria-pressed={m.id === selectedId} onClick={() => pick(m)}>
            <span className="marker-time">{clock(m.start)}–{clock(m.end)}</span> {m.title}
          </button></li>
        ))}</ul>}
      {selected && (
        <div className="timeline-detail" role="region" aria-label="Selected marker">
          <p><strong>Observation.</strong> {selected.observation}</p>
          <p><strong>Hypothesis.</strong> {selected.hypothesis}</p>
          <p className="fine-print">Window {clock(selected.start)}–{clock(selected.end)}. Observation only: nothing is changed or applied.</p>
          <button type="button" onClick={() => onAudition(selected.start)}>Play from here</button>
        </div>
      )}
      <details className="fine-print"><summary>Methodology and units</summary>
        <ul>{Object.entries(timeline.methodology).map(([key, text]) => <li key={key}><code>{key}</code>: {text}</li>)}</ul>
        <p>{timeline.version}. Bands: {timeline.methodology && '20 Hz–16 kHz, as labelled'}.</p>
      </details>
    </section>
  );
}
