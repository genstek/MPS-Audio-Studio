// LAS-29 DSP regression harness. Runs every synthetic fixture through every preset at 44.1 and
// 48 kHz, checks each render independently (clipping, NaN/Inf, length/channels, timing, channel
// mapping, bypass identity, true-peak ceiling) and compares with tests/golden/dsp-golden.json.
//
//   node scripts/dsp-regression.js [--out <folder>] [--ffmpeg]
//   node scripts/dsp-regression.js --update --reason "why the processing changed"
//
// --ffmpeg also measures selected renders with FFmpeg's ebur128 filter (independent meter).
// --update rewrites the golden file (golden version + 1, reason recorded); it refuses while any
// check reports a finding. Exit code 1 on findings or golden differences.
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderChain } from '../src/dsp/chain.js';
import { FIXTURES } from '../tests/fixtures/dsp-fixtures.js';
import { PRESETS } from '../tests/harness/presets.js';
import { compareWithGolden, GOLDEN_PATH, readGolden, runRegression, versions } from '../tests/harness/regression.js';

const args = process.argv.slice(2);
const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const outFolder = option('--out') ?? mkdtempSync(path.join(tmpdir(), 'mps-dsp-regression-'));
mkdirSync(outFolder, { recursive: true });

const started = performance.now();
const timings = [];
const run = runRegression({ onRender: (key, ms) => timings.push({ key, ms: Math.round(ms) }) });
const seconds = ((performance.now() - started) / 1000).toFixed(1);
const goldenPath = fileURLToPath(GOLDEN_PATH);
const golden = existsSync(goldenPath) ? readGolden() : null;
const differences = golden ? compareWithGolden(run, golden) : ['no golden file yet'];

let ffmpeg = null;
if (args.includes('--ffmpeg')) {
  const version = spawnSync('ffmpeg', ['-hide_banner', '-version'], { encoding: 'utf8' }).stdout?.split('\n')[0] ?? 'ffmpeg not found';
  const work = mkdtempSync(path.join(tmpdir(), 'mps-dsp-ffmpeg-'));
  const rows = [];
  for (const key of Object.keys(run.renders).filter(k => /^(programme|programme-hot|transients|sweep-mono|tone-1k-stereo)@/.test(k) && /\/(default|master)$/.test(k))) {
    const [, name, rate, preset] = key.match(/^(.*)@(\d+)\/(.*)$/);
    const { channels } = renderChain(PRESETS[preset], FIXTURES[name](Number(rate)), Number(rate));
    const frames = channels[0].length;
    const data = new DataView(new ArrayBuffer(44 + frames * channels.length * 4));
    const text = (o, v) => [...v].forEach((ch, i) => data.setUint8(o + i, ch.charCodeAt(0)));
    text(0, 'RIFF'); data.setUint32(4, data.byteLength - 8, true); text(8, 'WAVEfmt '); data.setUint32(16, 16, true); data.setUint16(20, 3, true);
    data.setUint16(22, channels.length, true); data.setUint32(24, Number(rate), true); data.setUint32(28, Number(rate) * channels.length * 4, true);
    data.setUint16(32, channels.length * 4, true); data.setUint16(34, 32, true); text(36, 'data'); data.setUint32(40, frames * channels.length * 4, true);
    for (let n = 0; n < frames; n++) channels.forEach((channel, c) => data.setFloat32(44 + (n * channels.length + c) * 4, channel[n], true));
    const file = path.join(work, `${rows.length}.wav`);
    writeFileSync(file, new Uint8Array(data.buffer));
    const log = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true', '-f', 'null', '-'], { encoding: 'utf8' }).stderr ?? '';
    const summary = log.slice(log.lastIndexOf('Summary:'));
    const lufs = Number(summary.match(/I:\s+(-?[\d.]+) LUFS/)?.[1]);
    const tp = Number(summary.match(/Peak:\s+(-?[\d.]+) dBFS/)?.[1]);
    const ours = run.renders[key];
    const ceiling = PRESETS[preset].limiter.ceiling;
    rows.push({ render: key, mpsLufs: ours.integratedLufs, ffmpegLufs: lufs, lufsDifference: Number((ours.integratedLufs - lufs).toFixed(3)), mpsTruePeak: ours.truePeakDbtp, ffmpegTruePeak: tp, ceiling, ffmpegOverCeiling: Number(Math.max(0, tp - ceiling).toFixed(2)) });
  }
  const pass = rows.every(row => Math.abs(row.lufsDifference) <= 0.15 && row.ffmpegOverCeiling <= 0.2);
  ffmpeg = { version, pass, tolerance: 'integrated loudness ±0.15 LU (FFmpeg prints 0.1 steps); FFmpeg true peak at most 0.2 dB over the ceiling', rows };
}

if (args.includes('--update')) {
  const reason = option('--reason');
  if (!reason) { console.error('--update needs --reason "…"'); process.exit(1); }
  if (run.findings.length) { console.error('Refusing to update the golden file while checks report findings:\n' + run.findings.join('\n')); process.exit(1); }
  const goldenVersion = (golden?.goldenVersion ?? 0) + 1;
  const history = [...(golden?.history ?? []), { goldenVersion, date: new Date().toISOString().slice(0, 10), reason }];
  writeFileSync(goldenPath, `${JSON.stringify({ goldenVersion, ...versions(), node: process.version, history, fixtures: run.fixtures, renders: run.renders }, null, 1)}\n`);
  console.log(`Golden file written: version ${goldenVersion} (${Object.keys(run.renders).length} renders).`);
}

const report = { versions: versions(), node: process.version, seconds: Number(seconds), renders: Object.keys(run.renders).length, findings: run.findings, goldenVersion: golden?.goldenVersion ?? null, goldenDifferences: args.includes('--update') ? [] : differences, ffmpeg, timings, results: run.renders };
writeFileSync(path.join(outFolder, 'dsp-regression.json'), `${JSON.stringify(report, null, 1)}\n`);
const lines = [
  `# DSP regression run`, '', `${report.renders} renders in ${seconds} s with Node ${process.version}; fixtures ${versions().fixtureSetVersion}, chain schema v${versions().chainSchemaVersion}, ${versions().analysisVersion}, limiter ${versions().limiterOversampling}× detection; golden version ${report.goldenVersion ?? '—'}.`, '',
  `Findings: ${run.findings.length ? run.findings.length : 'none'}. Golden differences: ${report.goldenDifferences.length ? report.goldenDifferences.length : 'none'}.`, '',
  ...run.findings.map(text => `- finding: ${text}`), ...report.goldenDifferences.map(text => `- golden: ${text}`), '',
  '| Render | Frames | LUFS | True peak dBTP | Sample peak dBFS | Clipped | Correlation |', '| --- | --- | --- | --- | --- | --- | --- |',
  ...Object.entries(run.renders).map(([key, m]) => `| ${key} | ${m.frames} | ${m.integratedLufs ?? '—'} | ${m.truePeakDbtp ?? '—'} | ${m.samplePeakDbfs ?? '—'} | ${m.clippedSamples} | ${m.correlation ?? '—'} |`),
];
if (ffmpeg) lines.push('', `## FFmpeg cross-check (${ffmpeg.version})`, '', ffmpeg.tolerance, '', '| Render | MPS LUFS | FFmpeg LUFS | Δ | MPS TP | FFmpeg TP | Ceiling | FFmpeg over |', '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ...ffmpeg.rows.map(r => `| ${r.render} | ${r.mpsLufs} | ${r.ffmpegLufs} | ${r.lufsDifference} | ${r.mpsTruePeak} | ${r.ffmpegTruePeak} | ${r.ceiling} | ${r.ffmpegOverCeiling} |`), '', `Result: ${ffmpeg.pass ? 'PASS' : 'FAIL'}`);
writeFileSync(path.join(outFolder, 'dsp-regression.md'), `${lines.join('\n')}\n`);
console.log(`${report.renders} renders in ${seconds} s; findings ${run.findings.length}; golden differences ${report.goldenDifferences.length}${ffmpeg ? `; FFmpeg ${ffmpeg.pass ? 'PASS' : 'FAIL'}` : ''}. Report: ${outFolder}`);
process.exitCode = run.findings.length || report.goldenDifferences.length || (ffmpeg && !ffmpeg.pass) ? 1 : 0;
