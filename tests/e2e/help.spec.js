import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { HELP, helpAnchor } from '../../src/help-content.js';
import { installChainProbe, lastChainParams } from './helpers/chain-probe.js';

// LAS-70 contextual help. The 3-second hover delay is checked with Playwright's fake clock, so the
// timing is deterministic.
function studio(page) {
  const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
  return {
    status: page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status'),
    tip: name => page.getByRole('button', { name: `Help for ${name}`, exact: true }),
    popover: page.locator('.help-popover'),
    helpView: page.getByRole('dialog', { name: 'Studio help' }),
    openEditor: async name => { await mixer.getByRole('button', { name: `Edit ${name}` }).focus(); await page.keyboard.press('Enter'); },
    load: () => page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 20, channels: 2 }) }),
  };
}

test('LAS-70: hovering the ⓘ opens after 3 s; leaving earlier cancels; a click opens at once; one popover at a time', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  const ui = studio(page);
  const play = ui.tip('Play');
  await play.hover();
  await page.clock.runFor(2900);
  await expect(ui.popover).toHaveCount(0);
  await page.clock.runFor(150);
  await expect(ui.popover).toBeVisible();
  await expect(ui.popover.getByText('Play', { exact: true })).toBeVisible();
  await expect(ui.popover).toContainText('Starts playback from the current position.');
  await expect(play).toHaveAttribute('aria-expanded', 'true');
  // The pointer can travel from the icon onto the popover and its link.
  await ui.popover.getByRole('link', { name: 'More about Play →' }).hover();
  await page.clock.runFor(1000);
  await expect(ui.popover).toBeVisible();
  // Leaving both closes it.
  await page.mouse.move(5, 5);
  await page.clock.runFor(400);
  await expect(ui.popover).toHaveCount(0);

  // Early leave cancels.
  await ui.tip('Stop').hover();
  await page.clock.runFor(2000);
  await page.mouse.move(5, 5);
  await page.clock.runFor(3000);
  await expect(ui.popover).toHaveCount(0);

  // Click opens immediately; opening another closes the first.
  await ui.tip('Master level').click();
  await expect(ui.popover).toContainText('Your listening volume, from mute to 0 dB. It is not part of the exported WAV.');
  await ui.tip('Export WAV').click();
  await expect(ui.popover).toHaveCount(1);
  await expect(ui.popover.getByText('Export WAV', { exact: true })).toBeVisible();
  // A click outside closes it.
  await page.mouse.click(5, 400);
  await expect(ui.popover).toHaveCount(0);
});

test('LAS-70: keyboard: Enter opens, Tab reaches the link, Escape closes and returns focus; screen-reader names', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.openEditor('limiter');
  const tip = ui.tip('Limiter ceiling');
  await tip.focus();
  expect(await tip.evaluate(e => e.matches(':focus-visible'))).toBe(true);
  await page.keyboard.press('Enter');
  const popover = page.getByRole('dialog', { name: 'Limiter ceiling' });
  await expect(popover).toBeVisible();
  await expect(popover).toContainText('Limits peaks above the chosen ceiling (dBTP). Excessive limiting can reduce dynamics.');
  await page.keyboard.press('Tab');
  await expect(popover.getByRole('link', { name: 'More about Limiter ceiling →' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(popover).toHaveCount(0);
  await expect(tip).toBeFocused();
  // Escape with focus on the icon closes only the popover, not the Limiter window behind it.
  await page.keyboard.press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Limiter', exact: true })).toBeVisible();
});

test('LAS-70: using a help icon never presses, toggles or moves the control next to it', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.load();
  await expect(ui.status).toHaveText('Ready');
  await ui.tip('Play').click();
  await expect(ui.status).toHaveText('Ready'); // not Playing
  await ui.openEditor('limiter');
  const before = await lastChainParams(page);
  await ui.tip('Limiter on').click();
  const limiter = page.getByRole('dialog', { name: 'Limiter', exact: true });
  await expect(limiter.getByRole('checkbox', { name: 'Limiter on' })).toBeChecked();
  // The first Escape closes only the popover; the window stays until it is closed on purpose.
  await page.keyboard.press('Escape');
  await expect(ui.popover).toHaveCount(0);
  await expect(limiter).toBeVisible();
  await limiter.getByRole('button', { name: 'Close Limiter' }).click();
  await expect(limiter).toBeHidden();
  // Hovering the control itself does nothing to it.
  const fader = page.getByRole('region', { name: 'Master', exact: true }).getByRole('slider', { name: 'Master level' });
  const level = await fader.getAttribute('aria-valuetext');
  await fader.hover();
  await page.waitForTimeout(300);
  await expect(fader).toHaveAttribute('aria-valuetext', level);
  await ui.tip('Master level').click();
  await expect(fader).toHaveAttribute('aria-valuetext', level);
  expect(await lastChainParams(page)).toEqual(before);
});

test('LAS-70: "More about" opens the in-app help at that function; playback continues; closing returns to the icon', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.load();
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(ui.status).toHaveText('Playing');
  await ui.openEditor('space');
  await ui.tip('Decay (RT60)').click();
  await ui.popover.getByRole('link', { name: 'More about Decay (RT60) →' }).click();
  await expect(ui.helpView).toBeVisible();
  const article = ui.helpView.locator(`#${helpAnchor('space.decay')}`);
  await expect(article).toBeFocused();
  await expect(article).toBeInViewport();
  await expect(article).toContainText('Short decays sound like a room, long decays like a hall.');
  await expect(ui.status).toHaveText('Playing');
  await ui.helpView.getByRole('button', { name: 'Close help' }).click();
  await expect(ui.helpView).toBeHidden();
  await expect(ui.tip('Decay (RT60)')).toBeFocused();
  await expect(ui.status).toHaveText('Playing');
});

test('LAS-70: every help entry has a real anchor in the help view; the studio controls listed in the inventory have their icon', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  for (const entry of Object.values(HELP)) {
    await expect(ui.helpView.locator(`#${helpAnchor(entry.id)}`), entry.id).toHaveCount(1);
  }
  await ui.helpView.getByRole('button', { name: 'Close help' }).click();
  await ui.load();
  await expect(ui.status).toHaveText('Ready');
  const always = ['New project', 'Project menu', 'Project status', 'Play', 'Pause', 'Stop', 'Rewind', 'Fast forward', 'Timeline', 'Output level meters', 'Clip indicator',
    'Import or replace WAV', 'Remove track', 'Analyze', 'Compare with a reference', 'Listen to (Processed / Original)', 'Match loudness', 'Master level', 'Export WAV',
    'Undo / Redo', 'Reset window layout', 'Settings', 'Stems', 'EQ module', 'Dynamics module', 'Limiter module', 'Space module', 'References', 'Account'];
  for (const name of always) await expect(ui.tip(name), name).toHaveCount(1);
  const editors = {
    EQ: ['eq', ['EQ edit mode (Link / Left / Right)', 'EQ on', 'EQ curve', 'Band selector', 'Band on', 'Band type', 'Frequency', 'Gain', 'Q', 'Section presets', 'Move window']],
    Dynamics: ['dynamics', ['Compressor on', 'Detector', 'Threshold', 'Ratio', 'Attack', 'Release', 'Knee', 'Makeup gain', 'Section presets']],
    Limiter: ['limiter', ['Limiter on', 'Limiter ceiling', 'Input gain', 'Release', 'Section presets']],
    Space: ['space', ['Space on', 'Space preset', 'Mix (wet)', 'Pre-delay', 'Decay (RT60)', 'Damping', 'Section presets']],
  };
  for (const [title, [button, names]] of Object.entries(editors)) {
    await ui.openEditor(button);
    const dialog = page.getByRole('dialog', { name: title });
    for (const name of names) await expect(dialog.getByRole('button', { name: `Help for ${name}`, exact: true }), `${title}: ${name}`).toHaveCount(1);
    await dialog.getByRole('button', { name: `Close ${title}` }).focus();
    await page.keyboard.press('Enter');
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const name of ['Needle meters', 'Output spectrum']) await expect(ui.tip(name), name).toHaveCount(1);
});

test('LAS-70: the popover stays inside a phone viewport and above editor windows; a pending hover is cancelled when its editor closes', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.clock.install();
  await page.goto('/');
  const ui = studio(page);
  await ui.tip('Project status').click();
  const box = await ui.popover.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(360);
  expect(box.y + box.height).toBeLessThanOrEqual(780);
  await page.keyboard.press('Escape');
  // Above an editor window.
  await page.setViewportSize({ width: 1280, height: 800 });
  await ui.openEditor('limiter');
  await ui.tip('Limiter ceiling').click();
  const top = await ui.popover.evaluate(p => { const b = p.getBoundingClientRect(); return p.contains(document.elementFromPoint(b.x + b.width / 2, b.y + b.height / 2)); });
  expect(top).toBe(true);
  await page.keyboard.press('Escape');
  // Hover starts the timer; closing the window removes the icon; the timer must not open anything.
  await ui.tip('Input gain').hover();
  await page.clock.runFor(1000);
  await page.getByRole('dialog', { name: 'Limiter', exact: true }).getByRole('button', { name: 'Close Limiter' }).focus();
  await page.keyboard.press('Enter');
  await page.clock.runFor(4000);
  await expect(ui.popover).toHaveCount(0);
});
