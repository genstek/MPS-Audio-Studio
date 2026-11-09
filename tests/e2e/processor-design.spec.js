import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { installChainProbe, lastChainParams } from './helpers/chain-probe.js';

async function openPreview(page) {
  await installChainProbe(page);
  await page.goto('/');
  await page.getByLabel('Import WAV', { exact: true }).setInputFiles({
    name: 'graphic-1k.wav', mimeType: 'audio/wav',
    buffer: makeWav({ seconds: 2, sampleRate: 48000, channels: 2, frequency: 1000, dbfs: -24 }),
  });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
  await page.getByRole('button', { name: 'Edit EQ', exact: true }).click();
  return page.getByRole('dialog', { name: 'EQ', exact: true });
}

test('LAS-75/76: graphic gains reach the engine and WAV export; view and skin changes preserve them', async ({ page }, testInfo) => {
  const eq = await openPreview(page);
  const initial = await lastChainParams(page);
  await eq.getByRole('button', { name: 'Graphic', exact: true }).click();
  expect(await lastChainParams(page)).toEqual(initial);
  await eq.getByRole('button', { name: 'Set up 10 graphic bands' }).click();
  const fader = eq.getByRole('slider', { name: '1000 Hz gain', exact: true });
  await fader.focus();
  for (let i = 0; i < 12; i++) await fader.press('ArrowUp');
  await expect(fader).toHaveAttribute('aria-valuenow', '6');
  await expect.poll(async () => (await lastChainParams(page))?.eq.left[5].gain).toBe(6);
  expect((await lastChainParams(page)).eq.right[5].gain).toBe(6);
  const edited = await lastChainParams(page);
  await eq.getByRole('button', { name: 'B · Warm console' }).click();
  await eq.getByRole('button', { name: 'Parametric', exact: true }).click();
  expect(await lastChainParams(page)).toEqual(edited);
  await eq.getByRole('button', { name: 'Graphic', exact: true }).click();
  await expect(fader).toHaveAttribute('aria-valuenow', '6');

  const presetEvent = page.waitForEvent('download');
  await eq.getByRole('button', { name: 'Save EQ preset', exact: true }).click();
  const preset = await (await presetEvent).path();
  await eq.getByRole('button', { name: 'Reset graphic gains…' }).click();
  await eq.getByRole('button', { name: 'Flatten bands', exact: true }).click();
  await expect(fader).toHaveAttribute('aria-valuenow', '0');
  await eq.getByLabel('Load EQ preset', { exact: true }).setInputFiles(preset);
  await expect(fader).toHaveAttribute('aria-valuenow', '6');
  await expect.poll(() => lastChainParams(page)).toEqual(edited);
  await eq.getByRole('button', { name: 'Close EQ', exact: true }).click();

  const master = page.getByRole('region', { name: 'Master', exact: true });
  await master.getByRole('button', { name: 'Export WAV', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Export processed WAV' });
  await dialog.getByRole('button', { name: 'Export', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Export ready.', { timeout: 60_000 });
  const download = page.waitForEvent('download');
  await dialog.getByRole('link', { name: /^Save / }).click();
  const path = testInfo.outputPath('graphic-plus-6db.wav');
  await (await download).saveAs(path);
  const bytes = readFileSync(path);
  const output = decodeWav(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  const rms = values => Math.sqrt(values.slice(24000, 72000).reduce((sum, sample) => sum + sample * sample, 0) / 48000);
  const input = decodeWav(Uint8Array.from(makeWav({ seconds: 2, sampleRate: 48000, channels: 2, frequency: 1000, dbfs: -24 })).buffer);
  for (let channel = 0; channel < 2; channel++) {
    const gain = 20 * Math.log10(rms(output.samples[channel]) / rms(input.samples[channel]));
    expect(gain).toBeCloseTo(6, 1);
  }
});

test('LAS-160: dragging a graphic fader maps pointer to gain, and thumb, value and chain agree', async ({ page }) => {
  const eq = await openPreview(page);
  await eq.getByRole('button', { name: 'Graphic', exact: true }).click();
  await eq.getByRole('button', { name: 'Set up 10 graphic bands' }).click();
  for (const skin of ['A · Graphite rack', 'B · Warm console']) {
    await eq.getByRole('button', { name: skin }).click();
    const fader = eq.getByRole('slider', { name: '1000 Hz gain', exact: true });
    const thumb = fader.locator('.graphic-fader-thumb');
    await fader.scrollIntoViewIfNeeded();
    await fader.focus();
    const span = 156 - 12;
    for (const gain of [12, 6, 0, -6, -12, 3.5]) {
      const box = await fader.boundingBox();
      const y = box.y + 6 + span * (12 - gain) / 24;
      await page.mouse.move(box.x + 12, box.y + 20);
      await page.mouse.down();
      await page.mouse.move(box.x + 12, y, { steps: 4 });
      await page.mouse.up();
      await expect(fader).toHaveAttribute('aria-valuenow', String(gain));
      await expect(eq.locator('.graphic-band output').nth(5)).toHaveText(`${gain > 0 ? '+' : ''}${gain.toFixed(1)}`);
      // The thumb's physical position must match the value (the WKWebView bug left it at 0 dB).
      const thumbBox = await thumb.boundingBox();
      expect(thumbBox.y + 6 - (box.y + 6 + span * (12 - gain) / 24)).toBeCloseTo(0, 0);
      await expect.poll(async () => (await lastChainParams(page))?.eq.left[5].gain).toBe(gain);
    }
    // Dragging past the ends clamps; keyboard and Home/End work.
    const end = await fader.boundingBox();
    await page.mouse.move(end.x + 12, end.y + 80);
    await page.mouse.down();
    await page.mouse.move(end.x + 12, end.y + end.height + 200, { steps: 4 });
    await page.mouse.up();
    await expect(fader).toHaveAttribute('aria-valuenow', '-12');
    await fader.press('Home');
    await expect(fader).toHaveAttribute('aria-valuenow', '-12');
    await fader.press('End');
    await expect(fader).toHaveAttribute('aria-valuenow', '12');
    await fader.press('PageDown');
    await expect(fader).toHaveAttribute('aria-valuenow', '9');
    await fader.dblclick();
    await expect(fader).toHaveAttribute('aria-valuenow', '0');
  }
});

test('LAS-58: Graphic EQ and layout chooser are reachable with no query flag; parametric editing remains', async ({ page }) => {
  const eq = await openPreview(page);
  await expect(eq.getByRole('group', { name: 'Processor layout' })).toBeVisible();
  await expect(eq.getByRole('button', { name: 'Graphic', exact: true })).toBeVisible();
  await expect(eq.getByLabel('Band 1 on', { exact: true })).toBeVisible();
});

test('LAS-75: incompatible curves are not changed by viewing; explicit setup can be undone', async ({ page }) => {
  const eq = await openPreview(page);
  await eq.getByLabel('Band 1 on', { exact: true }).check();
  const gain = eq.getByRole('spinbutton', { name: 'Gain (dB)', exact: true });
  await gain.fill('3');
  await gain.press('Enter');
  await expect.poll(async () => (await lastChainParams(page))?.eq.left[0].gain).toBe(3);
  const original = await lastChainParams(page);
  await eq.getByRole('button', { name: 'Graphic', exact: true }).click();
  await expect(eq.getByRole('region', { name: 'Graphic EQ setup' })).toBeVisible();
  expect(await lastChainParams(page)).toEqual(original);
  await eq.getByRole('button', { name: 'Set up 10 graphic bands' }).click();
  await expect(eq.getByRole('slider', { name: '31.5 Hz gain', exact: true })).toBeVisible();
  await eq.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => lastChainParams(page)).toEqual(original);
  await expect(eq.getByRole('region', { name: 'Graphic EQ setup' })).toBeVisible();
});

test('LAS-76: both layouts fit narrow screens and retain working Dynamics and Limiter controls', async ({ page }, testInfo) => {
  await openPreview(page);
  await page.getByRole('button', { name: 'Close EQ', exact: true }).click();
  for (const skin of ['A · Graphite rack', 'B · Warm console']) {
    for (const viewport of [{ width: 1440, height: 900 }, { width: 360, height: 780 }]) {
      await page.setViewportSize(viewport);
      for (const [open, title] of [['Edit EQ', 'EQ'], ['Edit dynamics', 'Dynamics'], ['Edit limiter', 'Limiter']]) {
        await page.getByRole('button', { name: open, exact: true }).click();
        const panel = page.getByRole('dialog', { name: title, exact: true });
        await panel.getByRole('button', { name: skin }).click();
        if (title === 'EQ') {
          await panel.getByRole('button', { name: 'Graphic', exact: true }).click();
          const setup = panel.getByRole('button', { name: 'Set up 10 graphic bands' });
          if (await setup.isVisible()) await setup.click();
          await expect(panel.getByRole('slider')).toHaveCount(10);
        } else {
          const name = title === 'Dynamics' ? 'Threshold (dB)' : 'Ceiling (dBTP)';
          const value = title === 'Dynamics' ? -24 : -2;
          const field = panel.getByRole('spinbutton', { name, exact: true });
          await field.fill(String(value));
          await field.press('Enter');
          await expect.poll(async () => title === 'Dynamics' ? (await lastChainParams(page)).compressor.threshold : (await lastChainParams(page)).limiter.ceiling).toBe(value);
        }
        const box = await panel.boundingBox();
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1);
        expect(await panel.evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
        await testInfo.attach(`${skin[0]}-${title}-${viewport.width}.png`, { body: await page.screenshot(), contentType: 'image/png' });
        await panel.getByRole('button', { name: `Close ${title}`, exact: true }).click();
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    }
  }
});
