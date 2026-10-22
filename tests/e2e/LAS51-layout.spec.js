import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

const desktopSizes = [
  [776, 888], [1440, 900], [1280, 720], [990, 661], [989, 610],
  [971, 553], [817, 598], [803, 615], [785, 520], [804, 471],
  [784, 626], [761, 450], [900, 450], [1440, 450], [1100, 575],
  [820, 499], [762, 800], [761, 801], [785, 520], [776, 888], [1440, 900],
];

async function checkDesktopLayout(page, width, height) {
  const check = actual => expect(actual, `Viewport ${width}x${height}, before scrolling`);
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  const master = page.getByRole('region', { name: 'Master', exact: true });
  const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
  const footer = page.locator('footer');
  const essentials = [
    [transport.getByRole('button', { name: 'Play' }), transport],
    [transport.getByRole('button', { name: 'Pause' }), transport],
    [transport.getByRole('button', { name: 'Stop' }), transport],
    [page.getByRole('status'), transport],
    [tracks.getByRole('heading', { name: 'Tracks', exact: true }), tracks],
    [page.getByRole('button', { name: 'Import WAV', exact: true }), tracks],
    [master.getByRole('heading', { name: 'Master', exact: true }), master],
    [master.getByText('Master level', { exact: true }), master],
    [page.getByLabel('Master level', { exact: true }), master],
    [master.getByRole('button', { name: 'Export WAV — coming soon' }), master],
    [mixer.getByRole('heading', { name: 'Mixer', exact: true }), mixer],
    [footer, page.locator('main')],
  ];
  for (const name of ['Input', 'EQ', 'Dynamics', 'Space']) {
    const strip = page.getByRole('region', { name: `${name} channel strip` });
    essentials.push([strip.getByRole('heading', { name, exact: true }), strip]);
    essentials.push([strip.locator('.knob'), strip]);
    essentials.push([strip.getByRole('button', { name: `${name} processing unavailable` }), strip]);
  }
  // Assert every essential before any scroll, focus or click can reveal it.
  for (const [element, panel] of essentials) {
    await check(element).toBeInViewport({ ratio: 1 });
    const rect = await element.boundingBox();
    const bounds = await panel.boundingBox();
    check(rect.x).toBeGreaterThanOrEqual(bounds.x);
    check(rect.y).toBeGreaterThanOrEqual(bounds.y);
    check(rect.x + rect.width).toBeLessThanOrEqual(bounds.x + bounds.width);
    check(rect.y + rect.height).toBeLessThanOrEqual(bounds.y + bounds.height);
    check(await element.evaluate(e => {
      const r = e.getBoundingClientRect();
      const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2);
      return !!hit && (e.contains(hit) || hit.contains(e));
    })).toBe(true);
  }
  const detailsBox = await page.locator('.track-details').boundingBox();
  const importBox = await page.locator('.file-picker').boundingBox();
  check(detailsBox.y + detailsBox.height).toBeLessThanOrEqual(importBox.y);
  const masterDetails = await page.locator('.master-body').boundingBox();
  const masterControls = await page.locator('.master-controls').boundingBox();
  check(masterDetails.y + masterDetails.height).toBeLessThanOrEqual(masterControls.y);
  const geometry = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    x: window.scrollX, y: window.scrollY,
    mixerScroll: document.querySelector('.strips').scrollTop,
    panels: [...document.querySelectorAll('.masthead, .transport, .tracks, .master, .mixer, footer')]
      .map(e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom }; }),
  }));
  check(geometry.width).toBeLessThanOrEqual(width);
  check(geometry.height).toBeLessThanOrEqual(height);
  check([geometry.x, geometry.y, geometry.mixerScroll]).toEqual([0, 0, 0]);
  for (let i = 0; i < geometry.panels.length; i++) {
    for (let j = i + 1; j < geometry.panels.length; j++) {
      const a = geometry.panels[i], b = geometry.panels[j];
      const overlap = Math.min(a.right, b.right) > Math.max(a.x, b.x)
        && Math.min(a.bottom, b.bottom) > Math.max(a.y, b.y);
      check(overlap).toBe(false);
    }
  }
  await check(page.getByLabel('Master level')).toBeDisabled();
  await check(master.getByRole('button')).toBeDisabled();
  for (const control of await mixer.getByRole('button').all()) await check(control).toBeDisabled();
}

async function prepareState(page, state) {
  if (state === 'empty') return;
  const name = state === 'long-filename'
    ? `${'Long recording name with detailed session notes '.repeat(4)}.wav` : 'tone.wav';
  await page.getByLabel('Import WAV').setInputFiles({ name, mimeType: 'audio/wav', buffer: makeWav() });
  await expect(page.getByRole('status')).toHaveText('Ready');
  if (state === 'load-error') {
    await page.getByLabel('Import WAV').setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('RIFF0000WAVE') });
    await expect(page.getByRole('alert')).toContainText('Unable to decode');
  }
}

for (const state of ['empty', 'WAV-loaded', 'long-filename', 'load-error']) {
  test(`LAS-51: ${state} essentials stay visible before scrolling`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width: 776, height: 888 });
    await page.goto('/');
    await prepareState(page, state);
    for (const [width, height] of desktopSizes) {
      await test.step(`Viewport ${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await page.screenshot({ path: testInfo.outputPath(`${width}x${height}.png`) });
        await checkDesktopLayout(page, width, height);
      });
    }
    // Cross both layout breakpoints, then return to desktop without reloading.
    for (const width of [760, 600, 759, 761, 776]) {
      await test.step(`Breakpoint ${width}x888`, async () => {
        await page.setViewportSize({ width, height: 888 });
        if (width >= 761) await checkDesktopLayout(page, width, 888);
        else {
          const tracks = await page.locator('.tracks').boundingBox();
          const master = await page.locator('.master').boundingBox();
          expect(master.y).toBeGreaterThanOrEqual(tracks.y + tracks.height);
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
          await page.locator('footer').scrollIntoViewIfNeeded();
          await expect(page.locator('footer')).toBeInViewport({ ratio: 1 });
        }
      });
    }
  });
}

test('LAS-51: taller text metrics preserve immediate desktop visibility', async ({ page }) => {
  await page.setViewportSize({ width: 776, height: 888 });
  await page.goto('/');
  await page.addStyleTag({ content: ':root { line-height: 1.3; }' });
  for (const [width, height] of desktopSizes) {
    await test.step(`Viewport ${width}x${height}`, async () => {
      await page.setViewportSize({ width, height });
      await checkDesktopLayout(page, width, height);
    });
  }
});
