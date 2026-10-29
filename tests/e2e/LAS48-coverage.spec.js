import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { checkLayout } from './helpers/layout.js';
import { installAudioProbe, audioSources, startOffsets } from './helpers/audio-probe.js';

// LAS-48 coverage that LAS-51 does not already give: the proposed QA matrix, zoom-equivalent
// sizes at higher device pixel ratios, playback/pause/stop state across resizes and keyboard focus.

// LAS-48 AC-07 proposed matrix, visited on one page in both directions.
const MATRIX = [[1920, 1080], [1440, 900], [1280, 720], [1024, 768], [768, 1024], [390, 844]];
const ROUND_TRIP = [...MATRIX, ...MATRIX.slice(0, -1).reverse()];

const elapsed = async timer => {
  const [minutes, seconds] = (await timer.textContent()).split(' / ')[0].split(':');
  return Number(minutes) * 60 + Number(seconds);
};

for (const loaded of [false, true]) {
  const state = loaded ? 'WAV-loaded' : 'empty';
  test(`LAS48-TC-001..004, 007: proposed QA matrix, ${state}`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    if (loaded) {
      await page.getByLabel('Import WAV').setInputFiles({ name: 'WAV-A.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 90, channels: 2, sampleRate: 48000 }) });
      await expect(page.getByRole('status')).toHaveText('Ready');
    }
    for (const [width, height] of ROUND_TRIP) {
      await test.step(`${state} ${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await checkLayout(page, `${state} ${width}x${height}`);
      });
    }
    if (loaded) await expect(page.getByRole('heading', { name: 'WAV-A.wav' })).toBeVisible();
  });
}

// The exact LAS-49 sequences for width-only (TC-003) and height-only (TC-004) resizing.
const SEQUENCES = {
  'LAS48-TC-003: width-only resize at height 900': [1920, 1440, 1280, 1024, 800, 768, 390, 1920].map(width => [width, 900]),
  'LAS48-TC-004: height-only resize at width 1280, then 1024x768 and 800x600': [[1280, 900], [1280, 720], [1280, 600], [1280, 900], [1024, 768], [800, 600]],
};
for (const [name, sizes] of Object.entries(SEQUENCES)) {
  test(name, async ({ page }) => {
    await page.setViewportSize({ width: sizes[0][0], height: sizes[0][1] });
    await page.goto('/');
    await page.getByLabel('Import WAV').setInputFiles({ name: 'WAV-A.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 90, channels: 2, sampleRate: 48000 }) });
    await expect(page.getByRole('status')).toHaveText('Ready');
    for (const [width, height] of sizes) {
      await test.step(`${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await checkLayout(page, `${width}x${height}`);
      });
    }
    // Same track, same state: nothing was reloaded or re-imported.
    await expect(page.getByRole('heading', { name: 'WAV-A.wav' })).toBeVisible();
    await expect(page.getByRole('status')).toHaveText('Ready');
  });
}

// Browser zoom shrinks the CSS viewport and raises the device pixel ratio. These sizes are what
// 125% and 200% zoom give in 1280x720, 1440x900 and 1920x1080 windows. This is emulation;
// real browser zoom is a manual check (LAS48-TC-010).
const ZOOMS = [
  { zoom: '125%', deviceScaleFactor: 1.25, sizes: [[1024, 576], [1152, 720], [1536, 864]] },
  { zoom: '200%', deviceScaleFactor: 2, sizes: [[640, 360], [720, 450], [960, 540]] },
];
for (const { zoom, deviceScaleFactor, sizes } of ZOOMS) {
  test.describe(`zoom-equivalent ${zoom}`, () => {
    test.use({ deviceScaleFactor });
    test(`LAS48-TC-010/021 (emulated): layout at ${zoom} zoom-equivalent sizes, DPR ${deviceScaleFactor}`, async ({ page }) => {
      await page.setViewportSize({ width: sizes[0][0], height: sizes[0][1] });
      await page.goto('/');
      expect(await page.evaluate(() => window.devicePixelRatio)).toBe(deviceScaleFactor);
      await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
      await expect(page.getByRole('status')).toHaveText('Ready');
      for (const [width, height] of sizes) {
        await test.step(`${zoom} ${width}x${height}`, async () => {
          await page.setViewportSize({ width, height });
          await checkLayout(page, `${zoom} ${width}x${height}`);
        });
      }
    });
  });
}

test('LAS48-TC-012/013/014: playback, paused position and stop survive resizing', async ({ page }) => {
  await installAudioProbe(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const status = transport.getByRole('status');
  const timer = transport.getByRole('timer', { name: 'Playback position' });
  await page.getByLabel('Import WAV').setInputFiles({ name: 'long-tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 90 }) });
  await expect(status).toHaveText('Ready');
  await transport.getByRole('button', { name: 'Play' }).click();
  await expect(status).toHaveText('Playing');

  // Playing: the position keeps advancing through every resize and the source is never restarted.
  let last = 0;
  for (const [width, height] of [[1280, 720], [785, 520], [600, 650], [390, 844], [1024, 768], [1920, 1080]]) {
    await page.setViewportSize({ width, height });
    await expect(status, `playing at ${width}x${height}`).toHaveText('Playing');
    await expect.poll(() => elapsed(timer), { message: `advancing at ${width}x${height}` }).toBeGreaterThan(last);
    last = await elapsed(timer);
  }
  expect(await audioSources(page), 'one source, never restarted').toEqual({ started: 1, playing: 1, connected: 1 });

  // Paused: the position does not move while the window changes, and Play resumes from it.
  await transport.getByRole('button', { name: 'Pause' }).click();
  await expect(status).toHaveText('Paused');
  const pausedAt = await elapsed(timer);
  for (const [width, height] of [[1280, 720], [600, 650], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await expect(status).toHaveText('Paused');
    expect(await elapsed(timer), `paused position at ${width}x${height}`).toBe(pausedAt);
  }
  await transport.getByRole('button', { name: 'Play' }).click();
  await expect(status).toHaveText('Playing');
  expect(Math.abs((await startOffsets(page)).at(-1) - pausedAt)).toBeLessThanOrEqual(0.051);

  // Stopped: stays stopped at zero with the established button rules.
  await transport.getByRole('button', { name: 'Stop' }).click();
  for (const [width, height] of [[785, 520], [390, 844], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    await expect(status).toHaveText('Stopped');
    await expect(timer).toHaveText('00:00.0 / 01:30.0');
    await expect(transport.getByRole('button', { name: 'Play' })).toBeEnabled();
    await expect(transport.getByRole('button', { name: 'Pause' })).toBeDisabled();
  }
  expect((await audioSources(page)).playing).toBe(0);
  await expect(page.getByRole('heading', { name: 'long-tone.wav' })).toBeVisible();
});

test('LAS48-TC-011: keyboard focus stays visible on its control across resizes', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(page.getByRole('status')).toHaveText('Ready');
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  await transport.getByRole('button', { name: 'Play' }).focus();
  await page.keyboard.press('Tab'); // Pause is disabled in Ready, so Tab goes to Stop.
  const stop = transport.getByRole('button', { name: 'Stop' });
  for (const [width, height] of [[1280, 720], [761, 450], [760, 520], [390, 844], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await expect(stop, `focused at ${width}x${height}`).toBeFocused();
    const ring = await stop.evaluate(e => ({ visible: e.matches(':focus-visible'), outline: getComputedStyle(e).outlineStyle }));
    expect(ring, `focus ring at ${width}x${height}`).toEqual({ visible: true, outline: 'solid' });
    await expect(stop, `focused control on screen at ${width}x${height}`).toBeInViewport({ ratio: 1 });
  }
  await page.keyboard.press('Enter');
  await expect(page.getByRole('status')).toHaveText('Stopped');
});
