import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { renderChain, spaceTailSeconds } from '../../src/dsp/chain.js';
import { installChainProbe, lastChainParams, speakersReadings } from './helpers/chain-probe.js';

// LAS-64 Space (reverb). The DSP itself is verified numerically in tests/unit/space.test.js; these
// checks prove the editor drives the real preview chain and the export, and that the reverb is
// measurable in what reaches the speakers.
function studio(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
  return {
    status: transport.getByRole('status'),
    timer: transport.getByRole('timer', { name: 'Playback position' }),
    mixer,
    space: page.getByRole('dialog', { name: 'Space' }),
    strip: mixer.getByRole('region', { name: 'Space channel strip' }),
    openSpace: async () => { await mixer.getByRole('button', { name: 'Edit space' }).focus(); await page.keyboard.press('Enter'); },
  };
}

// One second of a 1 kHz tone, then silence: anything heard in the silence is reverb.
function toneThenSilence() {
  const rate = 44100, frames = rate * 4;
  const wav = makeWav({ seconds: 4, channels: 2, frequency: 1000, dbfs: -12 });
  for (let n = rate; n < frames; n++) { wav.writeInt16LE(0, 44 + n * 4); wav.writeInt16LE(0, 46 + n * 4); }
  return wav;
}

test('LAS-64: the Space editor switches the reverb on, applies presets and values to the running chain, and undo restores them', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 3, channels: 2 }) });
  await expect(ui.status).toHaveText('Ready');
  await expect(ui.strip.getByText('Off', { exact: true })).toBeVisible();
  await ui.openSpace();
  await expect(ui.space).toBeVisible();
  await ui.space.getByLabel('Space on', { exact: true }).check();
  await ui.space.getByRole('combobox', { name: 'Space preset' }).selectOption('Hall');
  await expect.poll(async () => (await lastChainParams(page))?.space).toEqual({ enabled: true, mix: 22, preDelay: 30, decay: 2.6, damping: 35 });
  await expect(ui.strip.getByText('Hall · 22 % · 2.6 s')).toBeVisible();
  const mix = ui.space.getByRole('spinbutton', { name: 'Mix (wet) (%)' });
  await mix.fill('35');
  await mix.press('Enter');
  await expect.poll(async () => (await lastChainParams(page)).space.mix).toBe(35);
  await expect(ui.space.getByRole('combobox', { name: 'Space preset' })).toHaveValue('custom');
  await expect(ui.strip.getByText('Custom · 35 % · 2.6 s')).toBeVisible();
  await ui.space.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await lastChainParams(page)).space.mix).toBe(22);
  await ui.space.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(async () => (await lastChainParams(page)).space.mix).toBe(35);

  // The settings file carries Space (schema v2) and loads back.
  await ui.space.getByRole('button', { name: 'Close Space' }).click();
  await ui.mixer.getByRole('button', { name: 'Settings…' }).click();
  const settings = page.getByRole('dialog', { name: 'Chain settings' });
  const download = page.waitForEvent('download');
  await settings.getByRole('link', { name: 'Download settings (.json)' }).click();
  const saved = JSON.parse(readFileSync(await (await download).path(), 'utf8'));
  expect(saved).toMatchObject({ schema: 'mps-chain', version: 2, order: ['eq', 'compressor', 'space', 'limiter'], space: { enabled: true, mix: 35, preDelay: 30, decay: 2.6, damping: 35 } });
});

test('LAS-64: with Space on, reverb is measurable at the speakers after the tone stops; with Space off the silence stays silent', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await page.getByLabel('Import WAV').setInputFiles({ name: 'tone-then-silence.wav', mimeType: 'audio/wav', buffer: toneThenSilence() });
  await expect(ui.status).toHaveText('Ready');
  // Plays and reads the speakers tap every 20 ms on the audio clock. The measurement window is
  // placed by the signal itself: 0.25–0.8 s after the last reading that still holds the tone, so
  // the result does not depend on when the test process happens to look (the tail falls by tens of
  // dB per second, so a late look would measure a different moment).
  const tailAfterTone = async () => {
    await page.getByRole('button', { name: 'Play', exact: true }).click();
    const readings = await speakersReadings(page, 2.5);
    await page.getByRole('button', { name: 'Stop', exact: true }).click();
    const toneEnd = Math.max(...readings.filter(r => (r.left ?? -200) > -25).map(r => r.time));
    const tail = readings.filter(r => r.time >= toneEnd + 0.25 && r.time <= toneEnd + 0.8);
    expect(Number.isFinite(toneEnd), 'the tone was heard').toBe(true);
    expect(tail.length, 'readings inside the window after the tone').toBeGreaterThan(3);
    const loudest = side => tail.reduce((max, r) => (r[side] === null ? max : Math.max(max ?? -Infinity, r[side])), null);
    return { left: loudest('left'), right: loudest('right'), readings: tail.length };
  };
  const dry = await tailAfterTone();
  expect(dry.left, 'Space off: silence after the tone').toBeNull();
  expect(dry.right, 'Space off: silence after the tone').toBeNull();
  await ui.openSpace();
  await ui.space.getByLabel('Space on', { exact: true }).check();
  await ui.space.getByRole('combobox', { name: 'Space preset' }).selectOption('Hall');
  await expect.poll(async () => (await lastChainParams(page)).space.enabled).toBe(true);
  // Let any tail of the first pass die away before measuring again.
  await page.waitForTimeout(500);
  const wet = await tailAfterTone();
  test.info().annotations.push({ type: 'loudest speakers RMS 0.25–0.8 s after the tone ends', description: `Space off: silence (${dry.readings} readings); Space Hall: L ${wet.left} dBFS, R ${wet.right} dBFS (${wet.readings} readings)` });
  expect(wet.left).toBeGreaterThan(-70);
  expect(wet.right).toBeGreaterThan(-70);
});

test('LAS-64: the export equals the offline chain with Space, with the tail included or cut', async ({ page }, testInfo) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  const source = makeWav({ seconds: 2, channels: 2, frequency: 440, dbfs: -14 });
  await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: source });
  await expect(ui.status).toHaveText('Ready');
  await ui.openSpace();
  await ui.space.getByLabel('Space on', { exact: true }).check();
  await ui.space.getByRole('combobox', { name: 'Space preset' }).selectOption('Room');
  await expect.poll(async () => (await lastChainParams(page)).space.enabled).toBe(true);
  const params = await lastChainParams(page);
  await ui.space.getByRole('button', { name: 'Close Space' }).click();

  const decoded = decodeWav(source.buffer.slice(source.byteOffset, source.byteOffset + source.byteLength));
  const tailFrames = Math.ceil(spaceTailSeconds(params) * decoded.sampleRate);
  const dialog = page.getByRole('dialog', { name: 'Export processed WAV' });
  const exportWith = async (tailChoice, name) => {
    await page.getByRole('button', { name: 'Export WAV', exact: true }).click();
    await dialog.getByRole('radio', { name: tailChoice }).check();
    await dialog.getByRole('button', { name: /^Export( again)?$/ }).click();
    await expect(dialog.getByRole('status')).toHaveText('Export ready.', { timeout: 60_000 });
    const download = page.waitForEvent('download');
    await dialog.getByRole('link', { name: /^Save / }).click();
    const path = testInfo.outputPath(name);
    await (await download).saveAs(path);
    const text = await dialog.getByRole('row', { name: /^Length/ }).textContent();
    await dialog.getByRole('button', { name: 'Close export' }).click();
    const bytes = readFileSync(path);
    return { file: decodeWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), text };
  };
  const compare = (exported, expected) => {
    let worst = 0;
    for (let c = 0; c < 2; c++) for (let n = 0; n < expected[c].length; n++) worst = Math.max(worst, Math.abs(exported[c][n] - expected[c][n]));
    return worst;
  };

  const withTail = await exportWith(/^Include the tail/, 'with-tail.wav');
  expect(withTail.file.frames).toBe(decoded.frames + tailFrames);
  expect(withTail.text).toContain(`${(decoded.frames + tailFrames).toLocaleString('en-US')} samples`);
  const offline = renderChain(params, decoded.samples, decoded.sampleRate, { tailFrames }).channels;
  const errTail = compare(withTail.file.samples, offline);
  expect(errTail, 'export = offline chain within 24-bit rounding').toBeLessThanOrEqual(1 / 2 ** 23 + 1e-9);

  const cut = await exportWith('Cut at the end of the source', 'cut.wav');
  expect(cut.file.frames).toBe(decoded.frames);
  const errCut = compare(cut.file.samples, renderChain(params, decoded.samples, decoded.sampleRate).channels);
  expect(errCut).toBeLessThanOrEqual(1 / 2 ** 23 + 1e-9);
  testInfo.annotations.push({ type: 'export parity (largest difference to the offline chain)', description: `tail included ${errTail.toExponential(2)}, cut ${errCut.toExponential(2)}; tail ${tailFrames} samples` });
});
