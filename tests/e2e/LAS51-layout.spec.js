import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

const sizes = [
  [1440, 900], [1280, 720], [990, 661], [817, 598], [803, 615],
  [785, 520], [900, 560], [761, 520], [760, 520], [600, 650],
  [759, 598], [762, 598], [785, 520], [990, 661], [1440, 900],
];

async function checkLayout(page, width) {
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('.master-body, .strips').forEach(e => { e.scrollTop = 0; });
  });
  expect(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(width);
  const transport = page.getByRole('region', { name: 'Transport' });
  await expect(transport).toBeInViewport({ ratio: 1 });
  for (const name of ['Play', 'Pause', 'Stop']) {
    await expect(transport.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
  }
  const upload = page.getByRole('button', { name: 'Import WAV', exact: true });
  if (width <= 760) await upload.scrollIntoViewIfNeeded();
  await expect(upload).toBeInViewport({ ratio: 1 });

  // Export must occupy its own row outside the bounded Master scroller.
  const body = page.locator('.master-body');
  const exportButton = page.getByRole('button', { name: 'Export WAV — coming soon' });
  const bodyBox = await body.boundingBox();
  const exportBox = await exportButton.boundingBox();
  expect(bodyBox.y + bodyBox.height).toBeLessThanOrEqual(exportBox.y + 1);
  const levelNote = body.getByText('Level control unavailable');
  await levelNote.scrollIntoViewIfNeeded();
  await expect(levelNote).toBeInViewport({ ratio: 1 });
  const noteBox = await levelNote.boundingBox();
  const buttonBox = await exportButton.boundingBox();
  expect(noteBox.y + noteBox.height).toBeLessThanOrEqual(buttonBox.y + 1);
  await exportButton.scrollIntoViewIfNeeded();
  await expect(exportButton).toBeInViewport({ ratio: 1 });

  // Every Mixer control remains reachable within the strip scroller.
  for (const name of ['Input', 'EQ', 'Dynamics', 'Space']) {
    const control = page.getByRole('button', { name: `${name} processing unavailable` });
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeInViewport({ ratio: 1 });
  }
  if (width > 760) {
    const strips = page.getByRole('group', { name: 'Processing modules' });
    await strips.evaluate(e => { e.scrollTop = 0; });
    await strips.focus();
    await strips.press('Control+End');
    await expect(page.getByRole('button', { name: 'Space processing unavailable' }))
      .toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight))
      .toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
  }
}

for (const loaded of [false, true]) {
  test(`LAS-51: ${loaded ? 'WAV-loaded' : 'empty'} layout survives viewport changes`, async ({ page }, testInfo) => {
    await page.goto('/');
    if (loaded) {
      await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
      await expect(page.getByRole('status')).toHaveText('Ready');
    }
    for (const [width, height] of sizes) {
      await page.setViewportSize({ width, height });
      await checkLayout(page, width);
      await page.screenshot({ path: testInfo.outputPath(`${width}x${height}.png`), fullPage: true });
    }
  });
}
