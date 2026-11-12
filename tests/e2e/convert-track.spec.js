import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

// LAS-127 (Phase 2): track-level Convert dialog through the real worker. Saved files are read back
// with an independent RIFF header parse. Proves format, length and workflow, not listening quality.
function header(path) {
  const b = readFileSync(path);
  return { format: b.readUInt16LE(20), channels: b.readUInt16LE(22), sampleRate: b.readUInt32LE(24), bits: b.readUInt16LE(34), dataBytes: b.readUInt32LE(40), size: b.length };
}

async function openConvert(page, name, buffer) {
  await page.goto('/');
  await page.getByLabel('Import WAV').setInputFiles({ name, mimeType: 'audio/wav', buffer });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
  await page.getByRole('button', { name: 'Convert', exact: true }).click();
  return page.getByRole('dialog', { name: 'Convert / Resample track' });
}

test('LAS-127: Convert shows the real source format and predicted target, then writes a real 96 kHz / 24-bit file', async ({ page }, testInfo) => {
  const dialog = await openConvert(page, 'tone.wav', makeWav({ seconds: 2, channels: 2, sampleRate: 44100, dbfs: -12 }));
  await expect(dialog.getByText(/16-bit PCM WAV, 44,100 Hz, 2 ch, 88,200 samples per channel/)).toBeVisible();
  await expect(dialog.getByText(/24-bit PCM WAV, 96,000 Hz, 192,000 samples per channel/)).toBeVisible();
  await dialog.getByRole('button', { name: 'Convert', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Conversion ready.', { timeout: 60_000 });
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: /^Save / }).click();
  const path = testInfo.outputPath('out.wav');
  await (await download).saveAs(path);
  expect(header(path)).toMatchObject({ format: 1, channels: 2, sampleRate: 96000, bits: 24, dataBytes: 192000 * 6, size: 44 + 192000 * 6 });
});

test('LAS-127: Convert downsamples 96 kHz mono to 44.1 kHz / 16-bit and a settings change discards the stale file', async ({ page }, testInfo) => {
  const dialog = await openConvert(page, 'wide.wav', makeWav({ seconds: 2, channels: 1, sampleRate: 96000, dbfs: -12 }));
  await dialog.getByRole('radio', { name: '44.1 kHz' }).check();
  await dialog.getByRole('radio', { name: /16-bit PCM/ }).check();
  await dialog.getByRole('button', { name: 'Convert', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Conversion ready.', { timeout: 60_000 });
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: /^Save / }).click();
  const path = testInfo.outputPath('down.wav');
  await (await download).saveAs(path);
  expect(header(path)).toMatchObject({ format: 1, channels: 1, sampleRate: 44100, bits: 16, dataBytes: 88200 * 2 });
  await dialog.getByRole('radio', { name: '48 kHz' }).check();
  await expect(dialog.getByRole('link', { name: /^Save / })).toHaveCount(0);
});
