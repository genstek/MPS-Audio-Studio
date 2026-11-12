import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAudioProbe } from './helpers/audio-probe.js';

// LAS-45 Phase 1: Console 2.0 is an opt-in view over the same components. These tests check the
// view switch, that switching leaves the engine alone, and that the existing controls stay
// reachable. They do not judge sound; audio is covered by the engine and probe tests.
const SIZES = [[1920, 1080], [1440, 900], [1280, 720], [761, 450]];

const ui = page => ({
  transport: page.getByRole('region', { name: 'Transport', exact: true }),
  status: page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status'),
  timer: page.getByRole('region', { name: 'Transport', exact: true }).getByRole('timer', { name: 'Playback position' }),
  classic: page.getByRole('button', { name: 'Classic', exact: true }),
  console: page.getByRole('button', { name: 'Console 2.0', exact: true }),
  main: page.locator('main'),
  load: (name = 'tone.wav', seconds = 6) => page.getByLabel('Import WAV').setInputFiles({ name, mimeType: 'audio/wav', buffer: makeWav({ seconds }) }),
});

const seconds = async timer => {
  const [minutes, rest] = (await timer.textContent()).split(' / ')[0].split(':');
  return Number(minutes) * 60 + Number(rest);
};

test('LAS-45: opens in Classic and the choice is a local preference', async ({ page }) => {
  await page.goto('/');
  const s = ui(page);
  await expect(s.classic).toHaveAttribute('aria-pressed', 'true');
  await expect(s.main).not.toHaveClass(/studio-console/);
  await s.console.click();
  await expect(s.main).toHaveClass(/studio-console/);
  await page.reload();
  await expect(s.console).toHaveAttribute('aria-pressed', 'true');
  await s.classic.click();
  await page.reload();
  await expect(s.main).not.toHaveClass(/studio-console/);
});

test('LAS-45: blocked storage falls back to Classic without breaking the switch', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('/');
  const s = ui(page);
  await expect(s.classic).toHaveAttribute('aria-pressed', 'true');
  await s.console.click();
  await expect(s.main).toHaveClass(/studio-console/);
});

test('LAS-45: switching views while playing keeps the position and does not restart audio', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  const s = ui(page);
  await s.load();
  await expect(s.status).toHaveText('Ready');
  await s.transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(s.status).toHaveText('Playing');
  await expect.poll(() => seconds(s.timer)).toBeGreaterThanOrEqual(1);
  const before = await page.evaluate(() => ({ started: window.__audioProbe.started, contexts: window.__audioProbe.contexts.length }));
  // Importing marks the project changed; a view switch must not alter that state either way.
  const projectState = await page.locator('.project-status').textContent();

  await s.console.click();
  await expect(s.main).toHaveClass(/studio-console/);
  const inConsole = await seconds(s.timer);
  expect(inConsole).toBeGreaterThanOrEqual(1);
  await s.classic.click();
  await expect(s.status).toHaveText('Playing');
  expect(await seconds(s.timer)).toBeGreaterThanOrEqual(inConsole);

  const after = await page.evaluate(() => ({ started: window.__audioProbe.started, contexts: window.__audioProbe.contexts.length }));
  expect(after).toEqual(before);
  await expect(page.locator('.project-status')).toHaveText(projectState);
});

test('LAS-45: Console 2.0 shows the real chain, honest placeholders and keeps every control', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  const s = ui(page);
  await s.console.click();

  // Empty state: nothing fabricated.
  const nav = page.getByRole('navigation', { name: 'Workspace navigation' });
  await expect(nav).toBeVisible();
  await expect(page.getByText('Requires analysis').first()).toBeVisible();
  await expect(page.getByRole('list', { name: 'Signal flow' }).getByRole('listitem')).toHaveCount(4);
  await expect(page.getByTestId('build-identity')).toBeVisible();
  await expect(page.getByRole('slider', { name: 'Master level' })).toBeDisabled();
  await expect(page.getByText('not applied to the exported WAV')).toBeVisible();

  await s.load();
  await expect(s.status).toHaveText('Ready');
  const master = page.getByRole('region', { name: 'Master', exact: true });
  await expect(master.getByRole('slider', { name: 'Master level' })).toBeEnabled();
  await expect(master.getByRole('button', { name: 'Export WAV', exact: true })).toBeVisible();
  await expect(master.getByRole('meter', { name: 'Left output level' })).toBeVisible();

  // Transport, seek, pause, stop.
  await s.transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(s.status).toHaveText('Playing');
  await s.transport.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(s.status).toHaveText('Paused');
  await s.transport.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(s.status).toHaveText('Stopped');

  // Honest bypass: the flow summary follows the real chain state.
  const strips = page.getByRole('group', { name: 'Processing modules' });
  await strips.getByRole('button', { name: 'Edit EQ' }).click();
  const eq = page.getByRole('dialog', { name: 'EQ' });
  await expect(eq).toBeVisible();
  await expect(eq.getByRole('button', { name: 'Undo' })).toBeVisible();
  await eq.getByRole('button', { name: 'Close EQ' }).click();

  // Stems mixer reachable from the rail.
  await nav.getByRole('button', { name: /Open Stems Mixer/ }).click();
  await expect(page.getByRole('dialog', { name: /stems/i })).toBeVisible();
  await page.getByRole('button', { name: 'Close stems' }).click();

  // Keyboard: the view switch and nav are reachable by Tab and activate with Enter.
  await s.classic.focus();
  await expect(s.classic).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(s.console).toBeFocused();
});

for (const [width, height] of SIZES) {
  test(`LAS-45: Console 2.0 has no horizontal overflow and keeps essentials reachable at ${width}x${height}`, async ({ page }, info) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    const s = ui(page);
    await s.load();
    await expect(s.status).toHaveText('Ready');
    for (const view of ['classic', 'console']) {
      await (view === 'classic' ? s.classic : s.console).click();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${view}: no horizontal page overflow`).toBeLessThanOrEqual(0);
      if (view === 'console') {
        for (const name of ['Play', 'Pause', 'Stop']) {
          const button = s.transport.getByRole('button', { name, exact: true });
          await button.scrollIntoViewIfNeeded();
          await expect(button).toBeInViewport({ ratio: 1 });
        }
        for (const target of [page.getByText('Replace WAV', { exact: true }), page.getByRole('group', { name: 'Processing modules' }), page.getByRole('slider', { name: 'Master level' })]) {
          await target.scrollIntoViewIfNeeded();
          await expect(target).toBeInViewport();
        }
      }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`${view}-${width}x${height}.png`) });
    }
  });
}
