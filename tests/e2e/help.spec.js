import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { HELP, helpAnchor } from '../../src/help-content.js';
import { installChainProbe, lastChainParams } from './helpers/chain-probe.js';

// LAS-73/74 contextual help: no icons; 3 s hover on the real control; one popover studio-wide, owned by
// the hovered instance. The delay is checked with Playwright's fake clock, so timing is deterministic.
// These tests prove interaction behaviour only; they say nothing about audio fidelity.
function studio(page) {
  const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
  return {
    status: page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status'),
    popover: page.locator('.help-popover'),
    helpView: page.getByRole('dialog', { name: 'Studio help' }),
    editor: title => page.getByRole('dialog', { name: title, exact: true }),
    openEditor: async name => { await mixer.getByRole('button', { name: `Edit ${name}` }).focus(); await page.keyboard.press('Enter'); },
    load: () => page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 20, channels: 2 }) }),
  };
}

test('LAS-74: no contextual i / ⓘ / ? help icons remain anywhere', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.load();
  await ui.openEditor('eq');
  await ui.openEditor('limiter');
  await expect(page.locator('button.help-tip')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /^Help for / })).toHaveCount(0);
  // Studio help (touch / discovery path) is still there.
  await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeVisible();
});

test('LAS-74: hovering the real control opens after 3 s; leaving earlier cancels; moving onto the link keeps it open', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const ui = studio(page);
  const stop = page.getByRole('button', { name: 'Stop', exact: true });
  await stop.hover({ force: true });
  await page.clock.runFor(2900);
  await expect(ui.popover).toHaveCount(0);
  await page.clock.runFor(150);
  await expect(ui.popover).toBeVisible();
  await expect(ui.popover.locator('strong')).toHaveText('Stop');
  // Pointer travels onto the popover and its link.
  await ui.popover.getByRole('link', { name: 'More about Stop →' }).hover();
  await page.clock.runFor(1000);
  await expect(ui.popover).toBeVisible();
  await page.mouse.move(5, 5);
  await page.clock.runFor(400);
  await expect(ui.popover).toHaveCount(0);

  // Early leave cancels the timer.
  await stop.hover({ force: true });
  await page.clock.runFor(2000);
  await page.mouse.move(5, 5);
  await page.clock.runFor(3500);
  await expect(ui.popover).toHaveCount(0);

  // Moving between controls resets ownership and the timer.
  await stop.hover({ force: true });
  await page.clock.runFor(2000);
  await page.getByRole('button', { name: 'Play', exact: true }).hover({ force: true });
  await page.clock.runFor(2000);
  await expect(ui.popover).toHaveCount(0);
  await page.clock.runFor(1100);
  await expect(ui.popover.locator('strong')).toHaveText('Play');
  await page.mouse.click(5, 400); // click outside closes
  await expect(ui.popover).toHaveCount(0);
});

test('LAS-73: identical controls in several editors open exactly one popover, anchored to the hovered instance', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 });
  await page.clock.install();
  await page.goto('/');
  const ui = studio(page);
  await ui.openEditor('eq');
  await ui.openEditor('dynamics');
  await ui.openEditor('limiter');
  const grips = page.getByRole('button', { name: /^Move .* window$/ });
  await expect(grips).toHaveCount(3);
  // Section presets and Undo/Redo also exist in each window.
  for (const index of [0, 1, 2]) {
    const grip = grips.nth(index);
    await grip.hover();
    await page.clock.runFor(3100);
    await expect(ui.popover, `window ${index}`).toHaveCount(1);
    const anchor = await grip.boundingBox();
    const box = await ui.popover.boundingBox();
    expect(Math.abs(box.x + box.width / 2 - (anchor.x + anchor.width / 2))).toBeLessThan(box.width / 2 + 1);
    expect(box.y).toBeGreaterThanOrEqual(anchor.y + anchor.height - 1);
    await page.mouse.move(2, 2);
    await page.clock.runFor(400);
    await expect(ui.popover).toHaveCount(0);
  }
  // Undo / Redo exists in several windows and the Mixer: still one popover.
  const undo = page.getByRole('button', { name: 'Undo', exact: true });
  const count = await undo.count();
  expect(count).toBeGreaterThan(1);
  await undo.nth(1).hover({ force: true });
  await page.clock.runFor(3100);
  await expect(ui.popover).toHaveCount(1);
});

test('LAS-74: keyboard F1 on the control opens at once; Escape closes it and keeps focus; the window behind stays', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.openEditor('limiter');
  const toggle = ui.editor('Limiter').getByRole('checkbox', { name: 'Limiter on' });
  await toggle.focus();
  await page.keyboard.press('F1');
  await expect(ui.popover).toHaveCount(1);
  await page.keyboard.press('Tab');
  await expect(ui.popover.getByRole('link')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(ui.popover).toHaveCount(0);
  await expect(toggle).toBeFocused();
  await expect(ui.editor('Limiter')).toBeVisible();
  // Screen readers get the short text without the popover.
  const described = await toggle.evaluate(el => el.closest('.toggle, label')?.getAttribute('aria-describedby') ?? el.getAttribute('aria-describedby'));
  expect(described).toBeTruthy();
});

test('LAS-74: pressing or dragging a control dismisses the popover and never needs the 3 s delay', async ({ page }) => {
  await installChainProbe(page);
  await page.clock.install();
  await page.goto('/');
  const ui = studio(page);
  await ui.load();
  await page.clock.runFor(100);
  await ui.openEditor('limiter');
  const toggle = ui.editor('Limiter').getByRole('checkbox', { name: 'Limiter on' });
  const before = await toggle.isChecked();
  // Click works immediately, with no hover delay.
  await toggle.click();
  expect(await toggle.isChecked()).toBe(!before);
  // A hover that is waiting is cancelled by pressing: no popover appears during a drag.
  const play = page.getByRole('button', { name: 'Stop', exact: true });
  await play.hover({ force: true });
  await page.clock.runFor(2500);
  await page.mouse.down();
  await page.clock.runFor(1500);
  await expect(ui.popover).toHaveCount(0);
  await page.mouse.up();
});

test('LAS-74: a disabled control is explained through its wrapper', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const ui = studio(page);
  const play = page.getByRole('button', { name: 'Play', exact: true });
  await expect(play).toBeDisabled(); // no track yet
  await play.hover({ force: true });
  await page.clock.runFor(3100);
  await expect(ui.popover.locator('strong')).toHaveText('Play');
});

test('LAS-74: using help never presses, toggles or moves a control; "More about" opens Studio help at that function and returns focus', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.load();
  await expect(ui.status).toHaveText('Ready');
  await ui.openEditor('space');
  const before = await lastChainParams(page);
  const decay = ui.editor('Space').getByLabel('Decay (RT60)').first();
  await decay.focus();
  await page.keyboard.press('F1');
  await expect(ui.popover).toContainText('Decay (RT60)');
  expect(await lastChainParams(page)).toEqual(before);
  await ui.popover.getByRole('link', { name: 'More about Decay (RT60) →' }).click();
  await expect(ui.helpView).toBeVisible();
  const article = ui.helpView.locator(`#${helpAnchor('space.decay')}`);
  await expect(article).toBeFocused();
  await expect(article).toContainText('Short decays sound like a room, long decays like a hall.');
  await ui.helpView.getByRole('button', { name: 'Close help' }).click();
  await expect(ui.helpView).toBeHidden();
  await expect(decay).toBeFocused();
  await expect(ui.status).toHaveText('Ready');
  expect(await lastChainParams(page)).toEqual(before);
});

test('LAS-74: every help entry still has an anchor in Studio help', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  for (const entry of Object.values(HELP)) {
    await expect(ui.helpView.locator(`#${helpAnchor(entry.id)}`), entry.id).toHaveCount(1);
  }
});

test('LAS-74: on a phone viewport the popover stays inside the screen and above editor windows', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  const ui = studio(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await ui.openEditor('limiter');
  const input = ui.editor('Limiter').getByLabel('Input gain').first();
  await input.focus();
  await page.keyboard.press('F1');
  const box = await ui.popover.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(1280);
  const top = await ui.popover.evaluate(p => { const b = p.getBoundingClientRect(); return p.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); });
  expect(top).toBe(true);
  await page.setViewportSize({ width: 360, height: 780 });
  await page.waitForTimeout(100);
  const narrow = await ui.popover.boundingBox();
  expect(narrow.x).toBeGreaterThanOrEqual(0);
  expect(narrow.x + narrow.width).toBeLessThanOrEqual(360);
});

test('LAS-74: a pending hover is cancelled when its editor closes', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const ui = studio(page);
  await ui.openEditor('limiter');
  await ui.editor('Limiter').getByLabel('Input gain').first().hover();
  await page.clock.runFor(1000);
  await ui.editor('Limiter').getByRole('button', { name: 'Close Limiter' }).focus();
  await page.keyboard.press('Enter');
  await page.clock.runFor(4000);
  await expect(ui.popover).toHaveCount(0);
});
