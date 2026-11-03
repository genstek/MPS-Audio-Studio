import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { test, expect } from '@playwright/test';
import { defaultChain, editBand, serializeChain, validateChain } from '../../src/dsp/chain-params.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { bypassChain, renderStemMix } from '../../src/dsp/stem-render.js';
import { makeWav } from '../fixtures/wav.js';

// LAS-35. Proves that a stem's own chain changes only that stem, that live playback and the offline
// render are the same mix (latency compensated), and that the rendered files and session recall are
// exact. These are signal checks, not a listening review.
const RATE = 44100;
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const arrayBuffer = b => b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
function vocalChain() {
  const params = editBand(defaultChain(), 'left', 10, { enabled: true, type: 'bell', frequency: 880, gain: 6, q: 1 });
  return validateChain({ ...params, limiter: { ...params.limiter, enabled: false } });
}

test('LAS-35: live stem playback through per-stem chains equals the offline render (latency compensated)', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async ({ vocal, master, rate }) => {
    const { createStemSession } = await import('/src/stem-session.js');
    const { createChainNode } = await import('/src/dsp/chain-node.js');
    const { createOutputStage } = await import('/src/output-stage.js');
    const { renderStemMix, bypassChain } = await import('/src/dsp/stem-render.js');
    const seconds = 1.5;
    const context = new OfflineAudioContext({ numberOfChannels: 2, length: rate * seconds, sampleRate: rate });
    const output = await createOutputStage(context, 2, master);
    output.setListening('processed', { processedDb: 0, originalDb: 0 });
    const session = createStemSession(context, output);
    // Deterministic programme-like stems: a stereo chord, a mono bass and a mono voice-like tone.
    const make = (channels, fn, length = rate) => {
      const data = Array.from({ length: channels }, (_, c) => Float32Array.from({ length }, (_, n) => fn(n, c)));
      const buffer = new AudioBuffer({ numberOfChannels: channels, length, sampleRate: rate });
      data.forEach((d, c) => buffer.copyToChannel(d, c));
      return { buffer, data };
    };
    const stems = [
      { name: 'keys', ...make(2, (n, c) => 0.2 * Math.sin(2 * Math.PI * (c ? 330 : 262) * n / rate)), params: bypassChain(), gainDb: -3, pan: 0.3, offset: 0 },
      { name: 'bass', ...make(1, n => 0.3 * Math.sin(2 * Math.PI * 55 * n / rate)), params: bypassChain(), gainDb: 0, pan: -0.4, offset: 0.1 },
      { name: 'vocal', ...make(1, n => 0.15 * Math.sin(2 * Math.PI * 880 * n / rate) * (n % 4410 < 2205 ? 1 : 0.3), Math.round(rate * 0.8)), params: vocal, gainDb: 2, pan: 0, offset: 0.25 },
    ];
    for (const stem of stems) {
      const chain = await createChainNode(context, stem.params, stem.data.length);
      const id = session.add(stem.buffer, { name: stem.name, sampleRate: rate, channels: stem.data.length, params: stem.params }, chain);
      session.setGain(id, stem.gainDb);
      session.setPan(id, stem.pan);
      session.setOffset(id, stem.offset);
    }
    session.play();
    const live = await context.startRendering();
    const offline = renderStemMix({ stems: stems.map(s => ({ name: s.name, sampleRate: rate, channels: s.data, offsetFrames: Math.round(s.offset * rate), gainDb: s.gainDb, pan: s.pan, mute: false, solo: false, params: s.params })), master });
    // Live output = offline mix delayed by the start lead and two chain latencies (stem + master).
    const latency = output.latency;
    const delay = Math.round(0.05 * rate) + 2 * latency;
    let largest = 0, energy = 0;
    for (let c = 0; c < 2; c++) {
      const l = live.getChannelData(c);
      for (let n = 0; n < offline.frames && n + delay < l.length; n++) {
        largest = Math.max(largest, Math.abs(l[n + delay] - offline.combined[c][n]));
        energy = Math.max(energy, Math.abs(offline.combined[c][n]));
      }
    }
    return { largest, energy, latency, frames: offline.frames };
  }, { vocal: vocalChain(), master: defaultChain(), rate: RATE });
  test.info().annotations.push({ type: 'parity', description: `largest live/offline difference ${result.largest.toExponential(2)} over ${result.frames} frames (mix peak ${result.energy.toFixed(3)})` });
  expect(result.energy).toBeGreaterThan(0.1); // a real mix was compared
  expect(result.latency).toBe(77);
  expect(result.largest).toBeLessThan(1e-4);
});

test('LAS-35: per-stem chains, stem master render, exact downloads, session recall and refusal of mixed rates', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  await page.goto('/');
  const files = {
    drums: makeWav({ seconds: 4, channels: 2, sampleRate: RATE, frequency: 110, dbfs: -12 }),
    bass: makeWav({ seconds: 4, channels: 1, sampleRate: RATE, frequency: 55, dbfs: -12 }),
    vocal: makeWav({ seconds: 3, channels: 1, sampleRate: RATE, frequency: 880, dbfs: -18 }),
  };
  await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: 'Stems…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Stem session' });
  await dialog.getByLabel('Add stem WAVs').setInputFiles(Object.entries(files).map(([name, buffer]) => ({ name: `${name}.wav`, mimeType: 'audio/wav', buffer })));
  await expect(dialog.getByRole('status')).toHaveText('3 stems · 0:04.0');
  const strip = name => dialog.getByRole('listitem', { name: `Stem ${name}.wav` });
  await strip('vocal').getByLabel('Load settings for vocal.wav').setInputFiles({ name: 'vocal-eq.json', mimeType: 'application/json', buffer: Buffer.from(serializeChain(vocalChain())) });
  await expect(strip('vocal')).toContainText('Chain: from vocal-eq.json');
  await strip('drums').getByRole('button', { name: 'Use master settings on drums.wav' }).click();
  await expect(strip('drums')).toContainText('Chain: copy of master settings');
  await expect(strip('bass')).toContainText('Chain: bypass');
  await strip('bass').getByRole('button', { name: 'Mute' }).click();

  // Render: the master and each audible stem, at the files' own rate.
  await dialog.getByRole('button', { name: 'Render stem master' }).click();
  await expect(dialog.getByText(/^Rendered 3 files; muted or not soloed, so not rendered: bass\.wav\.$/)).toBeVisible({ timeout: 60_000 });
  const table = dialog.getByRole('table');
  await expect(table.getByRole('row', { name: /^stem-master\.wav/ })).toContainText('4.000 s · 176,400 samples');
  await expect(table.getByRole('row', { name: /^stem-master\.wav/ })).toContainText('44,100 Hz · 2 ch · 24-bit');
  for (const [width, height] of [[360, 780], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}px: no horizontal page scroll`).toBe(true);
    await table.scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`stem-render-${width}x${height}.png`) });
  }
  const save = async name => {
    const downloading = page.waitForEvent('download');
    await table.getByRole('button', { name: `Save ${name}` }).click();
    const file = await downloading;
    await file.saveAs(testInfo.outputPath(name));
    const bytes = readFileSync(testInfo.outputPath(name));
    return decodeWav(arrayBuffer(bytes));
  };
  const master = await save('stem-master.wav');
  const vocalStem = await save('vocal-stem.wav');
  // The same mix computed here from the same file bytes.
  const decoded = name => decodeWav(arrayBuffer(files[name]));
  const expected = renderStemMix({
    stems: [
      { name: 'drums.wav', sampleRate: RATE, channels: decoded('drums').samples, offsetFrames: 0, gainDb: 0, pan: 0, mute: false, solo: false, params: defaultChain() },
      { name: 'bass.wav', sampleRate: RATE, channels: decoded('bass').samples, offsetFrames: 0, gainDb: 0, pan: 0, mute: true, solo: false, params: bypassChain() },
      { name: 'vocal.wav', sampleRate: RATE, channels: decoded('vocal').samples, offsetFrames: 0, gainDb: 0, pan: 0, mute: false, solo: false, params: vocalChain() },
    ],
    master: defaultChain(),
  });
  const largestDifference = (a, b) => { let m = 0; for (let c = 0; c < 2; c++) for (let n = 0; n < b[c].length; n++) m = Math.max(m, Math.abs(a[c][n] - b[c][n])); return m; };
  expect(master).toMatchObject({ sampleRate: RATE, channels: 2, frames: 176400 });
  expect(largestDifference(master.samples, expected.combined)).toBeLessThan(1e-6); // 24-bit rounding only
  expect(vocalStem.frames).toBe(176400); // per-stem files are session-long
  expect(largestDifference(vocalStem.samples, expected.strips.find(s => s.name === 'vocal.wav').channels)).toBeLessThan(1e-6);
  testInfo.annotations.push({ type: 'render', description: `master vs Node render ${largestDifference(master.samples, expected.combined).toExponential(2)}; vocal stem ${largestDifference(vocalStem.samples, expected.strips[1].channels).toExponential(2)}` });

  // Session recall: settings only, matched by the files' checksums (so the stems were read unchanged).
  const downloadingSession = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Save session file' }).click();
  const sessionFile = await downloadingSession;
  await sessionFile.saveAs(testInfo.outputPath('session.json'));
  const sessionText = readFileSync(testInfo.outputPath('session.json'), 'utf8');
  const session = JSON.parse(sessionText);
  expect(session.stems.map(s => s.sha256)).toEqual(['drums', 'bass', 'vocal'].map(name => sha(files[name])));
  expect(session.stems.map(s => s.chainLabel)).toEqual(['copy of master settings', 'bypass', 'from vocal-eq.json']);
  expect(sessionText.length).toBeLessThan(64 * 1024);
  await strip('drums').getByLabel('Gain (dB)').fill('-6');
  await strip('bass').getByRole('button', { name: 'Mute' }).click();
  await strip('vocal').getByRole('button', { name: 'Bypass the chain of vocal.wav' }).click();
  await dialog.getByLabel('Load stem session file').setInputFiles(testInfo.outputPath('session.json'));
  await expect(dialog.getByText('Recalled 3 of 3 stems and the master chain.')).toBeVisible();
  await expect(strip('drums').getByLabel('Gain (dB)')).toHaveValue('0');
  await expect(strip('bass').getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'true');
  await expect(strip('vocal')).toContainText('Chain: from vocal-eq.json');

  // Mixed sample rates: playback resamples, rendering refuses with the reason.
  await dialog.getByLabel('Add stem WAVs').setInputFiles({ name: 'pad.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 2, channels: 2, sampleRate: 48000 }) });
  await expect(dialog.getByRole('status')).toHaveText('4 stems · 0:04.0');
  await dialog.getByRole('button', { name: 'Render stem master' }).click();
  await expect(dialog.getByRole('alert')).toHaveText(/^Rendering needs one sample rate for all stems; these have 44100 Hz and 48000 Hz\./);
  await strip('pad').getByRole('button', { name: 'Remove pad.wav' }).click();
  await expect(dialog.getByRole('status')).toHaveText('3 stems · 0:04.0');
});
