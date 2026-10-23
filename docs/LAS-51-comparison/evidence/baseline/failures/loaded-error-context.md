# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: LAS51-layout.spec.js >> LAS-51: WAV-loaded layout survives viewport changes
- Location: tests/e2e/LAS51-layout.spec.js:60:3

# Error details

```
Error: expect(locator).toBeInViewport() failed

Locator:  locator('.master-body').getByText('Level control unavailable')
Expected: in viewport
Received: viewport ratio 0.9665178656578064
Timeout:  5000ms

Call log:
  - Expect "toBeInViewport" locator('.master-body').getByText('Level control unavailable') with timeout 5000ms
  - waiting for locator('.master-body').getByText('Level control unavailable')
    14 × locator resolved to <p class="fine-print">Level control unavailable</p>
       - unexpected value "viewport ratio 0.9665178656578064"

```

```yaml
- paragraph: Level control unavailable
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import { makeWav } from '../fixtures/wav.js';
  3  |
  4  | const sizes = [
  5  |   [1440, 900], [1280, 720], [990, 661], [817, 598], [803, 615],
  6  |   [785, 520], [900, 560], [761, 520], [760, 520], [600, 650],
  7  |   [759, 598], [762, 598], [785, 520], [990, 661], [1440, 900],
  8  | ];
  9  |
  10 | async function checkLayout(page, width) {
  11 |   await page.evaluate(() => {
  12 |     window.scrollTo(0, 0);
  13 |     document.querySelectorAll('.master-body, .strips').forEach(e => { e.scrollTop = 0; });
  14 |   });
  15 |   expect(await page.evaluate(() => document.documentElement.scrollWidth))
  16 |     .toBeLessThanOrEqual(width);
  17 |   const transport = page.getByRole('region', { name: 'Transport' });
  18 |   await expect(transport).toBeInViewport({ ratio: 1 });
  19 |   for (const name of ['Play', 'Pause', 'Stop']) {
  20 |     await expect(transport.getByRole('button', { name })).toBeInViewport({ ratio: 1 });
  21 |   }
  22 |   const upload = page.getByRole('button', { name: 'Import WAV', exact: true });
  23 |   if (width <= 760) await upload.scrollIntoViewIfNeeded();
  24 |   await expect(upload).toBeInViewport({ ratio: 1 });
  25 |
  26 |   // Export must occupy its own row outside the bounded Master scroller.
  27 |   const body = page.locator('.master-body');
  28 |   const exportButton = page.getByRole('button', { name: 'Export WAV — coming soon' });
  29 |   const bodyBox = await body.boundingBox();
  30 |   const exportBox = await exportButton.boundingBox();
  31 |   expect(bodyBox.y + bodyBox.height).toBeLessThanOrEqual(exportBox.y + 1);
  32 |   const levelNote = body.getByText('Level control unavailable');
  33 |   await levelNote.scrollIntoViewIfNeeded();
> 34 |   await expect(levelNote).toBeInViewport({ ratio: 1 });
     |                           ^ Error: expect(locator).toBeInViewport() failed
  35 |   const noteBox = await levelNote.boundingBox();
  36 |   const buttonBox = await exportButton.boundingBox();
  37 |   expect(noteBox.y + noteBox.height).toBeLessThanOrEqual(buttonBox.y + 1);
  38 |   await exportButton.scrollIntoViewIfNeeded();
  39 |   await expect(exportButton).toBeInViewport({ ratio: 1 });
  40 |
  41 |   // Every Mixer control remains reachable within the strip scroller.
  42 |   for (const name of ['Input', 'EQ', 'Dynamics', 'Space']) {
  43 |     const control = page.getByRole('button', { name: `${name} processing unavailable` });
  44 |     await control.scrollIntoViewIfNeeded();
  45 |     await expect(control).toBeInViewport({ ratio: 1 });
  46 |   }
  47 |   if (width > 760) {
  48 |     const strips = page.getByRole('group', { name: 'Processing modules' });
  49 |     await strips.evaluate(e => { e.scrollTop = 0; });
  50 |     await strips.focus();
  51 |     await strips.press('Control+End');
  52 |     await expect(page.getByRole('button', { name: 'Space processing unavailable' }))
  53 |       .toBeInViewport({ ratio: 1 });
  54 |     expect(await page.evaluate(() => document.documentElement.scrollHeight))
  55 |       .toBeLessThanOrEqual(await page.evaluate(() => innerHeight));
  56 |   }
  57 | }
  58 |
  59 | for (const loaded of [false, true]) {
  60 |   test(`LAS-51: ${loaded ? 'WAV-loaded' : 'empty'} layout survives viewport changes`, async ({ page }, testInfo) => {
  61 |     await page.goto('/');
  62 |     if (loaded) {
  63 |       await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
  64 |       await expect(page.getByRole('status')).toHaveText('Ready');
  65 |     }
  66 |     for (const [width, height] of sizes) {
  67 |       await page.setViewportSize({ width, height });
  68 |       await checkLayout(page, width);
  69 |       await page.screenshot({ path: testInfo.outputPath(`${width}x${height}.png`), fullPage: true });
  70 |     }
  71 |   });
  72 | }
  73 |
```