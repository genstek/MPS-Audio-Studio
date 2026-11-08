import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installChainProbe, lastChainParams } from './helpers/chain-probe.js';

async function load(page, url = '/') {
  await installChainProbe(page);
  await page.goto(url);
  await page.getByLabel('Import WAV', { exact: true }).setInputFiles({
    name: 'tone.wav', mimeType: 'audio/wav',
    buffer: makeWav({ seconds: 2, sampleRate: 48000, channels: 2, frequency: 1000, dbfs: -24 }),
  });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
}

test('LAS-58: default UI has the mode selector, no preview, and no graphic tab', async ({ page }) => {
  await load(page);
  await expect(page.getByRole('combobox', { name: 'Interface mode' })).toHaveValue('normal');
  await expect(page.getByRole('group', { name: 'Processor design preview' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Edit EQ', exact: true }).click();
  const eq = page.getByRole('dialog', { name: 'EQ', exact: true });
  await expect(eq.getByRole('button', { name: 'Graphic', exact: true })).toHaveCount(0);
});

test('LAS-58: Graphic EQ is reachable from the selector without a query flag; mode and skin are DSP no-ops and persist', async ({ page }) => {
  await load(page);
  const before = await lastChainParams(page);
  await page.getByRole('combobox', { name: 'Interface mode' }).selectOption('processors');
  await expect(page.getByRole('group', { name: 'Processor design preview' })).toBeVisible();
  await page.getByRole('button', { name: 'B · Warm console' }).click();
  await page.getByRole('button', { name: 'A · Graphite rack' }).click();
  expect(await lastChainParams(page)).toEqual(before);
  await page.getByRole('button', { name: 'Edit EQ', exact: true }).click();
  const eq = page.getByRole('dialog', { name: 'EQ', exact: true });
  await eq.getByRole('button', { name: 'Graphic', exact: true }).click();
  await expect(eq.getByRole('region', { name: 'Graphic EQ setup' })).toBeVisible();
  expect(await lastChainParams(page)).toEqual(before);
  await eq.getByRole('button', { name: 'Close EQ', exact: true }).click();

  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Interface mode' })).toHaveValue('processors');
  await page.getByRole('combobox', { name: 'Interface mode' }).selectOption('normal');
  await expect(page.getByRole('group', { name: 'Processor design preview' })).toHaveCount(0);
});

test('LAS-58: ?design=processors still opens the preview', async ({ page }) => {
  await load(page, '/?design=processors');
  await expect(page.getByRole('group', { name: 'Processor design preview' })).toBeVisible();
});
