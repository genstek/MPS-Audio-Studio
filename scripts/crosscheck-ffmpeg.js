// Cross-checks the LAS-26 analysis against an independent implementation: FFmpeg's ebur128 filter.
// Development evidence only; FFmpeg is not a project dependency and is never bundled.
// Usage: node scripts/crosscheck-ffmpeg.js [output-folder]   (writes crosscheck.json and .md there)
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { analyze } from '../src/dsp/analysis.js';
import { concat, noise, sine, toneSequence } from '../tests/fixtures/signals.js';

// 32-bit float WAV, so FFmpeg and the analysis read exactly the same sample values.
function floatWav(channels, rate) {
  const frames = channels[0].length;
  const data = frames * channels.length * 4;
  const view = new DataView(new ArrayBuffer(44 + data));
  const text = (offset, value) => [...value].forEach((char, i) => view.setUint8(offset + i, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + data, true); text(8, 'WAVE');
  text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 3, true); view.setUint16(22, channels.length, true);
  view.setUint32(24, rate, true); view.setUint32(28, rate * channels.length * 4, true); view.setUint16(32, channels.length * 4, true); view.setUint16(34, 32, true);
  text(36, 'data'); view.setUint32(40, data, true);
  for (let n = 0; n < frames; n++) channels.forEach((channel, c) => view.setFloat32(44 + (n * channels.length + c) * 4, channel[n], true));
  return new Uint8Array(view.buffer);
}

// Low-passed seeded noise with level steps: a broadband, changing signal unlike the EBU tones.
function programme(seconds, rate, seed) {
  const white = noise({ seconds, rate, amplitude: 1, seed });
  let state = 0;
  const steps = [-18, -24, -14, -30, -20];
  return white.map((value, n) => {
    state += 0.15 * (value - state);
    const step = steps[Math.min(steps.length - 1, Math.floor((n / white.length) * steps.length))];
    return state * 10 ** (step / 20) * 3;
  });
}

const fixtures = [
  { name: 'EBU 3341 test 1: 1 kHz −23 dBFS stereo', rate: 48000, channels: () => { const s = sine({ dbfs: -23, seconds: 20 }); return [s, s]; } },
  { name: 'EBU 3342 test 4: five-step tone', rate: 48000, channels: () => { const s = toneSequence([[20, -50], [20, -35], [20, -20], [20, -35], [20, -50]]); return [s, s]; } },
  { name: 'Programme-like noise, stereo 44.1 kHz', rate: 44100, channels: () => [programme(40, 44100, 3), programme(40, 44100, 4)] },
  { name: 'Programme-like noise, mono 96 kHz', rate: 96000, channels: () => [programme(30, 96000, 5)] },
  { name: 'Intersample peak: 12 kHz at 45°', rate: 48000, channels: () => { const s = sine({ frequency: 12000, dbfs: -6.0206, seconds: 5, phase: Math.PI / 4, fade: 0.05 }); return [s, s]; } },
  { name: 'Chord with tremolo, wide stereo', rate: 48000, channels: () => {
    const tremolo = (s, rate) => s.map((v, n) => v * (0.6 + 0.4 * Math.sin((2 * Math.PI * 0.5 * n) / rate)));
    const left = tremolo(concat(sine({ frequency: 220, dbfs: -20, seconds: 15 })).map((v, n) => v + 0.05 * Math.sin((2 * Math.PI * 1320 * n) / 48000)), 48000);
    const right = tremolo(sine({ frequency: 330, dbfs: -22, seconds: 15 }), 48000);
    return [left, right];
  } },
];

// FFmpeg writes its loudness summary to stderr.
function runFfmpeg(file) {
  const run = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', 'ebur128=peak=true+sample:framelog=quiet', '-f', 'null', '-'], { encoding: 'utf8' });
  if (run.status !== 0) throw new Error(`FFmpeg failed for ${file}: ${run.stderr}`);
  const log = run.stderr;
  const summary = log.slice(log.lastIndexOf('Summary:'));
  const number = pattern => {
    const match = summary.match(pattern);
    return match ? Number(match[1]) : null;
  };
  const peaks = [...summary.matchAll(/Peak:\s+(-?[\d.]+|-inf)\s+dBFS/g)].map(match => Number(match[1]));
  return { integratedLufs: number(/I:\s+(-?[\d.]+) LUFS/), rangeLu: number(/LRA:\s+(-?[\d.]+) LU/), samplePeakDbfs: peaks[0] ?? null, truePeakDbtp: peaks[1] ?? null };
}

const outputFolder = process.argv[2] ?? mkdtempSync(path.join(tmpdir(), 'mps-crosscheck-'));
mkdirSync(outputFolder, { recursive: true });
const workFolder = mkdtempSync(path.join(tmpdir(), 'mps-crosscheck-audio-'));
const version = execFileSync('ffmpeg', ['-hide_banner', '-version'], { encoding: 'utf8' }).split('\n')[0];
// FFmpeg prints one decimal place, so ±0.05 of rounding is part of every comparison.
const tolerance = { integratedLufs: 0.15, rangeLu: 0.6, samplePeakDbfs: 0.06, truePeakDbtp: 0.25 };
const rows = fixtures.map(fixture => {
  const channels = fixture.channels().map(channel => Float32Array.from(channel));
  const file = path.join(workFolder, `${fixtures.indexOf(fixture)}.wav`);
  writeFileSync(file, floatWav(channels, fixture.rate));
  const ours = analyze(channels, fixture.rate);
  const mine = { integratedLufs: ours.loudness.integratedLufs, rangeLu: ours.loudness.rangeLu, samplePeakDbfs: ours.peaks.samplePeakDbfs, truePeakDbtp: ours.peaks.truePeakDbtp };
  const reference = runFfmpeg(file);
  const checks = Object.keys(tolerance).map(key => {
    const difference = mine[key] - reference[key];
    return { measure: key, mps: Number(mine[key].toFixed(3)), ffmpeg: reference[key], difference: Number(difference.toFixed(3)), tolerance: tolerance[key], pass: Math.abs(difference) <= tolerance[key] };
  });
  return { fixture: fixture.name, sampleRate: fixture.rate, channels: channels.length, seconds: channels[0].length / fixture.rate, checks };
});
const passed = rows.every(row => row.checks.every(check => check.pass));
const report = { tool: version, filter: 'ebur128=peak=true+sample', analysisVersion: analyze([new Float64Array(1)], 48000).version, tolerance, passed, rows };
writeFileSync(path.join(outputFolder, 'crosscheck.json'), `${JSON.stringify(report, null, 2)}\n`);
const lines = ['| Fixture | Measure | MPS | FFmpeg | Difference | Tolerance | Result |', '| --- | --- | --- | --- | --- | --- | --- |'];
for (const row of rows) for (const check of row.checks) lines.push(`| ${row.fixture} | ${check.measure} | ${check.mps} | ${check.ffmpeg} | ${check.difference} | ±${check.tolerance} | ${check.pass ? 'PASS' : 'FAIL'} |`);
writeFileSync(path.join(outputFolder, 'crosscheck.md'), `# Analysis cross-check against ${version}\n\n${lines.join('\n')}\n`);
console.log(lines.join('\n'));
console.log(passed ? 'All comparisons within tolerance.' : 'Some comparisons are outside tolerance.');
process.exitCode = passed ? 0 : 1;
