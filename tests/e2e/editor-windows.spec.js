import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAudioProbe, audioSources } from './helpers/audio-probe.js';
import { installChainProbe, lastChainParams, paramsMessageCount } from './helpers/chain-probe.js';

// LAS-61 (movable windows) and LAS-62 (several editors open at once). Window position and stacking
// are view state: the tests check that they never send settings to the chain or touch playback.
function studio(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
  return {
    status: transport.getByRole('status'),
    mixer,
    window: name => page.getByRole('dialog', { name }),
    edit: name => mixer.getByRole('button', { name: `Edit ${name}` }),
    // Floating windows may cover the mixer strips (that is what Move and Reset layout are for), so
    // editors are opened from the keyboard: Tab to the strip's Edit button and press Enter.
    open: async name => { await mixer.getByRole('button', { name: `Edit ${name}` }).focus(); await page.keyboard.press('Enter'); },
    load: () => page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 20, channels: 2 }) }),
  };
}
const box = locator => locator.boundingBox();
const zOf = locator => locator.evaluate(e => Number(getComputedStyle(e).zIndex));

async function dragTitle(page, dialog, dx, dy) {
  const bar = dialog.locator('.editor-titlebar h2');
  const start = await box(bar);
  await page.mouse.move(start.x + 5, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(start.x + 5 + dx / 2, start.y + start.height / 2 + dy / 2, { steps: 4 });
  await page.mouse.move(start.x + 5 + dx, start.y + start.height / 2 + dy, { steps: 4 });
  await page.mouse.up();
}

test('LAS-62: EQ, Dynamics and Limiter stay open together; opening an open editor focuses it; edits reach the right processor', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.load();
  await expect(ui.status).toHaveText('Ready');
  for (const name of ['limiter', 'EQ', 'dynamics']) await ui.open(name);
  for (const name of ['EQ', 'Dynamics', 'Limiter']) await expect(ui.window(name)).toBeVisible();
  await expect(page.locator('dialog.editor-dialog[open]')).toHaveCount(3);

  // Opening an already open editor brings it to the front and focuses it; nothing is duplicated.
  await ui.open('limiter');
  await expect(page.locator('dialog.editor-dialog[open]')).toHaveCount(3);
  await expect(ui.window('Limiter').getByRole('button', { name: 'Close Limiter' })).toBeFocused();
  await expect(ui.window('Limiter')).toHaveClass(/is-active/);
  expect(await zOf(ui.window('Limiter'))).toBeGreaterThan(await zOf(ui.window('EQ')));

  // Each window edits its own module. Focusing a control in a window brings that window to the
  // front, as clicking it does, so a covered window's controls become usable.
  await ui.window('Dynamics').getByLabel('Compressor on', { exact: true }).focus();
  await expect(ui.window('Dynamics')).toHaveClass(/is-active/);
  await ui.window('Dynamics').getByLabel('Compressor on', { exact: true }).check();
  await ui.window('Limiter').getByRole('spinbutton', { name: 'Ceiling (dBTP)' }).focus();
  await ui.window('Limiter').getByRole('spinbutton', { name: 'Ceiling (dBTP)' }).fill('-2');
  await ui.window('Limiter').getByRole('spinbutton', { name: 'Ceiling (dBTP)' }).press('Enter');
  await ui.window('EQ').getByLabel('EQ on', { exact: true }).focus();
  await ui.window('EQ').getByLabel('EQ on', { exact: true }).uncheck();
  await expect.poll(async () => {
    const p = await lastChainParams(page);
    return p && [p.compressor.enabled, p.limiter.ceiling, p.eq.enabled].join();
  }).toBe('true,-2,false');

  // Undo/redo keep their documented scope: one history for the whole chain, newest edit first.
  await ui.window('Dynamics').getByRole('button', { name: 'Undo', exact: true }).focus();
  await ui.window('Dynamics').getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(async () => (await lastChainParams(page)).eq.enabled).toBe(true);
  expect((await lastChainParams(page)).limiter.ceiling).toBe(-2);

  // Closing an editor keeps the others, their values and positions, and never bypasses its processor.
  const eqBefore = await box(ui.window('EQ'));
  const sent = await paramsMessageCount(page);
  await ui.window('Dynamics').getByRole('button', { name: 'Close Dynamics' }).focus();
  await ui.window('Dynamics').getByRole('button', { name: 'Close Dynamics' }).click();
  await expect(ui.window('Dynamics')).toBeHidden();
  await expect(ui.window('EQ')).toBeVisible();
  await expect(ui.window('Limiter')).toBeVisible();
  expect(await box(ui.window('EQ'))).toEqual(eqBefore);
  await expect(ui.window('Limiter').getByRole('spinbutton', { name: 'Ceiling (dBTP)' })).toHaveValue('-2.0');
  expect(await paramsMessageCount(page)).toBe(sent);
  expect((await lastChainParams(page)).compressor.enabled).toBe(true);
  await ui.open('dynamics');
  await expect(ui.window('Dynamics').getByLabel('Compressor on', { exact: true })).toBeChecked();
});

test('LAS-61: windows move by their title bar while playing, come to the front when clicked, and keep their place when reopened', async ({ page }) => {
  await installChainProbe(page);
  await installAudioProbe(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const ui = studio(page);
  await ui.load();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(ui.status).toHaveText('Playing');
  await ui.open('EQ');
  await ui.open('dynamics');
  // Editors open below the transport: Pause stays uncovered and usable.
  const pause = page.getByRole('button', { name: 'Pause', exact: true });
  expect(await pause.evaluate(e => { const b = e.getBoundingClientRect(); return e.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); })).toBe(true);
  const sent = await paramsMessageCount(page);
  const before = await box(ui.window('Dynamics'));
  await dragTitle(page, ui.window('Dynamics'), -500, 300);
  const after = await box(ui.window('Dynamics'));
  expect(Math.round(after.x - before.x)).toBe(-500);
  expect(Math.round(after.y - before.y)).toBe(300);
  // Moving is view state only: no settings sent, playback untouched, one source.
  expect(await paramsMessageCount(page)).toBe(sent);
  await expect(ui.status).toHaveText('Playing');
  expect((await audioSources(page)).started).toBe(1);

  // Controls inside the window still work on their own (no drag starts from them).
  await ui.window('Dynamics').getByLabel('Compressor on', { exact: true }).check();
  expect(await box(ui.window('Dynamics'))).toEqual(after);

  // Clicking the EQ window brings it to the front.
  await ui.window('EQ').locator('.eq-toolbar').click({ position: { x: 5, y: 5 } });
  await expect(ui.window('EQ')).toHaveClass(/is-active/);
  expect(await zOf(ui.window('EQ'))).toBeGreaterThan(await zOf(ui.window('Dynamics')));

  // Close and reopen: same place.
  await ui.window('Dynamics').getByRole('button', { name: 'Close Dynamics' }).focus();
  await ui.window('Dynamics').getByRole('button', { name: 'Close Dynamics' }).click();
  await ui.open('dynamics');
  expect(await box(ui.window('Dynamics'))).toEqual(after);

  // A drag far outside the viewport stops at its edge: title and close stay reachable.
  await dragTitle(page, ui.window('Dynamics'), -3000, -3000);
  const corner = await box(ui.window('Dynamics'));
  expect(corner.x).toBe(8);
  expect(corner.y).toBe(8);
  await expect(ui.window('Dynamics').getByRole('button', { name: 'Close Dynamics' })).toBeInViewport({ ratio: 1 });
});

test('LAS-61: keyboard positioning, Escape on the focused window, Reset window layout and resize recovery', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto('/');
  const ui = studio(page);
  await ui.load();
  await ui.open('EQ');
  await ui.open('limiter');
  const limiter = ui.window('Limiter');
  const grip = limiter.getByRole('button', { name: 'Move Limiter window' });
  const start = await box(limiter);
  await grip.focus();
  await expect(grip).toBeFocused();
  expect(await grip.evaluate(e => e.matches(':focus-visible'))).toBe(true);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Shift+ArrowDown');
  const moved = await box(limiter);
  expect(Math.round(moved.x - start.x)).toBe(-32);
  expect(Math.round(moved.y - start.y)).toBe(64);
  await page.keyboard.press('Home');
  expect(await box(limiter)).toEqual(start);

  // Escape closes only the window that has focus; focus returns to its Edit button.
  await page.keyboard.press('ArrowLeft');
  await limiter.getByRole('spinbutton', { name: 'Release (ms)' }).focus();
  await page.keyboard.press('Escape');
  await expect(limiter).toBeHidden();
  await expect(ui.window('EQ')).toBeVisible();
  await expect(ui.edit('limiter')).toBeFocused();

  // Reset window layout puts every window back to its first place.
  await ui.open('limiter');
  expect((await box(limiter)).x).toBe(start.x - 16);
  // (The windows cover the mixer heading here, so the button is reached from the keyboard.)
  await ui.mixer.getByRole('button', { name: 'Reset window layout', exact: true }).focus();
  await page.keyboard.press('Enter');
  expect(await box(limiter)).toEqual(start);

  // Moved to the far right, then the browser window shrinks: the window is brought back inside.
  await dragTitle(page, limiter, 2000, 0);
  await page.setViewportSize({ width: 800, height: 600 });
  await expect.poll(async () => {
    const b = await box(limiter);
    return b.x >= 0 && b.y >= 0 && b.x + b.width <= 800 && b.y <= 600 - 40;
  }).toBe(true);
  await expect(limiter.getByRole('button', { name: 'Close Limiter' })).toBeInViewport({ ratio: 1 });
});

test('LAS-61/62: on a phone-sized screen every open window keeps its title and close button reachable; the transport stays usable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const ui = studio(page);
  await ui.load();
  for (const name of ['EQ', 'dynamics', 'limiter']) {
    await ui.open(name);
  }
  for (const name of ['EQ', 'Dynamics', 'Limiter']) {
    const b = await box(ui.window(name));
    expect(b.x).toBeGreaterThanOrEqual(0);
    expect(b.x + b.width).toBeLessThanOrEqual(390);
  }
  const front = ui.window('Limiter');
  await expect(front.getByRole('button', { name: 'Close Limiter' })).toBeInViewport({ ratio: 1 });
  await expect(front.getByRole('button', { name: 'Move Limiter window' })).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  // The windows are non-modal: with all three open, the transport still plays and pauses.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(ui.status).toHaveText('Playing');
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(ui.status).toHaveText('Paused');
});
