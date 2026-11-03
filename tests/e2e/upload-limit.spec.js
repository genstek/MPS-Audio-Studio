import { mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { writeWavOfSize } from '../fixtures/large-wav.js';

// LAS-71: the per-file limit is 250 MiB = 262,144,000 bytes, inclusive. Real files on disk:
// exactly the limit (a valid 16-bit stereo WAV of 24.8 minutes) is imported, decoded and played;
// one byte more is refused before reading, with the limit in MiB, and the session is unchanged.
const LIMIT = 262_144_000;
let folder;
test.beforeAll(() => { folder = mkdtempSync(join(tmpdir(), 'mps-las71-')); });
test.afterAll(() => rmSync(folder, { recursive: true, force: true }));

test('LAS-71: a WAV of exactly 250 MiB imports and plays; 250 MiB + 1 byte is refused and the track is kept', async ({ page }) => {
  test.setTimeout(180_000);
  const exact = join(folder, 'limit-exact.wav');
  const over = join(folder, 'limit-plus-one.wav');
  writeWavOfSize(exact, LIMIT);
  writeWavOfSize(over, LIMIT, { extra: 1 });
  expect(statSync(exact).size).toBe(LIMIT);
  expect(statSync(over).size).toBe(LIMIT + 1);

  await page.goto('/');
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  await expect(tracks.getByText('WAV up to 250 MiB · Files stay on your device')).toBeVisible();
  await expect(page.getByText(/100 MiB/)).toHaveCount(0);

  const started = Date.now();
  await tracks.getByLabel('Import WAV').setInputFiles(exact);
  await expect(transport.getByRole('status')).toHaveText('Ready', { timeout: 120_000 });
  const loadSeconds = (Date.now() - started) / 1000;
  await expect(tracks.getByRole('heading', { name: 'limit-exact.wav' })).toBeVisible();
  await expect(tracks.getByText(/^1486\.1 seconds · 2 channel\(s\)/)).toBeVisible();
  test.info().annotations.push({ type: 'exact-limit import (262,144,000 bytes)', description: `${loadSeconds.toFixed(1)} s from choosing the file to Ready` });

  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('Playing');
  await expect.poll(() => page.evaluate(() => document.querySelector('[role="timer"]').textContent)).not.toMatch(/^00:00\.0 /);

  // One byte over: refused with the limit, the playing track is untouched.
  await tracks.getByLabel('Import WAV').setInputFiles(over);
  await expect(page.getByRole('alert')).toHaveText('This file is 250.0 MiB. WAV files can be at most 250 MiB (262,144,000 bytes); choose a smaller file.');
  await expect(transport.getByRole('status')).toHaveText('Playing');
  await expect(tracks.getByRole('heading', { name: 'limit-exact.wav' })).toBeVisible();
  await transport.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('Stopped');

  // Retry with a small valid file works after the refusal.
  await tracks.getByLabel('Import WAV').setInputFiles({ name: 'small.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(tracks.getByRole('heading', { name: 'small.wav' })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('LAS-71: stems and local references use the same 250 MiB limit', async ({ page }) => {
  test.setTimeout(60_000);
  const over = join(folder, 'stem-plus-one.wav');
  writeWavOfSize(over, LIMIT, { extra: 1 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Stems…' }).click();
  const stems = page.getByRole('dialog', { name: 'Stem session' });
  await expect(stems.getByText('Each stem WAV up to 250 MiB.', { exact: false })).toBeVisible();
  await stems.getByLabel('Add stem WAVs').setInputFiles(over);
  await expect(stems.getByRole('alert')).toContainText('stem-plus-one.wav: This file is 250.0 MiB. WAV files can be at most 250 MiB (262,144,000 bytes)');
  await expect(stems.getByText('No stems yet.')).toBeVisible();
  await stems.getByRole('button', { name: 'Close stems' }).click();

  // Local reference WAV in the comparison (LAS-31): refused by size before its header is read.
  await page.getByLabel('Import WAV').setInputFiles({ name: 'my-mix.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await page.getByRole('button', { name: 'Compare with a reference', exact: true }).click();
  const compare = page.getByRole('dialog', { name: 'Compare with a reference' });
  await compare.getByLabel('Choose reference WAV').setInputFiles(over);
  await expect(compare.getByRole('alert')).toContainText('WAV files can be at most 250 MiB (262,144,000 bytes)');
});
