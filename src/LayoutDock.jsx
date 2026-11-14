import React, { useSyncExternalStore } from 'react';
import { NeedleMeter, OutputSpectrum, METER_FLOOR_DB } from './Player.jsx';
import { EqThumbnail } from './EqEditor.jsx';
import { measuredRows } from './measured-summary.js';
import { formatMasterDb } from './MasterLevel.jsx';
import { CompCurve, CurveFrame, Fader, Knob, MeterBar, PlannedSlots, Provenance, StripFrame } from './studio-kit.jsx';

// Studio Layout compositions (LAS-45). Every panel here reads state that already exists: the
// mastering chain parameters, the stem session summary, the one shared meter store (spectrum,
// peak, needles), the finished offline analysis report, the listening choice and Master Level.
// Nothing measures or estimates anything itself. Items with no backing feature are drawn as
// inert PLANNED panels, never as working controls. Reference: docs/design/approved-references.
const jump = id => () => {
  const target = document.getElementById(id);
  target?.scrollIntoView?.({ block: 'nearest' });
  target?.focus?.();
};
export const useMeterSnapshot = store => useSyncExternalStore(store.subscribe, store.get);
const dbText = db => (db === null || db === undefined || db <= METER_FLOOR_DB ? '−∞' : db.toFixed(1).replace('-', '−'));
const fmt = (v, d = 1) => `${v < 0 ? '−' : v > 0 ? '+' : ''}${Math.abs(v).toFixed(d)}`;

export function SessionFacts({ listening, masterDb, track, stemCount }) {
  const source = track ? track.name : stemCount ? `${stemCount} stem${stemCount > 1 ? 's' : ''}` : 'None loaded';
  return (
    <>
      <dl className="dock-facts">
        <dt>Source</dt><dd title={source}>{source}</dd>
        <dt>Listening</dt><dd>{listening === 'processed' ? 'Processed' : 'Original'}</dd>
        <dt>Monitor level</dt><dd>{formatMasterDb(masterDb)}</dd>
      </dl>
      <p className="fine-print">Monitor level is a listening preference, not the export gain.</p>
    </>
  );
}

export function MeasuredPanel({ analysis, file, heading = 'Measured · offline', compact = false }) {
  const { measured, source, rows } = measuredRows(analysis, file);
  return (
    <section className="dock-section" aria-label={heading} data-testid="measured-panel" data-measured={measured}>
      <h2 className="dock-title">{heading}</h2>
      {measured ? (
        <dl className="dock-facts">{rows.flatMap(([name, value]) => [<dt key={`${name}-t`}>{name}</dt>, <dd key={name}>{value}</dd>])}</dl>
      ) : <p className="dock-na">Not analyzed yet</p>}
      <p className="fine-print">{source}</p>
      {!compact && <p className="fine-print">Real-time LUFS and true peak: not available (offline measurement only).</p>}
    </section>
  );
}

// Real-time monitor panel: the one spectrum instance of a layout (shared meter store).
export function RealtimePanel({ engine, meters, heading = 'Real-time · monitor output', needles = false }) {
  return (
    <section className="dock-section dock-realtime" aria-label={heading} data-testid="realtime-panel">
      <h2 className="dock-title">{heading}</h2>
      <OutputSpectrum engine={engine} store={meters} />
      {needles && <div className="dock-needles"><NeedleMeter store={meters} side="left" /><NeedleMeter store={meters} side="right" /></div>}
      <p className="fine-print">Reads the monitor bus after the Original/Processed switch and Master Level.</p>
    </section>
  );
}

// Stereo panel: a vectorscope needs sample-level L/R data the engine does not expose (Stage 3).
// The offline correlation from Analyze is shown when it exists.
export function StereoPanel({ analysis, file, heading = 'Stereo image' }) {
  const { measured, rows } = measuredRows(analysis, file);
  const corr = measured ? rows.find(([name]) => name === 'L/R correlation')?.[1] : null;
  return (
    <section className="dock-section kit-planned-panel" aria-label={heading} data-testid="stereo-panel">
      <h2 className="dock-title">{heading}</h2>
      <div className="kit-scope-planned" aria-hidden="true"><span>Vectorscope</span><small>PLANNED · Stage 3</small></div>
      <dl className="dock-facts"><dt>Correlation</dt><dd>{corr ?? 'Not analyzed yet'}</dd></dl>
      <Provenance>{corr ? 'Offline analysis (whole file)' : 'Offline value after Analyze'} · real-time scope not available</Provenance>
    </section>
  );
}

// Loudness panel: offline rows from Analyze, real sample-peak hold of the monitor bus, and a plain
// statement that real-time LUFS / true peak do not exist yet.
export function LoudnessPanel({ analysis, file, meters, heading = 'Loudness' }) {
  const m = useMeterSnapshot(meters);
  const { measured, rows, source } = measuredRows(analysis, file);
  const peak = Math.max(m.left.hold ?? -Infinity, m.right.hold ?? -Infinity);
  return (
    <section className="dock-section" aria-label={heading} data-testid="loudness-panel" data-measured={measured}>
      <h2 className="dock-title">{heading}</h2>
      <div className="kit-loudness">
        <dl className="dock-facts">
          {measured ? rows.slice(0, 3).flatMap(([name, value]) => [<dt key={`${name}-t`}>{name.replace('Integrated loudness', 'Integrated').replace('Loudness range', 'LRA')}</dt>, <dd key={name}>{value}</dd>]) : <><dt>Integrated</dt><dd>Not analyzed yet</dd></>}
          <dt>Peak (live)</dt><dd>{Number.isFinite(peak) ? `${dbText(peak)} dBFS` : '−∞ dBFS'}</dd>
        </dl>
        <span className="kit-meter-pair"><MeterBar db={m.left.rms} label="Left level" /><MeterBar db={m.right.rms} label="Right level" /></span>
      </div>
      <Provenance>{measured ? source : 'Offline value after Analyze'} · live peak: real · real-time LUFS / TP: not available</Provenance>
    </section>
  );
}

// Master instruments inside the real Master panel (layouts A–D): the real L/R level, clip state
// and offline headline values; real-time LUFS is stated as unavailable.
export function MasterInstruments({ meters, analysis, file, vu = false }) {
  const m = useMeterSnapshot(meters);
  const { measured, rows } = measuredRows(analysis, file);
  const row = name => (measured ? rows.find(([n]) => n === name)?.[1] : null);
  const peak = Math.max(m.left.hold ?? -Infinity, m.right.hold ?? -Infinity);
  return (
    <div className="master-instruments" data-testid="master-instruments">
      {vu && <div className="dock-needles"><NeedleMeter store={meters} side="left" /><NeedleMeter store={meters} side="right" /></div>}
      <div className="master-readouts">
        <dl className="dock-facts">
          <dt>LUFS (I)</dt><dd>{row('Integrated loudness') ?? 'Not analyzed'}</dd>
          <dt>Peak (live)</dt><dd>{Number.isFinite(peak) ? `${dbText(peak)} dBFS` : '−∞ dBFS'}{m.clip ? ' · CLIP' : ''}</dd>
          <dt>True peak</dt><dd>{row('True peak') ?? 'Not analyzed'}</dd>
        </dl>
        <span className="kit-meter-pair" aria-label="Master level">
          <MeterBar db={m.left.rms} label="Master left level" /><MeterBar db={m.right.rms} label="Master right level" />
        </span>
      </div>
      <Provenance>LUFS/TP: offline Analyze only · levels: live monitor bus</Provenance>
    </div>
  );
}

// The dense channel bank. Only real sources become strips: each stem of the session, or the
// loaded track. Every other position is an inert PLANNED slot (no name, no fader, no meter).
// Gain, pan, mute and solo are shown read-only here and edited in the Stems mixer (Stage 2 binds them).
const BANK_SLOTS = { a: 15, b: 24, c: 16, d: 8 };
const TONES = ['#5b8fc7', '#c75b5b', '#c7a45b', '#5bc788', '#a45bc7', '#5bc7c7', '#c75b9b', '#8fc75b'];
function stemEq(stem) {
  const bands = stem.params?.eq?.left?.filter(b => b.enabled).slice(0, 4) ?? [];
  return bands;
}
export function StripBank({ layout, stems, track, onOpenStems }) {
  const slots = BANK_SLOTS[layout] ?? 8;
  const real = stems.length ? stems : track ? [{ name: track.name, source: 'track' }] : [];
  const open = onOpenStems;
  return (
    <section className={`part bank bank-${layout}`} aria-label="Channel bank" data-testid="stem-strips" data-real-strips={real.length}>
      <div className="bank-head">
        <h2 className="dock-title">Channels · {real.length} real{real.length ? '' : ' (none loaded)'}{slots > real.length ? ` · ${slots - real.length} planned (inert)` : ''}</h2>
        <button type="button" className="heading-button" onClick={open}>Open Stems mixer</button>
      </div>
      <div className="bank-scroll" tabIndex={0} role="group" aria-label="Channel strips (scrolls)">
        {real.map((stem, i) => (
          <StripFrame key={`${stem.name}-${i}`} name={stem.name} tone={TONES[i % TONES.length]} className={`kit-strip-${layout}`} data-real="true">
            <span className="kit-strip-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            {layout === 'b' && (
              <>
                <span className="kit-sec-label" aria-hidden="true">EQ</span>
                <div className="kit-strip-knobs" aria-label="Stem EQ (read-only)">
                  {stemEq(stem).length ? stemEq(stem).map((band, k) => <Knob key={k} label={`B${k + 1}`} value={band.gain} min={-18} max={18} size={22} format={v => fmt(v, 1)} />)
                    : <span className="kit-strip-flat">EQ flat</span>}
                </div>
                {stem.params && <span className="kit-sec-label" aria-hidden="true">DYN</span>}
                {stem.params && <div className="kit-strip-knobs" aria-label="Stem dynamics (read-only)">
                  <Knob label="THR" value={stem.params.compressor.threshold} min={-60} max={0} size={22} format={v => `${v}`} />
                  <Knob label="RAT" value={stem.params.compressor.ratio} min={1} max={20} size={22} format={v => `${v}`} />
                </div>}
              </>
            )}
            {stem.source !== 'track' ? (
              <>
                <Knob label="Pan" value={(stem.pan ?? 0) * 100} min={-100} max={100} size={layout === 'b' ? 22 : 28} format={v => (Math.round(v) === 0 ? 'C' : `${v < 0 ? 'L' : 'R'} ${Math.abs(Math.round(v))}`)} />
                <div className="kit-strip-flags" aria-label={`${stem.name} mute and solo (read-only)`}>
                  <span className={stem.solo ? 'on solo' : ''} aria-hidden="true">S</span><span className={stem.mute ? 'on mute' : ''} aria-hidden="true">M</span>
                  <span className="sr-only">{stem.mute ? 'muted' : 'not muted'}, {stem.solo ? 'solo' : 'not solo'}</span>
                </div>
                <Fader value={stem.gainDb ?? 0} label={`${stem.name} gain`} min={-60} max={10} />
                <output className="kit-strip-readout">{fmt(stem.gainDb ?? 0, 1)}</output>
              </>
            ) : (
              <p className="kit-strip-note">Single track. Its level is the Master monitor fader.</p>
            )}
          </StripFrame>
        ))}
        <PlannedSlots count={slots - real.length} layout={layout} />
      </div>
      <p className="kit-provenance bank-note" title="Strips are the real stems or the loaded track only. Faint outlines are planned positions with no signal and no controls.">Strips = real stems / loaded track only. Read-only here: edit gain, pan, mute and solo in the Stems mixer (live strips: Stage 2). Per-strip meters need Stage 2.</p>
    </section>
  );
}

function PlannedPanel({ title, note }) {
  return (
    <section className="dock-section kit-planned-panel" aria-label={`${title} (planned)`} data-planned-panel={title}>
      <h2 className="dock-title">{title}</h2>
      <div className="kit-scope-planned" aria-hidden="true"><small>PLANNED</small></div>
      <Provenance>{note}</Provenance>
    </section>
  );
}

// Real EQ response + (optionally) the one real-time spectrum behind it.
function EqView({ params, sampleRate, engine, meters, withSpectrum }) {
  return (
    <section className="dock-section kit-eqview" aria-label="EQ view" data-testid="eq-view">
      <h2 className="dock-title">EQ view · master chain {params.eq.enabled ? '' : '(bypassed)'}</h2>
      <CurveFrame title="EQ response" caption={withSpectrum ? 'configured curve over real-time output spectrum' : 'configured curve'} className="kit-eq-frame">
        {withSpectrum && <div className="kit-eq-spectrum"><OutputSpectrum engine={engine} store={meters} /></div>}
        <div className="kit-eq-overlay"><EqThumbnail params={params} sampleRate={sampleRate} /></div>
      </CurveFrame>
      <Provenance>Curve = enabled EQ bands at the playback rate (real). {withSpectrum ? 'Spectrum axis is separate from the ±24 dB curve axis.' : ''}</Provenance>
    </section>
  );
}

function DynamicsView({ params }) {
  return (
    <section className="dock-section" aria-label="Dynamics curve" data-testid="dynamics-view">
      <h2 className="dock-title">Dynamics{params.compressor.enabled ? '' : ' (off)'}</h2>
      <CurveFrame title="Compressor law" caption={`thr ${params.compressor.threshold} dB · ${params.compressor.ratio}:1`} className="kit-comp-frame"><CompCurve compressor={params.compressor} /></CurveFrame>
      <Provenance>Configured transfer curve of the real compressor (not a live reading).</Provenance>
    </section>
  );
}

export function WorkspaceNav({ items }) {
  const list = items ?? [['Transport', 'transport-region'], ['Tracks', 'tracks-region'], ['Mixer', 'mixer-region'], ['Master', 'master-region']];
  return (
    <nav className="dock-nav" aria-label="Workspace sections">
      {list.map(([name, id]) => <button key={name} type="button" onClick={jump(id)}>{name}</button>)}
    </nav>
  );
}

function PlannedList({ title, items }) {
  return (
    <section className="dock-section kit-planned-list" aria-label={`${title} (planned)`}>
      <h2 className="dock-title">{title}</h2>
      <ul aria-hidden="true">{items.map(item => <li key={item}>{item}</li>)}</ul>
      <p className="kit-planned-tag">PLANNED · not available</p>
    </section>
  );
}

// Layout-specific composition. All parts are siblings placed by the layout's grid areas.
export function LayoutDock({ layout, listening, masterDb, track, stemCount, stems, analysis, file, engine, meters, params, sampleRate }) {
  const openStems = () => document.querySelector('[data-stems-open]')?.click();
  const bank = <StripBank layout={layout} stems={stems} track={track} onOpenStems={openStems} />;
  const facts = <SessionFacts listening={listening} masterDb={masterDb} track={track} stemCount={stemCount} />;
  if (layout === 'a') {
    return (
      <>
        <aside className="part rail layout-dock" aria-label="Monitor and scenes" data-layout-dock="a">
          <PlannedList title="Scenes" items={['Mixing', 'Tracking', 'Overdub', 'Vocal', 'Mastering']} />
          <PlannedList title="Snapshots" items={['Base Mix', 'Balance', 'Vocal Up']} />
          <section className="dock-section" aria-label="Monitor"><h2 className="dock-title">Monitor</h2>{facts}</section>
          <WorkspaceNav />
        </aside>
        <div className="part stage stage-a" role="complementary" aria-label="Studio instruments">
          <EqView params={params} sampleRate={sampleRate} engine={engine} meters={meters} withSpectrum />
          <section className="dock-section" aria-label="Analyzer" data-testid="realtime-panel">
            <h2 className="dock-title">Real-time · monitor output</h2>
            <div className="dock-needles"><NeedleMeter store={meters} side="left" /><NeedleMeter store={meters} side="right" /></div>
            <Provenance>Level needles read the monitor bus. Stereo width and vectorscope: not available (Stage 3).</Provenance>
          </section>
          <MeasuredPanel analysis={analysis} file={file} heading="Measured · offline" compact />
        </div>
        {bank}
      </>
    );
  }
  if (layout === 'b') {
    return (
      <>
        {bank}
        <div className="part stage stage-b" role="complementary" aria-label="Studio instruments">
          <section className="dock-section kit-dock-tabs" aria-label="Analysis"><h2 className="dock-title">Analysis</h2>{facts}</section>
          <RealtimePanel engine={engine} meters={meters} heading="Real-time · monitor output" />
          <StereoPanel analysis={analysis} file={file} heading="Phase / correlation" />
          <LoudnessPanel analysis={analysis} file={file} meters={meters} />
          <MeasuredPanel analysis={analysis} file={file} heading="Measured · offline" compact />
        </div>
      </>
    );
  }
  if (layout === 'c') {
    return (
      <>
        <aside className="part rail layout-dock" aria-label="Workflow" data-layout-dock="c">
          <h2 className="dock-title">Workflow</h2>
          <WorkspaceNav items={[['Transport', 'transport-region'], ['Master', 'master-region'], ['Analysis', 'tracks-region'], ['Mixer', 'mixer-region']]} />
          <PlannedList title="Routing · Scenes · Setup" items={['Routing', 'Scenes', 'Setup']} />
          <section className="dock-section" aria-label="Session"><h2 className="dock-title">Session</h2>{facts}</section>
        </aside>
        <div className="part stage stage-c" role="complementary" aria-label="Studio instruments">
          <EqView params={params} sampleRate={sampleRate} engine={engine} meters={meters} withSpectrum={false} />
          <RealtimePanel engine={engine} meters={meters} heading="Spectrum · real-time" />
          <DynamicsView params={params} />
          <StereoPanel analysis={analysis} file={file} />
          <LoudnessPanel analysis={analysis} file={file} meters={meters} />
          <MeasuredPanel analysis={analysis} file={file} heading="Measured · offline" compact />
        </div>
        <PlannedPanel title="Routing matrix" note="No routing exists in the engine yet." />
        {bank}
      </>
    );
  }
  // d
  return (
    <>
      <aside className="part rail layout-dock" aria-label="Navigation and workspace" data-layout-dock="d">
        <WorkspaceNav items={[['Edit', 'tracks-region'], ['Mix', 'mixer-region'], ['Master', 'master-region'], ['Analysis', 'tracks-region']]} />
        <section className="dock-section" aria-label="Workspace"><h2 className="dock-title">Workspace</h2>
          <ul className="kit-ws-list"><li>Track <b>{track ? 1 : 0}</b></li><li>Stems <b>{stemCount}</b></li><li>Chain modules <b>4</b></li></ul>
          {facts}
        </section>
        <section className="dock-section" aria-label="Quick view"><h2 className="dock-title">Quick view · master</h2><QuickView meters={meters} /></section>
      </aside>
      {bank}
      <div className="part stage stage-d" role="complementary" aria-label="Studio instruments">
        <RealtimePanel engine={engine} meters={meters} heading="Spectrum (master) · real-time" />
        <StereoPanel analysis={analysis} file={file} heading="Correlation · stereo imaging" />
        <MeasuredPanel analysis={analysis} file={file} heading="Loudness · offline" compact />
      </div>
    </>
  );
}

function QuickView({ meters }) {
  const m = useMeterSnapshot(meters);
  return <span className="kit-meter-pair kit-quick"><MeterBar db={m.left.rms} label="Quick view left" /><MeterBar db={m.right.rms} label="Quick view right" /><small>Master L R · stems need Stage 2</small></span>;
}

export { CompCurve };
