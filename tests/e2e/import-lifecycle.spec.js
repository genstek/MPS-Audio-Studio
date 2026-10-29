import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAudioProbe, audioSources } from './helpers/audio-probe.js';

// LAS-8: reimporting, replacing and retrying never leaves a second audio source behind.
// A 30-second tone keeps playing for the whole test, so nothing ends on its own.
test('LAS-8: reimport, failed replacement and retry leave one audio source', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  const upload = page.getByLabel('Import WAV');
  const status = page.getByRole('status');
  const tone = { name: 'long-tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 30 }) };

  await upload.setInputFiles(tone);
  await expect(status).toHaveText('Ready');
  // The picker is cleared after each import, so choosing the same file again is a new change.
  await expect(upload).toHaveValue('');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(status).toHaveText('Playing');
  expect(await audioSources(page)).toEqual({ started: 1, playing: 1, connected: 1 });

  // The same file again while playing: the old source is stopped and disconnected.
  await upload.setInputFiles(tone);
  await expect(status).toHaveText('Ready');
  expect(await audioSources(page)).toEqual({ started: 1, playing: 0, connected: 0 });
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(status).toHaveText('Playing');
  expect(await audioSources(page)).toEqual({ started: 2, playing: 1, connected: 1 });

  // A replacement that cannot be decoded keeps the current track playing on its one source.
  await upload.setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('RIFF0000WAVE') });
  await expect(page.getByRole('alert')).toContainText('Unable to decode');
  await expect(status).toHaveText('Playing');
  await expect(upload).toHaveValue('');
  expect(await audioSources(page)).toEqual({ started: 2, playing: 1, connected: 1 });

  // Retrying with a valid file works and clears the error.
  await upload.setInputFiles({ name: 'retry.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(status).toHaveText('Ready');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'retry.wav' })).toBeVisible();
  expect(await audioSources(page)).toEqual({ started: 2, playing: 0, connected: 0 });
});

test('LAS-8: track information comes from the decoded file', async ({ page }) => {
  await page.goto('/');
  const decodedRate = await page.evaluate(async () => {
    const context = new AudioContext();
    const rate = context.sampleRate;
    await context.close();
    return rate;
  });
  await page.getByLabel('Import WAV').setInputFiles({
    name: 'stereo-48k.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 1.5, channels: 2, sampleRate: 48000 }),
  });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await expect(page.getByText(`1.5 seconds · 2 channel(s) · ${decodedRate.toLocaleString('en-US')} Hz decoded`)).toBeVisible();
});
