// LAS-29 blind listening set: cuts the same segment from the original and the processed version
// (and optionally an authorized reference), matches their integrated loudness by turning the
// louder ones down by a constant gain, and writes them as A/B(/C) with a hidden key. Runs on this
// computer only; nothing is uploaded.
//
//   node scripts/listening-set.js song.wav --settings mps-chain-settings.json --start 60 --duration 20 \
//     [--reference lia-v6.wav --reference-sha256 <hex>] [--seed 7] [--out listening-set]
//
// Open key.json only after filling in review-sheet.md.
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defaultChain, parseChain, serializeChain } from '../src/dsp/chain-params.js';
import { renderChain } from '../src/dsp/chain.js';
import { fft } from '../src/dsp/fft.js';
import { measureLoudness } from '../src/dsp/loudness.js';
import { decodeWav } from '../src/dsp/wav-decode.js';
import { encodeWav } from '../src/dsp/wav-encode.js';

const FADE_SECONDS = 0.02;
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

function segment(channels, rate, start, duration) {
  const from = Math.round(start * rate), to = Math.min(channels[0].length, from + Math.round(duration * rate));
  if (from < 0 || from >= to) throw new Error('The segment is outside the file.');
  return channels.map(channel => {
    const cut = Float32Array.from(channel.subarray(from, to));
    const ramp = Math.min(Math.round(FADE_SECONDS * rate), Math.floor(cut.length / 2));
    for (let n = 0; n < ramp; n++) { const w = 0.5 - 0.5 * Math.cos((Math.PI * n) / ramp); cut[n] *= w; cut[cut.length - 1 - n] *= w; }
    return cut;
  });
}

const mono = channels => Float32Array.from(channels[0], (v, n) => (channels.length === 2 ? (v + channels[1][n]) / 2 : v));

// Offset (seconds) of `other` relative to `base` by FFT cross-correlation within ±maxSeconds, and
// the normalised correlation at that offset (low values: probably not the same recording).
export function alignOffset(base, other, rate, maxSeconds = 2) {
  const a = mono(base), b = mono(other);
  const maxLag = Math.round(maxSeconds * rate);
  let size = 1;
  while (size < a.length + b.length) size *= 2;
  const ar = new Float64Array(size), ai = new Float64Array(size), br = new Float64Array(size), bi = new Float64Array(size);
  ar.set(a); br.set(b);
  fft(ar, ai); fft(br, bi);
  // conj(A)·B, inverse FFT via the conjugate trick.
  for (let k = 0; k < size; k++) {
    const re = ar[k] * br[k] + ai[k] * bi[k], im = ar[k] * bi[k] - ai[k] * br[k];
    ar[k] = re; ai[k] = -im;
  }
  fft(ar, ai);
  let bestLag = 0, best = -Infinity;
  for (let lag = -maxLag; lag <= maxLag; lag++) {
    const value = ar[(lag + size) % size] / size;
    if (value > best) { best = value; bestLag = lag; }
  }
  const energy = x => x.reduce((s, v) => s + v * v, 0);
  return { offsetSeconds: bestLag / rate, correlation: best / Math.sqrt(energy(a) * energy(b) || 1) };
}

// sources: { original, processed, reference? } as channel arrays at `rate`. Returns the blind set.
export function makeListeningSet(sources, rate, { seed = Date.now() } = {}) {
  const names = Object.keys(sources);
  const loudness = Object.fromEntries(names.map(name => [name, measureLoudness(sources[name], rate).integratedLufs]));
  if (names.some(name => loudness[name] === null)) throw new Error('A version of the segment is silent or too short to measure; choose another segment.');
  const target = Math.min(...names.map(name => loudness[name]));
  const gainsDb = Object.fromEntries(names.map(name => [name, Number((target - loudness[name]).toFixed(3))]));
  const matched = Object.fromEntries(names.map(name => [name, sources[name].map(channel => channel.map(v => v * 10 ** (gainsDb[name] / 20)))]));
  // Seeded shuffle for the blind labels (mulberry32: well mixed even for small seeds).
  let state = seed >>> 0;
  const random = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = [...names];
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  const labels = order.map((name, i) => [String.fromCharCode(65 + i), name]);
  const after = Object.fromEntries(names.map(name => [name, Number(measureLoudness(matched[name], rate).integratedLufs.toFixed(3))]));
  return { labels, files: Object.fromEntries(labels.map(([label, name]) => [label, matched[name]])), key: { seed, labels: Object.fromEntries(labels), loudnessBeforeLufs: loudness, gainsDb, loudnessAfterLufs: after } };
}

const REVIEW = ['Punch (transients, impact)', 'Bass balance', 'Vocal clarity', 'Harshness (2–6 kHz, sibilance)', 'Pumping / breathing', 'Mono compatibility (switch your system to mono)', 'Overall preference'];

function reviewSheet(labels, meta) {
  const columns = labels.map(([label]) => label);
  return [
    '# Blind listening review (LAS-29)', '',
    `Segment ${meta.start}–${meta.start + meta.duration} s of ${meta.source}. All versions are at the same integrated loudness (constant gain, the louder ones turned down), cut from the same position, 24-bit, with ${FADE_SECONDS * 1000} ms fades.`, '',
    'Listen at a comfortable fixed level, on the same headphones or speakers, switching often at the same musical moment. Do not open key.json until this sheet is filled in.', '',
    'Score each version from 1 (poor) to 5 (excellent) and add a word or two. These are your impressions, not measurements: there is no objectively correct answer.', '',
    `| Attribute | ${columns.join(' | ')} | Notes |`, `| --- | ${columns.map(() => '---').join(' | ')} | --- |`,
    ...REVIEW.map(item => `| ${item} | ${columns.map(() => ' ').join(' | ')} |  |`), '',
    'Listening conditions: date ______ · headphones/speakers ______ · room ______ · level ______', '',
    'Which version would you release? ______ Why? ______', '',
  ].join('\n');
}

async function main(args) {
  const option = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
  const sourcePath = args[0];
  if (!sourcePath || sourcePath.startsWith('--')) throw new Error('Usage: node scripts/listening-set.js song.wav [--settings file.json] [--start s] [--duration s] [--reference ref.wav --reference-sha256 hex] [--seed n] [--out folder]');
  const start = Number(option('--start') ?? 0), duration = Number(option('--duration') ?? 20);
  const out = option('--out') ?? 'listening-set';
  const sourceBytes = readFileSync(sourcePath);
  const source = decodeWav(sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength));
  if (source.channels > 2) throw new Error('Mono or stereo files only.');
  const params = option('--settings') ? parseChain(readFileSync(option('--settings'), 'utf8')) : defaultChain();
  // The whole file is processed, so the compressor and limiter are in their real state at the segment.
  const processed = renderChain(params, source.samples, source.sampleRate).channels;
  const sources = { original: segment(source.samples, source.sampleRate, start, duration), processed: segment(processed, source.sampleRate, start, duration) };
  const meta = { source: path.basename(sourcePath), start, duration, sourceSha256: sha256(sourceBytes), sampleRate: source.sampleRate, settings: JSON.parse(serializeChain(params)) };
  const referencePath = option('--reference');
  if (referencePath) {
    const bytes = readFileSync(referencePath);
    const checksum = sha256(bytes);
    const expected = option('--reference-sha256');
    if (expected && expected.toLowerCase() !== checksum) throw new Error(`The reference file's SHA-256 is ${checksum}, not the authorized ${expected}. Nothing was written.`);
    const reference = decodeWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
    if (reference.sampleRate !== source.sampleRate) throw new Error(`The reference is ${reference.sampleRate} Hz and the song ${source.sampleRate} Hz; convert one so both match.`);
    const wide = segment(source.samples, source.sampleRate, Math.max(0, start - 2), duration + 4);
    const refWide = segment(reference.samples.length === 1 ? [reference.samples[0], reference.samples[0]] : reference.samples, source.sampleRate, Math.max(0, start - 2), duration + 4);
    const alignment = alignOffset(wide, refWide, source.sampleRate);
    const refChannels = source.channels === 1 ? [mono(reference.samples)] : (reference.samples.length === 1 ? [reference.samples[0], reference.samples[0]] : reference.samples);
    sources.reference = segment(refChannels, source.sampleRate, start + alignment.offsetSeconds, duration);
    meta.reference = { file: path.basename(referencePath), sha256: checksum, checksumVerified: Boolean(expected), alignment };
  }
  const set = makeListeningSet(sources, source.sampleRate, { seed: Number(option('--seed') ?? Date.now() % 2 ** 31) });
  mkdirSync(out, { recursive: true });
  for (const [label, channels] of Object.entries(set.files)) writeFileSync(path.join(out, `${label}.wav`), new Uint8Array(encodeWav(channels, source.sampleRate).bytes));
  writeFileSync(path.join(out, 'key.json'), `${JSON.stringify({ ...meta, ...set.key }, null, 2)}\n`);
  writeFileSync(path.join(out, 'review-sheet.md'), reviewSheet(set.labels, meta));
  console.log(`Wrote ${set.labels.map(([label]) => `${label}.wav`).join(', ')}, review-sheet.md and key.json to ${out}.`);
  if (meta.reference && !meta.reference.checksumVerified) console.log('Note: the reference checksum was not verified; pass --reference-sha256 with the authorized value.');
  if (meta.reference && meta.reference.alignment.correlation < 0.5) console.log(`Warning: the reference correlates weakly with the song (${meta.reference.alignment.correlation.toFixed(2)}); its alignment may be wrong.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => { console.error(error.message); process.exitCode = 1; });
}
