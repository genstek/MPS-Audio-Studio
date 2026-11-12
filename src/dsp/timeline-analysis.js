import { fft } from './fft.js';
import { kWeighting } from './loudness.js';

// Time-indexed analysis (LAS-173). Pure and deterministic: the same samples and options give the
// same result. It only reads the samples. Results are observations about the PCM, never fixes.
export const TIMELINE_VERSION = 'mps-timeline-1';
export const BASE_SECONDS = 0.1; // energy grid: every window is a whole number of 100 ms blocks
export const WINDOWS = Object.freeze({ momentary: 0.4, shortTerm: 3, spectral: 2, trend: 5 });
export const BANDS = Object.freeze([
  { id: 'low', label: '20–250 Hz', from: 20, to: 250 },
  { id: 'lowMid', label: '250–500 Hz', from: 250, to: 500 },
  { id: 'mid', label: '500 Hz–2 kHz', from: 500, to: 2000 },
  { id: 'presence', label: '2–4 kHz', from: 2000, to: 4000 },
  { id: 'air', label: '4–8 kHz', from: 4000, to: 8000 },
  { id: 'top', label: '8–16 kHz', from: 8000, to: 16000 },
]);
export const METHODOLOGY = Object.freeze({
  momentaryLufs: 'LUFS: K-weighted (BS.1770-4) mean square over 400 ms ending at the point; null below −70 LUFS',
  shortTermLufs: 'LUFS: same over 3 s ending at the point',
  trendLufs: 'LUFS: same over 5 s ending at the point; trendDeltaLu = this − the previous non-overlapping 5 s window',
  bandsDbfs: 'dBFS (sine-equivalent RMS, full-scale sine = −3.01): Hann 8192-point FFT frames, up to 8 spread evenly over the 2 s window, left and right power averaged',
  bandsRelativeDb: 'dB: band power relative to the 2 s window total (spectral shape, independent of overall level)',
  correlation: 'Pearson correlation of left and right over the 2 s window (−1…+1)',
  sideToMidDb: 'dB: side energy relative to mid energy over the 2 s window',
  balanceDb: 'dB: left mean square relative to right over the 2 s window',
  monoFoldDb: 'dB: mono fold-down (L+R)/2 energy relative to the mean of L and R energy (unweighted); strongly negative = loses level in mono',
});

const toLufs = ms => (ms > 0 ? -0.691 + 10 * Math.log10(ms) : -Infinity);
const lufsOrNull = ms => { const v = toLufs(ms); return v > -70 ? v : null; };
const dbOrNull = ratio => (ratio > 0 ? 10 * Math.log10(ratio) : null);
const round = (v, d = 2) => (v === null ? null : Number(v.toFixed(d)));

// Hop is a whole number of 100 ms blocks, at least `hopSeconds`, and large enough that no more than
// `maxWindows` points are produced (bounded CPU and memory for long files).
export function chooseHop(duration, { hopSeconds = 1, maxWindows = 1200 } = {}) {
  const wanted = Number.isFinite(hopSeconds) ? hopSeconds : 1;
  const bounded = Math.max(wanted, duration / Math.max(1, maxWindows));
  return Math.min(30, Math.max(1, Math.ceil(bounded / BASE_SECONDS - 1e-9))) * BASE_SECONDS;
}

// K-weighted energy of each 100 ms block (streaming: no full-length weighted copy is kept).
function blockEnergies(channels, fs, blocks, edges, report) {
  const { shelf, highPass } = kWeighting(fs);
  const energy = channels.map(() => new Float64Array(blocks));
  channels.forEach((channel, c) => {
    let s1 = 0, s2 = 0, h1 = 0, h2 = 0;
    for (let b = 0; b < blocks; b++) {
      let sum = 0;
      for (let n = edges[b]; n < edges[b + 1]; n++) {
        const x = channel[n];
        const y = shelf.b0 * x + s1; s1 = shelf.b1 * x - shelf.a1 * y + s2; s2 = shelf.b2 * x - shelf.a2 * y;
        const z = highPass.b0 * y + h1; h1 = highPass.b1 * y - highPass.a1 * z + h2; h2 = highPass.b2 * y - highPass.a2 * z;
        sum += z * z;
      }
      energy[c][b] = sum;
      if (b % 50 === 0) report((c * blocks + b) / (channels.length * blocks) * 0.4);
    }
  });
  return energy;
}

const FRAME = 8192;
const HANN = Float64Array.from({ length: FRAME }, (_, n) => 0.5 - 0.5 * Math.cos((2 * Math.PI * n) / FRAME));
const HANN_SQ = HANN.reduce((a, w) => a + w * w, 0);

function windowSpectrum(channels, fs, first, last) {
  const frames = Math.min(8, Math.floor((last - first) / FRAME));
  if (frames < 1) return null;
  const power = new Float64Array(FRAME / 2);
  const re = new Float64Array(FRAME), im = new Float64Array(FRAME);
  for (const channel of channels) {
    for (let i = 0; i < frames; i++) {
      const start = first + Math.floor((i * (last - first - FRAME)) / Math.max(1, frames - 1));
      for (let n = 0; n < FRAME; n++) { re[n] = channel[start + n] * HANN[n]; im[n] = 0; }
      fft(re, im);
      for (let k = 1; k < FRAME / 2; k++) power[k] += re[k] * re[k] + im[k] * im[k];
    }
  }
  const scale = (2 / (FRAME * HANN_SQ)) / (frames * channels.length); // → mean square
  let total = 0;
  for (let k = 1; k < FRAME / 2; k++) total += power[k] * scale;
  const bands = {};
  for (const band of BANDS) {
    if (band.from >= fs / 2) { bands[band.id] = null; continue; }
    let ms = 0;
    for (let k = 1; k < FRAME / 2; k++) {
      const f = (k * fs) / FRAME;
      if (f >= band.from && f < band.to) ms += power[k] * scale;
    }
    bands[band.id] = { dbfs: round(dbOrNull(ms)), relativeDb: round(dbOrNull(total > 0 ? ms / total : 0)) };
  }
  return { totalDbfs: round(dbOrNull(total)), bands };
}

function stereoWindow(left, right, first, last) {
  let lr = 0, ll = 0, rr = 0, mm = 0, ss = 0, ml = 0, mr = 0;
  for (let n = first; n < last; n++) { ml += left[n]; mr += right[n]; }
  const count = last - first;
  ml /= count; mr /= count;
  let rawL = 0, rawR = 0;
  for (let n = first; n < last; n++) {
    const l = left[n], r = right[n];
    const cl = l - ml, cr = r - mr;
    lr += cl * cr; ll += cl * cl; rr += cr * cr;
    rawL += l * l; rawR += r * r;
    const m = (l + r) / 2, s = (l - r) / 2;
    mm += m * m; ss += s * s;
  }
  const mean = (rawL + rawR) / 2;
  return {
    correlation: ll > 0 && rr > 0 ? round(lr / Math.sqrt(ll * rr), 3) : null,
    sideToMidDb: round(mm > 0 && ss > 0 ? dbOrNull(ss / mm) : null),
    balanceDb: round(rawL > 0 && rawR > 0 ? dbOrNull(rawL / rawR) : null),
    monoFoldDb: round(mm > 0 && mean > 0 ? dbOrNull(mm / mean) : null),
    monoCancels: mean > 0 && mm / mean < 1e-9,
  };
}

// channels: 1 or 2 arrays of samples. Options: hopSeconds (default 1, whole 0.1 s multiples),
// maxWindows (default 1200), onProgress(0…1), shouldCancel() → true stops with an AbortError.
export function analyzeTimeline(channels, fs, { hopSeconds = 1, maxWindows = 1200, onProgress = () => {}, shouldCancel = () => false } = {}) {
  if (!channels.length || channels.length > 2) throw new Error('Timeline analysis supports mono and stereo audio.');
  if (!(fs > 0)) throw new Error('Timeline analysis needs a sample rate.');
  const frames = channels[0].length;
  const duration = frames / fs;
  const hop = chooseHop(duration, { hopSeconds, maxWindows });
  const hopBlocks = Math.round(hop / BASE_SECONDS);
  const blocks = Math.floor(frames / (fs * BASE_SECONDS));
  const edges = Int32Array.from({ length: blocks + 1 }, (_, b) => Math.round(b * fs * BASE_SECONDS));
  const report = fraction => { if (shouldCancel()) { const e = new Error('Analysis cancelled.'); e.name = 'AbortError'; throw e; } onProgress(Math.min(1, fraction)); };
  const result = {
    version: TIMELINE_VERSION,
    methodology: METHODOLOGY,
    input: { sampleRate: fs, channels: channels.length, frames, duration },
    hopSeconds: hop,
    windowSeconds: WINDOWS,
    points: [],
    spectral: [],
    markers: [],
    notes: [],
  };
  if (blocks === 0) { result.notes.push('File is shorter than 0.1 s: no windows to measure.'); return result; }

  const energy = blockEnergies(channels, fs, blocks, edges, report);
  const prefix = new Float64Array(blocks + 1);
  for (let b = 0; b < blocks; b++) prefix[b + 1] = prefix[b] + energy.reduce((sum, e) => sum + e[b], 0);
  // Mean K-weighted square (summed over channels) of the `length` blocks ending at block `end`.
  const power = (end, length) => {
    const startBlock = end - length;
    if (startBlock < 0) return null;
    const samples = edges[end] - edges[startBlock];
    return samples > 0 ? (prefix[end] - prefix[startBlock]) / samples : 0;
  };
  const len = seconds => Math.round(seconds / BASE_SECONDS);
  const lufsAt = (end, seconds) => { const p = power(end, len(seconds)); return p === null ? null : lufsOrNull(p); };
  for (let end = hopBlocks; end <= blocks; end += hopBlocks) {
    const t = edges[end] / fs;
    const trend = lufsAt(end, WINDOWS.trend);
    const previous = end - len(WINDOWS.trend) >= len(WINDOWS.trend) ? lufsAt(end - len(WINDOWS.trend), WINDOWS.trend) : null;
    result.points.push({
      time: round(t, 3),
      momentaryLufs: round(lufsAt(end, WINDOWS.momentary)),
      shortTermLufs: round(lufsAt(end, WINDOWS.shortTerm)),
      trendLufs: round(trend),
      trendDeltaLu: trend !== null && previous !== null ? round(trend - previous) : null,
    });
  }
  if (!result.points.length) result.notes.push('File is shorter than one hop: no loudness points.');
  if (duration < WINDOWS.shortTerm) result.notes.push('Shorter than 3 s: no short-term loudness.');
  if (duration < WINDOWS.trend) result.notes.push('Shorter than 5 s: no trend.');

  // Spectral and stereo windows: 2 s long, overlapping (hop < 2 s) or spaced (hop ≥ 2 s).
  const windowFrames = Math.round(WINDOWS.spectral * fs);
  if (frames < windowFrames) result.notes.push('Shorter than 2 s: no spectral or stereo windows.');
  else {
    const count = Math.floor((frames - windowFrames) / Math.round(hop * fs)) + 1;
    for (let i = 0; i < count; i++) {
      const first = i * Math.round(hop * fs), last = first + windowFrames;
      const spectrum = windowSpectrum(channels, fs, first, last);
      result.spectral.push({
        start: round(first / fs, 3),
        end: round(last / fs, 3),
        totalDbfs: spectrum?.totalDbfs ?? null,
        bands: spectrum?.bands ?? null,
        stereo: channels.length === 2 ? stereoWindow(channels[0], channels[1], first, last) : null,
      });
      if (i % 4 === 0) report(0.4 + (0.6 * i) / count);
    }
  }
  report(1);
  result.markers = findMarkers(result);
  return result;
}

// Thresholds are deliberately plain. A marker is an observation with the numbers behind it and a
// hypothesis; it never implies a defect or a correction.
export const THRESHOLDS = Object.freeze({ audibleDbfs: -60, spectralShiftDb: 6, loudnessStepLu: 4, correlationRisk: -0.3, balanceDb: 6, maxMarkers: 40 });
const clock = s => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

function findMarkers(result) {
  const { spectral, points, hopSeconds } = result;
  const raw = [];
  const audible = w => w.totalDbfs !== null && w.totalDbfs > THRESHOLDS.audibleDbfs;
  const lag = Math.max(1, Math.ceil(WINDOWS.spectral / hopSeconds - 1e-9)); // non-overlapping neighbour
  spectral.forEach((w, i) => {
    if (i >= lag) {
      const before = spectral[i - lag];
      if (audible(w) && audible(before) && w.bands && before.bands) {
        for (const band of BANDS) {
          const a = w.bands[band.id]?.relativeDb, b = before.bands[band.id]?.relativeDb;
          if (a == null || b == null || Math.abs(a - b) < THRESHOLDS.spectralShiftDb) continue;
          raw.push({ kind: 'spectral-shift', index: i, start: before.end, end: w.end, magnitude: Math.abs(a - b), band: band.id,
            title: `${band.label} ${a < b ? 'drops' : 'rises'} ${Math.abs(a - b).toFixed(1)} dB in spectral shape`,
            observation: `Between ${clock(before.start)}–${clock(before.end)} and ${clock(w.start)}–${clock(w.end)} the ${band.label} share of the spectrum moved from ${b.toFixed(1)} to ${a.toFixed(1)} dB relative to the window total.`,
            hypothesis: 'May be a change of arrangement or instrumentation (for example a sectional change in orchestration). It is not evidence of a defect and not a reason for a global EQ move; check whether the stereo markers stay normal at the same time.',
            evidence: { before: b, after: a } });
        }
      }
    }
    const s = w.stereo;
    if (s && audible(w) && (s.monoCancels || (s.correlation !== null && s.correlation < THRESHOLDS.correlationRisk))) {
      raw.push({ kind: 'phase-risk', index: i, start: w.start, end: w.end, magnitude: Math.abs(s.correlation ?? -1),
        title: s.monoCancels ? 'Left and right cancel in mono' : `Negative L/R correlation (${s.correlation.toFixed(2)})`,
        observation: `Correlation ${s.correlation === null ? 'n/a' : s.correlation.toFixed(2)}, mono fold-down ${s.monoCancels ? 'cancels to silence' : `${s.monoFoldDb?.toFixed(1)} dB`} relative to the channel average in ${clock(w.start)}–${clock(w.end)}.`,
        hypothesis: 'Possible out-of-phase content (polarity, wide stereo effect or delay between channels). It can be intended; confirm by listening in mono before changing anything.',
        evidence: { correlation: s.correlation, monoFoldDb: s.monoFoldDb, monoCancels: s.monoCancels } });
    }
    if (s && audible(w) && s.balanceDb !== null && Math.abs(s.balanceDb) >= THRESHOLDS.balanceDb) {
      raw.push({ kind: 'balance-offset', index: i, start: w.start, end: w.end, magnitude: Math.abs(s.balanceDb),
        title: `Channel balance ${s.balanceDb > 0 ? 'left' : 'right'}-heavy (${s.balanceDb > 0 ? '+' : ''}${s.balanceDb.toFixed(1)} dB)`,
        observation: `Left is ${Math.abs(s.balanceDb).toFixed(1)} dB ${s.balanceDb > 0 ? 'louder' : 'quieter'} than right in ${clock(w.start)}–${clock(w.end)}.`,
        hypothesis: 'May be a deliberate pan, a pan sweep or a one-sided instrument. It is not assumed to be an error and is not auto-centred.',
        evidence: { balanceDb: s.balanceDb } });
    }
  });
  points.forEach((p, i) => {
    if (p.trendDeltaLu !== null && Math.abs(p.trendDeltaLu) >= THRESHOLDS.loudnessStepLu) {
      raw.push({ kind: 'loudness-step', index: i, start: round(Math.max(0, p.time - 2 * WINDOWS.trend), 3), end: p.time, magnitude: Math.abs(p.trendDeltaLu),
        title: `5 s loudness ${p.trendDeltaLu > 0 ? 'rises' : 'falls'} ${Math.abs(p.trendDeltaLu).toFixed(1)} LU`,
        observation: `The 5 s loudness ending at ${clock(p.time)} is ${p.trendLufs.toFixed(1)} LUFS, ${p.trendDeltaLu > 0 ? '+' : ''}${p.trendDeltaLu.toFixed(1)} LU against the 5 s before it.`,
        hypothesis: 'Probably a section or dynamics change. Not necessarily a problem; compare with the intent of the piece.',
        evidence: { trendLufs: p.trendLufs, trendDeltaLu: p.trendDeltaLu } });
    }
  });
  // Neighbouring windows of one kind (and band) are one marker spanning their time range.
  raw.sort((a, b) => a.kind.localeCompare(b.kind) || (a.band ?? '').localeCompare(b.band ?? '') || a.index - b.index);
  const merged = [];
  for (const m of raw) {
    const last = merged[merged.length - 1];
    if (last && last.kind === m.kind && last.band === m.band && m.index - last.lastIndex <= 1) {
      last.end = Math.max(last.end, m.end);
      if (m.magnitude > last.magnitude) Object.assign(last, { magnitude: m.magnitude, title: m.title, observation: m.observation, evidence: m.evidence });
      last.lastIndex = m.index;
    } else merged.push({ ...m, lastIndex: m.index });
  }
  return merged
    .sort((a, b) => b.magnitude - a.magnitude)
    .slice(0, THRESHOLDS.maxMarkers)
    .sort((a, b) => a.start - b.start || a.kind.localeCompare(b.kind))
    .map((marker, n) => {
      const m = { ...marker };
      delete m.index;
      delete m.lastIndex;
      return { id: `m${n + 1}`, ...m, start: round(m.start, 3), end: round(m.end, 3), magnitude: round(m.magnitude) };
    });
}
