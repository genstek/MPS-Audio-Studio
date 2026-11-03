import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAudioProbe, audioSources, startOffsets, mostPlayingAtOnce } from './helpers/audio-probe.js';

const elapsed = async timer => {
  const [minutes, seconds] = (await timer.textContent()).split(' / ')[0].split(':');
  return Number(minutes) * 60 + Number(seconds);
};

async function openWithTrack(page) {
  await installAudioProbe(page);
  await page.goto('/');
  // 30 seconds, so nothing ends on its own during the test.
  await page.getByLabel('Import WAV').setInputFiles({ name: 'long-tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 30 }) });
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  await expect(transport.getByRole('status')).toHaveText('Ready');
  return {
    status: transport.getByRole('status'),
    timer: transport.getByRole('timer', { name: 'Playback position' }),
    play: transport.getByRole('button', { name: 'Play', exact: true }),
    pause: transport.getByRole('button', { name: 'Pause', exact: true }),
    stop: transport.getByRole('button', { name: 'Stop', exact: true }),
  };
}

async function expectResumedAt(page, pausedAt, label) {
  const resumedFrom = (await startOffsets(page)).at(-1);
  expect(Math.abs(resumedFrom - pausedAt), `${label}: resumed from ${resumedFrom}s, display said ${pausedAt}s`).toBeLessThanOrEqual(0.051);
}

test('LAS-11: Pause toggles, and Play also resumes from the paused position', async ({ page }) => {
  const { status, timer, play, pause, stop } = await openWithTrack(page);
  await expect(pause).toBeDisabled();
  await expect(pause).toHaveAttribute('aria-pressed', 'false');

  await play.click();
  await expect(status).toHaveText('Playing');
  await expect.poll(() => elapsed(timer)).toBeGreaterThanOrEqual(0.3);

  // Pause, then Pause again resumes.
  await pause.click();
  await expect(status).toHaveText('Paused');
  await expect(pause).toHaveAttribute('aria-pressed', 'true');
  await expect(pause).toBeEnabled();
  await expect(play).toBeEnabled();
  const firstPause = await elapsed(timer);
  await pause.click();
  await expect(status).toHaveText('Playing');
  await expect(pause).toHaveAttribute('aria-pressed', 'false');
  await expectResumedAt(page, firstPause, 'Pause again');
  expect(await audioSources(page)).toEqual({ started: 2, playing: 1, connected: 1 });
  await expect.poll(() => elapsed(timer)).toBeGreaterThan(firstPause + 0.2);

  // Pause, then Play resumes too.
  await pause.click();
  await expect(status).toHaveText('Paused');
  const secondPause = await elapsed(timer);
  expect(secondPause).toBeGreaterThan(firstPause);
  await play.click();
  await expect(status).toHaveText('Playing');
  await expectResumedAt(page, secondPause, 'Play');
  expect(await audioSources(page)).toEqual({ started: 3, playing: 1, connected: 1 });

  // Stop resets: Pause is no longer pressed or available, and Play starts from 0.
  await stop.click();
  await expect(status).toHaveText('Stopped');
  await expect(pause).toBeDisabled();
  await expect(pause).toHaveAttribute('aria-pressed', 'false');
  expect(await audioSources(page)).toEqual({ started: 3, playing: 0, connected: 0 });
  await play.click();
  await expect(status).toHaveText('Playing');
  expect((await startOffsets(page)).at(-1)).toBe(0);
  expect(await mostPlayingAtOnce(page)).toBe(1);
  await stop.click();
});

test('LAS-11: bursts of transport clicks never play two sources at once', async ({ page }) => {
  const { status, play, stop } = await openWithTrack(page);
  // Clicks fired in one burst, without waiting for the page in between. React re-renders after
  // each click, so disabled buttons absorb most of them; the engine's own start guard is
  // proven by the unit tests. This checks the visible result: one source, matching status.
  const burst = sequence => page.evaluate(names => {
    const button = name => [...document.querySelectorAll('.transport-buttons button')].find(b => b.textContent.includes(name));
    for (const name of names) button(name).click();
  }, sequence);

  await burst(['Play', 'Play', 'Play', 'Pause', 'Play']);
  await expect(status).toHaveText('Playing');
  expect(await audioSources(page)).toEqual({ started: 1, playing: 1, connected: 1 });

  await burst(['Pause', 'Pause', 'Pause', 'Pause']);
  await expect(status).toHaveText(/^(Playing|Paused)$/);
  await burst(['Play', 'Stop', 'Play', 'Pause', 'Stop', 'Play', 'Play']);
  await expect(status).toHaveText(/^(Playing|Paused|Stopped)$/);
  // Whatever the final state, the label matches the engine.
  const final = await status.textContent();
  expect((await audioSources(page)).playing, `status ${final}`).toBe(final === 'Playing' ? 1 : 0);
  expect(await mostPlayingAtOnce(page)).toBe(1);

  await stop.click();
  await expect(status).toHaveText('Stopped');
  await play.click();
  await expect(status).toHaveText('Playing');
  expect((await audioSources(page)).playing).toBe(1);
  await stop.click();
});
