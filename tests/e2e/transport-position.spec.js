import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAudioProbe, startOffsets } from './helpers/audio-probe.js';

// "00:01.2 / 00:02.0" -> 1.2
const elapsed = async timer => {
  const [minutes, seconds] = (await timer.textContent()).split(' / ')[0].split(':');
  return Number(minutes) * 60 + Number(seconds);
};

// LAS-9: the elapsed time shows the engine's position, and the probe shows where each
// AudioBufferSourceNode really started, so pause/resume and stop/restart are checked beyond labels.
test('LAS-9: elapsed time follows the engine through pause, resume, stop and natural end', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const status = transport.getByRole('status');
  const timer = transport.getByRole('timer', { name: 'Playback position' });
  await expect(timer).toHaveText('00:00.0 / 00:00.0');

  await page.getByLabel('Import WAV').setInputFiles({ name: 'two-seconds.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 2 }) });
  await expect(status).toHaveText('Ready');
  await expect(timer).toHaveText('00:00.0 / 00:02.0');

  await transport.getByRole('button', { name: 'Play' }).click();
  await expect(status).toHaveText('Playing');
  await expect.poll(() => elapsed(timer), { message: 'time advances while playing' }).toBeGreaterThanOrEqual(0.5);

  await transport.getByRole('button', { name: 'Pause' }).click();
  await expect(status).toHaveText('Paused');
  const pausedAt = await elapsed(timer);
  // Waiting is the point here: the counter must not move while paused.
  await page.waitForTimeout(400);
  expect(await elapsed(timer), 'time is frozen while paused').toBe(pausedAt);

  // Play resumes where Pause stopped: the new source starts at the paused offset.
  await transport.getByRole('button', { name: 'Play' }).click();
  await expect(status).toHaveText('Playing');
  const resumedFrom = (await startOffsets(page)).at(-1);
  expect(Math.abs(resumedFrom - pausedAt), `resumed from ${resumedFrom}s, display said ${pausedAt}s`).toBeLessThanOrEqual(0.051);
  await expect.poll(() => elapsed(timer), { message: 'time continues after resume' }).toBeGreaterThan(pausedAt);

  // Stop resets to zero and the next Play starts from the beginning.
  await transport.getByRole('button', { name: 'Stop' }).click();
  await expect(status).toHaveText('Stopped');
  await expect(timer).toHaveText('00:00.0 / 00:02.0');
  await transport.getByRole('button', { name: 'Play' }).click();
  await expect(status).toHaveText('Playing');
  expect((await startOffsets(page)).at(-1), 'restart offset after Stop').toBe(0);

  // Natural end returns to Stopped at zero, with Play available again.
  await expect(status).toHaveText('Stopped', { timeout: 5000 });
  await expect(timer).toHaveText('00:00.0 / 00:02.0');
  await expect(transport.getByRole('button', { name: 'Play' })).toBeEnabled();
  expect(await startOffsets(page)).toHaveLength(3);
});
