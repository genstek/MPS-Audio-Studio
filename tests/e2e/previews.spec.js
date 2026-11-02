import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installChainProbe, paramsMessageCount } from './helpers/chain-probe.js';

// LAS-63: processor cards show their state and configured shape without playback; edits move the
// shape with a short parameter-driven transition (none with reduced motion); real meters stay idle
// while nothing plays and follow the signal when it does.
function studio(page) {
  const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
  const strip = name => mixer.getByRole('region', { name: `${name} channel strip` });
  return {
    mixer, strip,
    open: async name => { await mixer.getByRole('button', { name: `Edit ${name}` }).focus(); await page.keyboard.press('Enter'); },
    window: name => page.getByRole('dialog', { name }),
    path: name => strip(name).locator('.strip-visual svg path.preview-line, .strip-visual svg > path').first(),
  };
}

// Records every value the card's curve takes for `ms` after `action` runs.
async function shapesDuring(page, selector, action, ms = 450) {
  await page.evaluate(sel => {
    const path = document.querySelector(sel);
    window.__shapes = [path.getAttribute('d')];
    window.__observer = new MutationObserver(() => window.__shapes.push(path.getAttribute('d')));
    window.__observer.observe(path, { attributes: true, attributeFilter: ['d'] });
  }, selector);
  await action();
  await page.waitForTimeout(ms);
  return page.evaluate(() => { window.__observer.disconnect(); return window.__shapes; });
}
const DYN_PATH = '[aria-label="Dynamics channel strip"] .dynamics-thumbnail .preview-line';

test('LAS-63: without playback, cards show on/bypassed and edited state, and the configured shape follows edits, undo and presets', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  // Shipped defaults: EQ and Limiter on, Dynamics and Space bypassed, nothing edited.
  for (const [name, state] of [['EQ', 'on'], ['Dynamics', 'bypassed'], ['Limiter', 'on'], ['Space', 'bypassed']]) {
    await expect(ui.strip(name)).toHaveAttribute('data-state', state);
    await expect(ui.strip(name).getByRole('img', { name: `${name} ${state}` })).toBeVisible();
  }
  await expect(ui.mixer.getByText('edited', { exact: true })).toHaveCount(0);
  // A bypassed processor still shows its configured shape (grey), not an empty box.
  await expect(page.locator(DYN_PATH)).toHaveAttribute('d', /^M/);
  const bypassedShape = await page.locator(DYN_PATH).getAttribute('d');

  // No track loaded, nothing playing: switch Dynamics on and edit it.
  await ui.open('dynamics');
  await ui.window('Dynamics').getByLabel('Compressor on').check();
  await expect(ui.strip('Dynamics')).toHaveAttribute('data-state', 'on');
  await expect(ui.strip('Dynamics').getByText('edited', { exact: true })).toBeVisible();
  const onShape = await page.locator(DYN_PATH).getAttribute('d');
  expect(onShape, 'switching on draws the compressor curve').not.toBe(bypassedShape);
  const threshold = ui.window('Dynamics').getByRole('spinbutton', { name: 'Threshold (dB)' });
  const shapes = await shapesDuring(page, DYN_PATH, async () => { await threshold.fill('-40'); await threshold.press('Enter'); });
  expect(new Set(shapes).size, 'the curve moves through intermediate shapes (short transition)').toBeGreaterThan(3);
  const final = shapes.at(-1);
  await page.waitForTimeout(300);
  expect(await page.locator(DYN_PATH).getAttribute('d'), 'the configured shape stays when the edit ends').toBe(final);
  // The large curve in the editor shows the same settings.
  await expect(ui.window('Dynamics').getByRole('img', { name: 'Compressor transfer curve (configured)' })).toBeVisible();
  await expect(ui.window('Dynamics').getByText(/threshold −?-?40\.0 dB · 2\.0:1/)).toBeVisible();

  // Animation never sends settings: only the edit itself did.
  const sent = await paramsMessageCount(page);
  await page.waitForTimeout(300);
  expect(await paramsMessageCount(page)).toBe(sent);

  // Undo back to the defaults: shape, state and the edited marker follow.
  await ui.window('Dynamics').getByRole('button', { name: 'Undo' }).click();
  await ui.window('Dynamics').getByRole('button', { name: 'Undo' }).click();
  await expect(ui.strip('Dynamics')).toHaveAttribute('data-state', 'bypassed');
  await expect(ui.strip('Dynamics').getByText('edited', { exact: true })).toHaveCount(0);
  await expect.poll(() => page.locator(DYN_PATH).getAttribute('d')).toBe(bypassedShape);

  // A Space preset (an indirect change) updates the Space card the same way.
  await ui.window('Dynamics').getByRole('button', { name: 'Close Dynamics' }).click();
  await ui.open('space');
  const spaceBefore = await ui.strip('Space').locator('.preview-line').first().getAttribute('d');
  await ui.window('Space').getByLabel('Space on').check();
  await ui.window('Space').getByRole('combobox', { name: 'Space preset' }).selectOption('Hall');
  await expect(ui.strip('Space')).toHaveAttribute('data-state', 'on');
  await expect.poll(() => ui.strip('Space').locator('.preview-line').first().getAttribute('d')).not.toBe(spaceBefore);
});

test('LAS-63: with reduced motion the shape changes at once, without intermediate frames', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const ui = studio(page);
  await ui.open('dynamics');
  await ui.window('Dynamics').getByLabel('Compressor on').check();
  const threshold = ui.window('Dynamics').getByRole('spinbutton', { name: 'Threshold (dB)' });
  const shapes = await shapesDuring(page, DYN_PATH, async () => { await threshold.fill('-40'); await threshold.press('Enter'); });
  expect(new Set(shapes).size, 'one jump from the old to the new shape').toBe(2);
});

test('LAS-63: gain-reduction meters are idle while stopped or paused and follow the real signal while playing', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await page.getByLabel('Import WAV').setInputFiles({ name: 'loud.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 10, channels: 2, frequency: 220, dbfs: -1 }) });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
  await ui.open('dynamics');
  await ui.window('Dynamics').getByLabel('Compressor on').check();
  const threshold = ui.window('Dynamics').getByRole('spinbutton', { name: 'Threshold (dB)' });
  await threshold.fill('-40');
  await threshold.press('Enter');
  const meter = ui.strip('Dynamics').getByRole('meter', { name: 'Compressor gain reduction' });
  // Configured for heavy compression, but stopped: the meter shows no activity.
  await page.waitForTimeout(400);
  await expect(meter).toHaveAttribute('aria-valuenow', '0');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect.poll(async () => Number(await meter.getAttribute('aria-valuenow'))).toBeGreaterThan(10);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect.poll(async () => Number(await meter.getAttribute('aria-valuenow')), { timeout: 2000 }).toBe(0);
});

test('LAS-63: with every card edited, a 360 px phone still has no sideways scroll', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  for (const [name, label] of [['dynamics', 'Compressor on'], ['space', 'Space on']]) {
    await ui.open(name);
    await ui.window(name === 'dynamics' ? 'Dynamics' : 'Space').getByLabel(label).check();
  }
  await ui.window('Space').getByRole('button', { name: 'Close Space' }).click();
  await ui.window('Dynamics').getByRole('button', { name: 'Close Dynamics' }).click();
  await ui.open('limiter');
  await ui.window('Limiter').getByLabel('Limiter on').uncheck();
  await ui.window('Limiter').getByRole('button', { name: 'Close Limiter' }).click();
  await expect(ui.mixer.getByText('edited', { exact: true })).toHaveCount(3);
  await page.setViewportSize({ width: 360, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});
