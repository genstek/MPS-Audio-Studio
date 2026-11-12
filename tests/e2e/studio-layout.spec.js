import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAudioProbe, audioSources } from './helpers/audio-probe.js';

// LAS-45 Stage 1: five switchable studio layouts over one shared state. Screenshots prove layout
// composition only, never audio fidelity.
const LAYOUTS = [
  ['classic', 'Classic'],
  ['a', 'A · Console Focus'],
  ['b', 'B · Analog Strip Wall'],
  ['c', 'C · Mastering Hybrid'],
  ['d', 'D · Digital Console Suite'],
];
const viewports = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 761, height: 450 }];

const switcher = page => page.getByRole('combobox', { name: 'Studio Layout' });
const elapsed = async timer => {
  const [minutes, seconds] = (await timer.textContent()).split(' / ')[0].split(':');
  return Number(minutes) * 60 + Number(seconds);
};

test('LAS-45: Classic is the default and all five options exist', async ({ page }) => {
  await page.goto('/');
  await expect(switcher(page)).toHaveValue('classic');
  await expect(page.locator('main')).toHaveAttribute('data-layout', 'classic');
  await expect(switcher(page).locator('option')).toHaveText(LAYOUTS.map(([, label]) => label));
});

test('LAS-45: switching while playing keeps one engine, position, parameters and project state', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  await page.getByLabel('Import WAV').setInputFiles({ name: 'long-tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 30 }) });
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  await expect(transport.getByRole('status')).toHaveText('Ready');
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('Playing');
  const timer = transport.getByRole('timer', { name: 'Playback position' });
  await expect.poll(() => elapsed(timer)).toBeGreaterThanOrEqual(0.3);
  const projectStatus = await page.locator('.project-status').textContent();
  const trackTitle = await page.getByRole('heading', { level: 3, name: 'long-tone.wav' }).textContent();

  let last = 0;
  for (const [id] of LAYOUTS.slice(1).concat(LAYOUTS.slice(0, 1))) {
    await switcher(page).selectOption(id);
    await expect(page.locator('main')).toHaveAttribute('data-layout', id);
    await expect(transport.getByRole('status')).toHaveText('Playing');
    const now = await elapsed(timer);
    expect(now).toBeGreaterThanOrEqual(last);
    last = now;
    expect(await audioSources(page)).toEqual({ started: 1, playing: 1, connected: 1 });
    await expect(page.locator('.project-status')).toHaveText(projectStatus);
    await expect(page.getByRole('heading', { level: 3, name: 'long-tone.wav' })).toHaveText(trackTitle);
    // Every layout keeps Import, Export, the four editors and the master level reachable.
    await expect(page.getByLabel('Import WAV')).toBeEnabled();
    await expect(page.getByRole('button', { name: /Export/ }).first()).toBeVisible();
    for (const name of ['Edit EQ', 'Edit dynamics', 'Edit limiter', 'Edit space']) await expect(page.getByRole('button', { name })).toBeEnabled();
  }
  await transport.getByRole('button', { name: 'Stop', exact: true }).click();
});

test('LAS-45: an open editor window and its values survive a layout switch', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Edit EQ' }).click();
  const editor = page.getByRole('dialog', { name: 'EQ' });
  await expect(editor).toBeVisible();
  // Opening an editor already records the window layout in the project; switching must add nothing.
  const before = await page.locator('.project-status').getAttribute('class');
  await switcher(page).selectOption('c');
  await expect(editor).toBeVisible();
  await expect(page.locator('.project-status')).toHaveAttribute('class', before);
});

test('LAS-45: the choice persists across reload, and storage failure falls back to Classic', async ({ page }) => {
  await page.goto('/');
  await switcher(page).selectOption('b');
  await page.reload();
  await expect(switcher(page)).toHaveValue('b');
  await expect(page.locator('main')).toHaveAttribute('data-layout', 'b');
});

test('LAS-45: without localStorage the app opens in Classic and still switches', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('storage disabled'); } });
  });
  await page.goto('/');
  await expect(switcher(page)).toHaveValue('classic');
  await switcher(page).selectOption('d');
  await expect(page.locator('main')).toHaveAttribute('data-layout', 'd');
});

test('LAS-45: layouts A–D show analysis instruments as Not available, not as fake data', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('complementary', { name: 'Studio instruments' })).toHaveCount(0);
  for (const [id] of LAYOUTS.slice(1)) {
    await switcher(page).selectOption(id);
    const dock = page.getByRole('complementary', { name: 'Studio instruments' });
    await expect(dock.getByText('Not available')).toHaveCount(4);
  }
});

for (const viewport of viewports) {
  for (const [id, label] of LAYOUTS) {
    test(`LAS-45: ${label} renders without horizontal page overflow at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await switcher(page).selectOption(id);
      for (const name of ['Transport', 'Tracks', 'Master', 'Mixer']) await expect(page.getByRole('region', { name, exact: true })).toBeVisible();
      await expect(page.getByLabel('Import WAV')).toBeEnabled();
      await expect(page.getByTestId('build-identity')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`layout-${id}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    });
  }
}
