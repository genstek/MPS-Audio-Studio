// Numerical characterisation of the LAS-27 mastering chain: EQ responses, compressor curve and
// timing, limiter ceiling and latency, throughput. Development evidence; writes chain-report.json
// and chain-report.md to the given folder (default: a new temporary folder).
// Usage: node scripts/characterize-chain.js [output-folder]
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { biquadResponseDb } from '../src/dsp/biquad.js';
import { defaultChain, editBand, validateChain } from '../src/dsp/chain-params.js';
import { createChain, renderChain } from '../src/dsp/chain.js';
import { designBand } from '../src/dsp/eq-design.js';
import { fft } from '../src/dsp/fft.js';
import { HALF, TAPS, interpolationBranches, truePeak } from '../src/dsp/true-peak.js';
import { noise, sine } from '../tests/fixtures/signals.js';

const db = value => 20 * Math.log10(value);
// A 32× reference meter, finer than both the 4× BS.1770 meter and the limiter's 8× detector.
const fineBranches = interpolationBranches(32);
function finePeak(channel) {
  const padded = new Float64Array(channel.length + TAPS);
  padded.set(channel, HALF);
  let peak = 0;
  for (let n = 0; n + 1 < channel.length; n++) {
    peak = Math.max(peak, Math.abs(channel[n]));
    for (const branch of fineBranches) {
      let sum = 0;
      for (let k = 0; k < TAPS; k++) sum += padded[n + TAPS - k] * branch[k];
      if (Math.abs(sum) > peak) peak = Math.abs(sum);
    }
  }
  return peak;
}
const round = (value, digits = 3) => Number(value.toFixed(digits));
const peakOf = signal => signal.reduce((max, value) => Math.max(max, Math.abs(value)), 0);
function neutral(changes = {}) {
  const params = defaultChain();
  return validateChain({
    ...params,
    eq: { ...params.eq, enabled: false, ...changes.eq },
    compressor: { ...params.compressor, enabled: false, ...changes.compressor },
    limiter: { ...params.limiter, enabled: false, ...changes.limiter },
  });
}

const report = { generated: new Date().toISOString(), node: process.version, eq: [], compressorCurve: [], compressorTiming: [], limiter: [], latency: [], throughput: {} };

// EQ: impulse response through the chain, FFT magnitude vs the analytic transfer function.
const size = 16384;
for (const rate of [44100, 48000, 96000]) {
  for (const band of [
    { type: 'bell', frequency: 1000, gain: 9, q: 1.4 },
    { type: 'bell', frequency: 12000, gain: -12, q: 4 },
    { type: 'low-shelf', frequency: 150, gain: -6, q: 0.707 },
    { type: 'high-shelf', frequency: 8000, gain: 4, q: 0.707 },
    { type: 'high-pass', frequency: 80, gain: 0, q: 0.707 },
    { type: 'low-pass', frequency: 15000, gain: 0, q: 2 },
  ]) {
    const impulse = new Float32Array(size);
    impulse[0] = 1;
    const [out] = renderChain(editBand(neutral({ eq: { enabled: true } }), 'left', 0, { enabled: true, ...band }), [impulse], rate).channels;
    const re = Float64Array.from(out), im = new Float64Array(size);
    fft(re, im);
    let worst = 0;
    const points = {};
    for (const f of [30, 100, 500, 1000, 3000, 8000, 12000, 16000]) {
      const k = Math.round((f * size) / rate);
      const measured = 10 * Math.log10(re[k] ** 2 + im[k] ** 2);
      const expected = biquadResponseDb(designBand(band, rate), (k * rate) / size, rate);
      worst = Math.max(worst, Math.abs(measured - expected));
      points[f] = round(measured, 2);
    }
    report.eq.push({ rate, ...band, measuredDb: points, largestDeviationDb: round(worst, 5) });
  }
}

// Compressor static curve with a 1 kHz sine (peak detector, attack 0.1 ms, release 500 ms).
for (const input of [-40, -30, -24, -20, -16, -10, -4]) {
  for (const knee of [0, 6]) {
    const tone = Float32Array.from(sine({ dbfs: input, seconds: 1.5 }));
    const [out] = renderChain(neutral({ compressor: { enabled: true, threshold: -20, ratio: 4, knee, attack: 0.1, release: 500, detector: 'peak' } }), [tone], 48000).channels;
    const over = input + 20;
    const expected = 2 * over < -knee ? 0 : knee > 0 && 2 * Math.abs(over) <= knee ? (1 / 4 - 1) * (over + knee / 2) ** 2 / (2 * knee) : over / 4 - over;
    report.compressorCurve.push({ inputDbfs: input, threshold: -20, ratio: 4, kneeDb: knee, expectedGainDb: round(expected), measuredGainDb: round(db(peakOf(out.subarray(48000)) / peakOf(tone.subarray(48000)))) });
  }
}

// Compressor timing: a level step from −40 to −10 dBFS and back (DC levels, peak detector).
for (const [attack, release] of [[1, 50], [10, 100], [50, 500]]) {
  const rate = 48000;
  const step = new Float32Array(rate * 2);
  step.fill(0.01, 0, rate / 2); step.fill(0.316228, rate / 2, rate); step.fill(0.01, rate);
  const [out] = renderChain(neutral({ compressor: { enabled: true, threshold: -20, ratio: 4, knee: 0, attack, release, detector: 'peak' } }), [step], rate).channels;
  const reduction = n => db(out[n] / step[n]);
  const crossing = (from, test) => { for (let n = from; n < step.length; n++) if (test(reduction(n))) return round(((n - from) / rate) * 1000, 2); return null; };
  report.compressorTiming.push({ attackMs: attack, releaseMs: release, measured63PercentAttackMs: crossing(rate / 2, r => r <= -7.5 * 0.632), measured63PercentReleaseMs: crossing(rate, r => r >= -7.5 * 0.368) });
}

// Limiter: output true peak on hard signals, ceiling −1 dBTP.
const signals = {
  'noise +12 dB over full scale': rate => [noise({ seconds: 3, rate, amplitude: 4, seed: 3 }), noise({ seconds: 3, rate, amplitude: 4, seed: 4 })],
  'fs/4 sine at 45°, 0 dBTP': rate => { const s = sine({ frequency: rate / 4, dbfs: 0, seconds: 1, rate, phase: Math.PI / 4 }); return [s, s]; },
  '3 kHz bursts at +5 dBFS': rate => { const s = Float64Array.from({ length: rate }, (_, n) => (Math.floor(n / (rate / 10)) % 2 ? 1.8 : 0.05) * Math.sin((2 * Math.PI * 3000 * n) / rate)); return [s, s.map(v => -v)]; },
  '18 kHz sine +6 dB': rate => { const s = sine({ frequency: Math.min(18000, 0.4 * rate), dbfs: 6, seconds: 1, rate }); return [s, s]; },
};
for (const rate of [44100, 48000, 96000]) {
  for (const [name, make] of Object.entries(signals)) {
    for (const ceiling of [-1, -0.1, -6]) {
      const input = make(rate).map(channel => Float32Array.from(channel));
      const result = renderChain(neutral({ limiter: { enabled: true, ceiling, release: 100 } }), input, rate);
      const outPeak = Math.max(...result.channels.map(channel => db(truePeak(channel))));
      const outFine = Math.max(...result.channels.map(channel => db(finePeak(channel))));
      report.limiter.push({ rate, signal: name, ceilingDbtp: ceiling, inputTruePeakDbtp: round(Math.max(...input.map(channel => db(truePeak(channel)))), 2), outputTruePeakDbtp: round(outPeak), overCeilingDb: round(Math.max(0, outPeak - ceiling)), output32xPeakDbtp: round(outFine), over32xDb: round(Math.max(0, outFine - ceiling)), maxGainReductionDb: round(result.meters.maxLimiterGainReductionDb, 2) });
    }
  }
  const chain = createChain(neutral({ limiter: { enabled: true } }), rate, 2);
  report.latency.push({ rate, samples: chain.latency, ms: round((chain.latency / rate) * 1000, 3) });
}

// Throughput of the full chain (all 48 EQ bands on, compressor, limiter) in this process.
let busy = neutral({ eq: { enabled: true, mode: 'independent' }, compressor: { enabled: true, threshold: -24, ratio: 3 }, limiter: { enabled: true, inputGain: 6 } });
for (let i = 0; i < 24; i++) for (const channel of ['left', 'right']) busy = editBand(busy, channel, i, { enabled: true, gain: (i % 5) - 2 });
const audio = [Float32Array.from(noise({ seconds: 20, amplitude: 0.5, seed: 1 })), Float32Array.from(noise({ seconds: 20, amplitude: 0.5, seed: 2 }))];
const started = performance.now();
renderChain(busy, audio, 48000);
const seconds = (performance.now() - started) / 1000;
report.throughput = { audioSeconds: 20, sampleRate: 48000, channels: 2, enabledBands: 48, processingSeconds: round(seconds, 2), realTimeFactor: round(20 / seconds, 1) };

const folder = process.argv[2] ?? mkdtempSync(path.join(tmpdir(), 'mps-chain-'));
mkdirSync(folder, { recursive: true });
writeFileSync(path.join(folder, 'chain-report.json'), `${JSON.stringify(report, null, 2)}\n`);
const table = (rows, columns) => [`| ${columns.join(' | ')} |`, `| ${columns.map(() => '---').join(' | ')} |`, ...rows.map(row => `| ${columns.map(column => (typeof row[column] === 'object' ? JSON.stringify(row[column]) : row[column])).join(' | ')} |`)].join('\n');
const md = [
  '# Mastering chain characterisation (LAS-27)', '', `Generated ${report.generated} with Node ${report.node}.`, '',
  '## EQ: measured impulse response vs transfer function', table(report.eq, ['rate', 'type', 'frequency', 'gain', 'q', 'largestDeviationDb']), '',
  '## Compressor static curve (threshold −20 dBFS, ratio 4:1)', table(report.compressorCurve, ['inputDbfs', 'kneeDb', 'expectedGainDb', 'measuredGainDb']), '',
  '## Compressor timing (63 % of a 30 dB step)', table(report.compressorTiming, ['attackMs', 'measured63PercentAttackMs', 'releaseMs', 'measured63PercentReleaseMs']), '',
  '## Limiter true-peak ceiling (4× BS.1770 meter and 32× reference meter; the limiter detects at 8×)', table(report.limiter, ['rate', 'signal', 'ceilingDbtp', 'inputTruePeakDbtp', 'outputTruePeakDbtp', 'overCeilingDb', 'output32xPeakDbtp', 'over32xDb', 'maxGainReductionDb']), '',
  '## Latency', table(report.latency, ['rate', 'samples', 'ms']), '',
  '## Throughput', table([report.throughput], Object.keys(report.throughput)), '',
].join('\n');
writeFileSync(path.join(folder, 'chain-report.md'), md);
const worstOver = Math.max(...report.limiter.map(row => row.overCeilingDb));
const worstFine = Math.max(...report.limiter.map(row => row.over32xDb));
const worstEq = Math.max(...report.eq.map(row => row.largestDeviationDb));
console.log(`EQ largest deviation ${worstEq} dB; limiter largest over-ceiling ${worstOver} dB (4× meter), ${worstFine} dB (32× meter); throughput ${report.throughput.realTimeFactor}× real time`);
process.exitCode = worstOver <= 0.2 && worstFine <= 0.2 && worstEq <= 0.01 ? 0 : 1;
