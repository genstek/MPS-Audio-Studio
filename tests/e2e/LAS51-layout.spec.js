import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

const sizes = [
  [1440, 900], [1280, 720], [990, 661], [817, 598], [803, 615],
  [785, 520], [900, 560], [761, 520], [760, 520], [600, 650],
  [759, 598], [762, 598], [785, 520], [990, 661], [1440, 900],
];

async function checkLayout(page, width, height) {
  const expectAtViewport = actual => expect(actual, `Viewport ${width}x${height}`);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelectorAll('.master-body, .strips').forEach(e => { e.scrollTop = 0; });
  });
  expectAtViewport(await page.evaluate(() => document.documentElement.scrollWidth))
    .toBeLessThanOrEqual(width);
  const transport = page.getByRole('region', { name: 'Transport' });
  await expectAtViewport(transport).toBeInViewport({ ratio: 1 });
  for (const name of ['Play', 'Pause', 'Stop']) {
    await expectAtViewport(transport.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
  }
  const upload = page.getByRole('button', { name: 'Import WAV', exact: true });
  if (width <= 760) await upload.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expectAtViewport(upload).toBeInViewport({ ratio: 1 });

  // Export must occupy its own row outside the bounded Master scroller.
  const body = page.locator('.master-body');
  const exportButton = page.getByRole('button', { name: 'Export WAV — coming soon' });
  const bodyBox = await body.boundingBox();
  const exportBox = await exportButton.boundingBox();
  expectAtViewport(bodyBox.y + bodyBox.height).toBeLessThanOrEqual(exportBox.y + 1);
  const levelNote = body.getByText('Level control unavailable');
  await levelNote.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expectAtViewport(levelNote).toBeInViewport({ ratio: 1 });
  const noteBox = await levelNote.boundingBox();
  const buttonBox = await exportButton.boundingBox();
  expectAtViewport(noteBox.y + noteBox.height).toBeLessThanOrEqual(buttonBox.y + 1);
  await exportButton.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'nearest' }));
  await expectAtViewport(exportButton).toBeInViewport({ ratio: 1 });

  // Every Mixer control remains reachable within the strip scroller.
  for (const name of ['Input', 'EQ', 'Dynamics', 'Space']) {
    const control = page.getByRole('button', { name: `${name} processing unavailable` });
    await control.evaluate(e => e.scrollIntoView({ block: 'center', inline: 'nearest' }));
    await expectAtViewport(control).toBeInViewport({ ratio: 1 });
  }
  if (width > 760) {
    const strips = page.getByRole('group', { name: 'Processing modules' });
    const viewportBox = await strips.boundingBox();
    const controlBox = await strips.getByRole('button').first().boundingBox();
    expectAtViewport(viewportBox.height).toBeGreaterThanOrEqual(controlBox.height);
    await strips.evaluate(e => { e.scrollTop = 0; });
    await strips.focus();
    const scrollToEnd = process.platform === 'darwin' ? 'Meta+ArrowDown' : 'Control+End';
    await strips.press(scrollToEnd);
    await expectAtViewport(page.getByRole('button', { name: 'Space processing unavailable' }))
      .toBeInViewport({ ratio: 1 });
    expectAtViewport(await page.evaluate(() => document.documentElement.scrollHeight))
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
      await test.step(`Viewport ${width}x${height}`, async () => checkLayout(page, width, height));
      await page.screenshot({ path: testInfo.outputPath(`${width}x${height}.png`), fullPage: true });
    }
  });
}

test('LAS-51: Mixer controls fit with taller text metrics', async ({ page }) => {
  await page.goto('/');
  // Exercise line boxes taller than the Linux default without depending on a platform font.
  await page.addStyleTag({ content: ':root { line-height: 1.3; }' });
  for (const [width, height] of sizes) {
    await page.setViewportSize({ width, height });
    await test.step(`Viewport ${width}x${height}`, async () => checkLayout(page, width, height));
  }
});
