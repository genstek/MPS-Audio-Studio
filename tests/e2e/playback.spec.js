import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

test('WAV playback and recovery after a replacement cannot decode', async ({ page }) => {
  await page.goto('/');
  const upload = page.getByLabel('Import WAV');
  await upload.setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.getByRole('heading', { name: 'tone.wav' })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('status')).toHaveText('Playing');
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('status')).toHaveText('Paused');

  // Valid RIFF/WAVE signature with no decodable audio payload.
  await upload.setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('RIFF0000WAVE') });
  await expect(page.getByRole('alert')).toContainText('Unable to decode');
  await expect(page.getByRole('heading', { name: 'tone.wav' })).toBeVisible();
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('status')).toHaveText('Playing');
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('status')).toHaveText('Stopped');

  await upload.setInputFiles({ name: 'replacement.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'replacement.wav' })).toBeVisible();
});
