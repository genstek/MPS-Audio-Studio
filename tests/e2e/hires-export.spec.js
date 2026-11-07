import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

// LAS-127 (Phase 1): sample-rate conversion in Export WAV, through the real worker. The saved
// files are read back with a small independent RIFF parser (not the app's decoder). These checks
// prove format, length and workflow; they do not prove listening quality.
function header(path) {
  const bytes = readFileSync(path);
  return {
    format: bytes.readUInt16LE(20), channels: bytes.readUInt16LE(22), sampleRate: bytes.readUInt32LE(24),
    bits: bytes.readUInt16LE(34), dataBytes: bytes.readUInt32LE(40), size: bytes.length,
  };
}

async function openExport(page, name, buffer) {
  await page.goto('/');
  await page.getByLabel('Import WAV').setInputFiles({ name, mimeType: 'audio/wav', buffer });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
  await page.getByRole('region', { name: 'Master', exact: true }).getByRole('button', { name: 'Export WAV', exact: true }).click();
  return page.getByRole('dialog', { name: 'Export processed WAV' });
}

async function exportAndSave(page, dialog, testInfo, name) {
  await dialog.getByRole('button', { name: /^Export( again)?$/ }).click();
  await expect(dialog.getByRole('status')).toHaveText('Export ready.', { timeout: 60_000 });
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: /^Save / }).click();
  const path = testInfo.outputPath(name);
  await (await download).saveAs(path);
  return path;
}

test('LAS-127: Keep original (default) exports at the source rate, unchanged from LAS-28', async ({ page }, testInfo) => {
  const dialog = await openExport(page, 'tone.wav', makeWav({ seconds: 2, channels: 2, sampleRate: 44100, dbfs: -12 }));
  await expect(dialog.getByRole('radio', { name: 'Keep original' })).toBeChecked();
  const info = header(await exportAndSave(page, dialog, testInfo, 'same.wav'));
  expect(info).toMatchObject({ format: 1, channels: 2, sampleRate: 44100, bits: 24, dataBytes: 88200 * 6 });
  await expect(dialog.getByText('Conversion', { exact: true })).toHaveCount(0);
});

test('LAS-127: the Hi-Res WAV preset writes a real 96 kHz / 24-bit file with the converted length and an upsampling warning', async ({ page }, testInfo) => {
  const dialog = await openExport(page, 'tone.wav', makeWav({ seconds: 2, channels: 2, sampleRate: 44100, dbfs: -12 }));
  await dialog.getByRole('radio', { name: 'Hi-Res WAV (96 kHz / 24-bit)' }).check();
  await expect(dialog.getByRole('radio', { name: '96 kHz', exact: true })).toBeChecked();
  const info = header(await exportAndSave(page, dialog, testInfo, 'hires.wav'));
  expect(info).toMatchObject({ format: 1, channels: 2, sampleRate: 96000, bits: 24, dataBytes: 192000 * 6 });
  expect(info.size).toBe(44 + 192000 * 6);
  await expect(dialog.getByText(/44,100 Hz → 96,000 Hz/)).toBeVisible();
  await expect(dialog.getByText(/Upsampled from 44,100 Hz to 96,000 Hz/)).toBeVisible();
});

test('LAS-127: convert-only downsampling 96 kHz → 48 kHz at 16-bit keeps the duration and warns about removed content', async ({ page }, testInfo) => {
  const dialog = await openExport(page, 'wide.wav', makeWav({ seconds: 2, channels: 1, sampleRate: 96000, dbfs: -12 }));
  await dialog.getByRole('radio', { name: '48 kHz' }).check();
  await dialog.getByRole('radio', { name: 'Convert only (no processing)' }).check();
  await dialog.getByRole('radio', { name: /16-bit PCM/ }).check();
  const info = header(await exportAndSave(page, dialog, testInfo, 'down.wav'));
  expect(info).toMatchObject({ format: 1, channels: 1, sampleRate: 48000, bits: 16, dataBytes: 96000 * 2 });
  await expect(dialog.getByText(/Downsampled to 48,000 Hz/)).toBeVisible();
});

test('LAS-127: cancelling a conversion stops cleanly, offers no stale file, and a new export still works', async ({ page }, testInfo) => {
  const dialog = await openExport(page, 'long.wav', makeWav({ seconds: 60, channels: 2, sampleRate: 44100, dbfs: -12 }));
  await dialog.getByRole('radio', { name: 'Hi-Res WAV (96 kHz / 24-bit)' }).check();
  await dialog.getByRole('button', { name: 'Export', exact: true }).click();
  await dialog.getByRole('button', { name: 'Cancel export' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Export cancelled.');
  await expect(dialog.getByRole('link', { name: /^Save / })).toHaveCount(0);
  await dialog.getByRole('radio', { name: 'Keep original' }).check();
  await dialog.getByRole('radio', { name: 'Convert only (no processing)' }).check();
  const info = header(await exportAndSave(page, dialog, testInfo, 'after-cancel.wav'));
  expect(info.sampleRate).toBe(44100);
});

// Bug #66: a hard-clipped square wave overshoots after band-limited conversion, so the export
// reports clipped samples. Convert only never runs the limiter, so the advice must not name it.
function squareWav({ seconds = 1, sampleRate = 44100 } = {}) {
  const frames = Math.round(sampleRate * seconds);
  const bytes = Buffer.alloc(44 + frames * 2);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(sampleRate, 24); bytes.writeUInt32LE(sampleRate * 2, 28); bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 2, 40);
  for (let i = 0; i < frames; i++) bytes.writeInt16LE(Math.floor(i / 50) % 2 ? -32767 : 32767, 44 + i * 2);
  return bytes;
}

test('LAS-127 #66: Convert only clipping advice does not recommend the inactive limiter', async ({ page }, testInfo) => {
  const dialog = await openExport(page, 'hot.wav', squareWav());
  await dialog.getByRole('radio', { name: '96 kHz', exact: true }).check();
  await dialog.getByRole('radio', { name: 'Convert only (no processing)' }).check();
  await exportAndSave(page, dialog, testInfo, 'hot-convert.wav');
  const row = dialog.getByRole('row', { name: /Clipped samples/ });
  await expect(row).not.toContainText('None');
  await expect(row).toContainText('Convert only does not run the limiter');
  await expect(row).not.toContainText('turn on the limiter');
});

test('LAS-127 #66: with the chain on, the clipping advice still names the limiter', async ({ page }, testInfo) => {
  // The shipped chain has the limiter on, which prevents clipping; switch it off so the chain clips.
  await page.goto('/');
  await page.getByLabel('Import WAV').setInputFiles({ name: 'hot.wav', mimeType: 'audio/wav', buffer: squareWav() });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
  await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: 'Edit limiter' }).focus();
  await page.keyboard.press('Enter');
  const limiter = page.getByRole('dialog', { name: 'Limiter', exact: true });
  await limiter.getByRole('checkbox', { name: 'Limiter on' }).uncheck();
  await page.keyboard.press('Escape');
  await page.getByRole('region', { name: 'Master', exact: true }).getByRole('button', { name: 'Export WAV', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export processed WAV' });
  await dialog.getByRole('radio', { name: '96 kHz', exact: true }).check();
  await exportAndSave(page, dialog, testInfo, 'hot-chain.wav');
  const row = dialog.getByRole('row', { name: /Clipped samples/ });
  await expect(row).toContainText('turn on the limiter or lower the gain');
  await expect(row).not.toContainText('Convert only');
});
