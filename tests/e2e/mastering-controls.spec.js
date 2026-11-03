import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { renderChain } from '../../src/dsp/chain.js';
import { installAudioProbe, audioSources } from './helpers/audio-probe.js';
import { installChainProbe, lastChainParams, pathGains, analyserPeakHz } from './helpers/chain-probe.js';

// LAS-28 user workflows. Playwright proves the controls drive the real engine and the export; the
// DSP itself is validated numerically (tests/unit/chain.test.js), not by these UI checks.
function studio(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const master = page.getByRole('region', { name: 'Master', exact: true });
  const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
  return {
    status: transport.getByRole('status'),
    timer: transport.getByRole('timer', { name: 'Playback position' }),
    play: transport.getByRole('button', { name: 'Play', exact: true }),
    upload: page.getByLabel('Import WAV'),
    master,
    mixer,
    eq: page.getByRole('dialog', { name: 'EQ' }),
    exportDialog: page.getByRole('dialog', { name: 'Export processed WAV' }),
  };
}

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const arrayBuffer = buffer => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const rms = (samples, from, to) => { let sum = 0; for (let n = from; n < to; n++) sum += samples[n] * samples[n]; return Math.sqrt(sum / (to - from)); };
const seconds = text => { const [m, s] = text.split(' / ')[0].split(':'); return Number(m) * 60 + Number(s); };

async function typeValue(field, value) {
  await field.fill(String(value));
  await field.press('Enter');
}

async function exportAndSave(page, ui, testInfo, name) {
  await ui.master.getByRole('button', { name: 'Export WAV', exact: true }).click();
  await ui.exportDialog.getByRole('button', { name: /^Export( again)?$/ }).click();
  await expect(ui.exportDialog.getByRole('status')).toHaveText('Export ready.', { timeout: 60_000 });
  const download = page.waitForEvent('download');
  await ui.exportDialog.getByRole('link', { name: /^Save / }).click();
  const path = testInfo.outputPath(name);
  await (await download).saveAs(path);
  return path;
}

test('LAS-28: an EQ edit reaches the preview chain and the exported WAV; undo and redo restore it', async ({ page }, testInfo) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  const source = testInfo.outputPath('tone-1k.wav');
  writeFileSync(source, makeWav({ seconds: 4, channels: 2, sampleRate: 44100, frequency: 1000, dbfs: -20 }));
  const before = sha(readFileSync(source));
  await ui.upload.setInputFiles(source);
  await expect(ui.status).toHaveText('Ready');

  await ui.mixer.getByRole('button', { name: 'Edit EQ' }).click();
  await expect(ui.eq).toBeVisible();
  await ui.eq.getByRole('button', { name: 'Band 11', exact: true }).click();
  await ui.eq.getByLabel('Band 11 on').check();
  await typeValue(ui.eq.getByRole('spinbutton', { name: 'Frequency (Hz)' }), 1000);
  await typeValue(ui.eq.getByRole('spinbutton', { name: 'Gain (dB)' }), 6);
  await expect.poll(async () => (await lastChainParams(page))?.eq.left[10]).toEqual({ enabled: true, type: 'bell', frequency: 1000, gain: 6, q: 1 });
  expect((await lastChainParams(page)).eq.right[10].gain).toBe(6); // Link: both channels
  await expect(ui.mixer.getByText('1 band · Link')).toBeVisible();

  // The editor carries its own Undo/Redo (it covers part of the mixer).
  await ui.eq.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect(ui.eq.getByRole('spinbutton', { name: 'Gain (dB)' })).toHaveValue('0.0');
  await expect.poll(async () => (await lastChainParams(page)).eq.left[10].gain).toBe(0);
  await ui.eq.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(async () => (await lastChainParams(page)).eq.left[10].gain).toBe(6);
  await page.keyboard.press('Escape');
  await expect(ui.eq).toBeHidden();
  await expect(ui.mixer.getByRole('button', { name: 'Edit EQ' })).toBeFocused();

  const exported = await exportAndSave(page, ui, testInfo, 'tone-1k-master.wav');
  await expect(ui.exportDialog.getByRole('row', { name: /^Format/ })).toContainText('24-bit PCM WAV, 44,100 Hz, stereo');
  await expect(ui.exportDialog.getByRole('row', { name: /^Length/ })).toContainText('4.000 s (176,400 samples per channel)');
  const output = decodeWav(arrayBuffer(readFileSync(exported)));
  const input = decodeWav(arrayBuffer(readFileSync(source)));
  expect(output).toMatchObject({ sampleRate: 44100, channels: 2, bitsPerSample: 24, frames: input.frames });
  // The +6 dB bell at 1 kHz raises the 1 kHz tone by 6 dB (steady part).
  const gain = 20 * Math.log10(rms(output.samples[0], 44100, 132300) / rms(input.samples[0], 44100, 132300));
  expect(Math.abs(gain - 6)).toBeLessThan(0.05);
  // Sample-for-sample: the export equals the offline chain on the same settings (24-bit rounding).
  const expected = renderChain(await lastChainParams(page), input.samples, 44100).channels;
  let largest = 0;
  for (let c = 0; c < 2; c++) for (let n = 0; n < input.frames; n++) largest = Math.max(largest, Math.abs(output.samples[c][n] - expected[c][n]));
  expect(largest).toBeLessThanOrEqual(0.5 / 8388608 + 1e-9);
  expect(sha(readFileSync(source)), 'source file unchanged').toBe(before);
  testInfo.annotations.push({ type: 'export', description: `1 kHz gain ${gain.toFixed(3)} dB, largest difference to offline render ${largest}` });
});

test('LAS-28: Original/Processed keeps the position and the single source; loudness matching turns the louder one down', async ({ page }, testInfo) => {
  await installAudioProbe(page);
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'quiet.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 20, channels: 2, sampleRate: 44100, frequency: 440, dbfs: -20 }) });
  await expect(ui.status).toHaveText('Ready');
  // +6 dB input gain into the limiter: the processed version is 6 dB louder (no limiting at −14 dBFS).
  await ui.mixer.getByRole('button', { name: 'Edit limiter' }).click();
  await typeValue(page.getByRole('dialog', { name: 'Limiter' }).getByRole('spinbutton', { name: 'Input gain (dB)' }), 6);
  await page.getByRole('dialog', { name: 'Limiter' }).getByRole('button', { name: 'Close Limiter' }).click();
  const matchText = ui.master.locator('.loudness-match p');
  await expect(matchText).toHaveText('Processed is 6.0 dB louder; the processed version plays 6.0 dB lower while comparing.', { timeout: 30_000 });

  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  await expect.poll(() => pathGains(page)).toEqual({ processed: 0.501, original: 0 });
  await expect.poll(async () => seconds(await ui.timer.textContent())).toBeGreaterThan(1);
  const beforeSwitch = seconds(await ui.timer.textContent());
  await ui.master.getByText('Original', { exact: true }).click();
  await expect.poll(() => pathGains(page)).toEqual({ processed: 0, original: 1 });
  await expect.poll(async () => seconds(await ui.timer.textContent())).toBeGreaterThan(beforeSwitch + 0.5);
  await ui.master.getByText('Processed', { exact: true }).click();
  await expect.poll(() => pathGains(page)).toEqual({ processed: 0.501, original: 0 });
  expect(await audioSources(page), 'one source kept playing through every switch').toMatchObject({ started: 1, playing: 1 });

  await ui.master.getByLabel('Match loudness', { exact: true }).uncheck();
  await expect(matchText).toHaveText('Off: both versions play at their own level.');
  await expect.poll(() => pathGains(page)).toEqual({ processed: 1, original: 0 });
  testInfo.annotations.push({ type: 'A/B', description: `switched at ${beforeSwitch.toFixed(1)} s without restarting` });
});

test('LAS-28: export can be cancelled; 16-bit dithered mono export keeps format and length', async ({ page }, testInfo) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'long-mono.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 90, channels: 1, sampleRate: 48000, dbfs: -6 }) });
  await expect(ui.status).toHaveText('Ready');
  await ui.master.getByRole('button', { name: 'Export WAV', exact: true }).click();
  await ui.exportDialog.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(ui.exportDialog.getByRole('progressbar', { name: 'Export progress' })).toBeVisible();
  await ui.exportDialog.getByRole('button', { name: 'Cancel export' }).click();
  await expect(ui.exportDialog.getByRole('status')).toHaveText('Export cancelled.');
  await expect(ui.exportDialog.getByRole('link', { name: /^Save / })).toHaveCount(0);
  await ui.exportDialog.getByText('16-bit PCM + TPDF dither').click();
  await ui.exportDialog.getByRole('button', { name: 'Close export' }).click();
  const path = await exportAndSave(page, ui, testInfo, 'long-mono-master.wav');
  await expect(ui.exportDialog.getByRole('row', { name: /^Dither/ })).toContainText('TPDF ±1 LSB');
  const output = decodeWav(arrayBuffer(readFileSync(path)));
  expect(output).toMatchObject({ sampleRate: 48000, channels: 1, bitsPerSample: 16, frames: 90 * 48000 });
});

test('LAS-28: EQ points follow the pointer and the keyboard; a whole drag is one undo step', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 3, channels: 2, sampleRate: 44100 }) });
  await expect(ui.status).toHaveText('Ready');
  await ui.mixer.getByRole('button', { name: 'Edit EQ' }).click();
  const plot = ui.eq.getByRole('group', { name: /EQ response/ });
  const box = await plot.boundingBox();
  // Double-click in the middle of the plot: band 1 switches on as a bell near the centre.
  await page.mouse.dblclick(box.x + box.width * 0.5, box.y + box.height * 0.3);
  const point = ui.eq.getByRole('button', { name: /^Band 1: Bell/ });
  await expect(point).toBeVisible();
  const added = (await lastChainParams(page)).eq.left[0];
  expect(added).toMatchObject({ enabled: true, type: 'bell' });
  expect(added.gain).toBeGreaterThan(5);
  // Keyboard: → raises the frequency by 1/12 octave, ↑ adds 0.5 dB, Page Up multiplies Q by 1.25.
  await point.focus();
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('PageUp');
  await expect.poll(async () => (await lastChainParams(page)).eq.left[0]).toMatchObject({
    frequency: Math.round(added.frequency * 2 ** (1 / 12)), gain: Math.round((added.gain + 0.5) * 10) / 10, q: 1.25,
  });
  // Drag the point down and to the left: lower frequency and gain. One undo restores the start.
  const start = await point.boundingBox();
  const beforeDrag = (await lastChainParams(page)).eq.left[0];
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 8; step++) await page.mouse.move(start.x + start.width / 2 - step * 15, start.y + start.height / 2 + step * 8);
  await page.mouse.up();
  const dragged = (await lastChainParams(page)).eq.left[0];
  expect(dragged.frequency).toBeLessThan(beforeDrag.frequency);
  expect(dragged.gain).toBeLessThan(beforeDrag.gain);
  await ui.eq.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await lastChainParams(page)).eq.left[0]).toEqual(beforeDrag);
  // Delete switches the band off.
  await ui.eq.getByRole('button', { name: /^Band 1: Bell/ }).focus();
  await page.keyboard.press('Delete');
  await expect.poll(async () => (await lastChainParams(page)).eq.left[0].enabled).toBe(false);
  // Left/Right edit one channel only.
  await ui.eq.getByText('Right', { exact: true }).click();
  await ui.eq.getByRole('button', { name: 'Band 2', exact: true }).click();
  await ui.eq.getByLabel('Band 2 on').check();
  await expect.poll(async () => { const p = await lastChainParams(page); return [p.eq.mode, p.eq.left[1].enabled, p.eq.right[1].enabled]; }).toEqual(['independent', false, true]);
});

test('LAS-28: settings files and snapshots round-trip; an invalid file changes nothing', async ({ page }, testInfo) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.mixer.getByRole('button', { name: 'Edit dynamics' }).click();
  const dynamics = page.getByRole('dialog', { name: 'Dynamics' });
  await dynamics.getByLabel('Compressor on', { exact: true }).check();
  await typeValue(dynamics.getByRole('spinbutton', { name: 'Threshold (dB)' }), -24);
  await dynamics.getByRole('button', { name: 'Close Dynamics' }).click();
  await expect(ui.mixer.getByText('-24 dB · 2:1')).toBeVisible();

  await ui.mixer.getByRole('button', { name: 'Settings…' }).click();
  const settings = page.getByRole('dialog', { name: 'Chain settings' });
  await settings.getByRole('button', { name: 'Save snapshot' }).click();
  const download = page.waitForEvent('download');
  await settings.getByRole('link', { name: 'Download settings (.json)' }).click();
  const saved = JSON.parse(readFileSync(await (await download).path(), 'utf8'));
  expect(saved).toMatchObject({ schema: 'mps-chain', version: 2, compressor: { enabled: true, threshold: -24 }, space: { enabled: false } });

  const invalid = { ...saved, compressor: { ...saved.compressor, ratio: 99 } };
  await settings.getByLabel('Load settings file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(invalid)) });
  await expect(settings.getByRole('alert')).toHaveText('bad.json: Compressor ratio must be between 1 and 20; it is 99. Nothing was changed.');
  const changed = { ...saved, compressor: { ...saved.compressor, threshold: -30, ratio: 4 } };
  writeFileSync(testInfo.outputPath('good.json'), JSON.stringify(changed));
  await settings.getByLabel('Load settings file').setInputFiles(testInfo.outputPath('good.json'));
  await expect(settings.getByRole('status')).toHaveText('Loaded good.json.');
  await expect(ui.mixer.getByText('-30 dB · 4:1')).toBeVisible();
  await settings.getByRole('button', { name: 'Restore' }).click();
  await expect(ui.mixer.getByText('-24 dB · 2:1')).toBeVisible();
});

test('LAS-28: editors and dialogs fit small and regression-size screens', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 2, channels: 2, sampleRate: 44100 }) });
  await expect(ui.status).toHaveText('Ready');
  for (const [width, height] of [[360, 780], [776, 888], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    for (const [button, dialog] of [['Edit EQ', 'EQ'], ['Edit dynamics', 'Dynamics'], ['Edit limiter', 'Limiter']]) {
      await ui.mixer.getByRole('button', { name: button }).click();
      const panel = page.getByRole('dialog', { name: dialog });
      const box = await panel.boundingBox();
      expect(box.x, `${width}x${height} ${dialog}: left edge on screen`).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, `${width}x${height} ${dialog}: right edge on screen`).toBeLessThanOrEqual(width + 0.5);
      expect(box.y, `${width}x${height} ${dialog}: top on screen`).toBeGreaterThanOrEqual(0);
      expect(await panel.evaluate(e => e.scrollWidth <= e.clientWidth + 1), `${width}x${height} ${dialog}: no sideways scrolling inside`).toBe(true);
      await panel.getByRole('button', { name: `Close ${dialog}` }).click();
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth), `${width}x${height}: no horizontal page overflow`).toBeLessThanOrEqual(width);
  }
});

test('LAS-28: the live spectrum measures the audio being played', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'tone-2500.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 10, channels: 2, sampleRate: 44100, frequency: 2500, dbfs: -12 }) });
  await expect(ui.status).toHaveText('Ready');
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  // One analyser bin is 44100 / 4096 ≈ 10.8 Hz wide.
  await expect.poll(() => analyserPeakHz(page)).toBeGreaterThan(2489);
  expect(await analyserPeakHz(page)).toBeLessThan(2511);
});
