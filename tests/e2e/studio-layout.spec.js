import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAudioProbe, audioSources, contextStates } from './helpers/audio-probe.js';

// LAS-45 Stage 1: five switchable studio layouts over one shared state. Screenshots and geometry
// checks prove composition only, never audio fidelity.
const LAYOUTS = [
  ['classic', 'Classic'],
  ['a', 'A · Console Focus'],
  ['b', 'B · Analog Strip Wall'],
  ['c', 'C · Mastering Hybrid'],
  ['d', 'D · Digital Console Suite'],
];
const viewports = [{ width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 800, height: 600 }, { width: 761, height: 450 }];

const switcher = page => page.getByRole('combobox', { name: 'Studio Layout' });
const transportOf = page => page.getByRole('region', { name: 'Transport', exact: true });
const elapsed = async timer => {
  const [minutes, seconds] = (await timer.textContent()).split(' / ')[0].split(':');
  return Number(minutes) * 60 + Number(seconds);
};
const box = (page, selector) => page.locator(selector).first().boundingBox();
async function loadTone(page, seconds = 30) {
  await page.getByLabel('Import WAV').setInputFiles({ name: 'long-tone.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds }) });
  await expect(transportOf(page).getByRole('status')).toHaveText('Ready');
}

test('LAS-45: Classic is the default and all five options exist', async ({ page }) => {
  await page.goto('/');
  await expect(switcher(page)).toHaveValue('classic');
  await expect(page.locator('main')).toHaveAttribute('data-layout', 'classic');
  await expect(switcher(page).locator('option')).toHaveText(LAYOUTS.map(([, label]) => label));
  await expect(page.getByRole('complementary', { name: 'Studio instruments' })).toHaveCount(0);
});

test('LAS-45: the switcher is keyboard operable', async ({ page }) => {
  await page.goto('/');
  await switcher(page).focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('main')).toHaveAttribute('data-layout', 'a');
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('main')).toHaveAttribute('data-layout', 'b');
});

test('LAS-45: switching while playing keeps one engine, position, parameters and project state', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  await loadTone(page);
  const transport = transportOf(page);
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('Playing');
  const timer = transport.getByRole('timer', { name: 'Playback position' });
  await expect.poll(() => elapsed(timer)).toBeGreaterThanOrEqual(0.3);
  const projectStatus = await page.locator('.project-status').textContent();
  const projectClass = await page.locator('.project-status').getAttribute('class');
  const contexts = (await contextStates(page)).length;

  let last = 0;
  for (const [id] of LAYOUTS.slice(1).concat(LAYOUTS.slice(0, 1))) {
    await switcher(page).selectOption(id);
    await expect(page.locator('main')).toHaveAttribute('data-layout', id);
    await expect(transport.getByRole('status')).toHaveText('Playing');
    const now = await elapsed(timer);
    expect(now).toBeGreaterThanOrEqual(last);
    last = now;
    expect(await audioSources(page)).toEqual({ started: 1, playing: 1, connected: 1 });
    expect((await contextStates(page)).length).toBe(contexts);
    await expect(page.locator('.project-status')).toHaveText(projectStatus);
    await expect(page.locator('.project-status')).toHaveAttribute('class', projectClass);
    await expect(page.getByRole('heading', { level: 3, name: 'long-tone.wav' })).toBeVisible();
    await expect(page.getByLabel('Import WAV')).toBeEnabled();
    await expect(page.getByRole('button', { name: /Export/ }).first()).toBeVisible();
    for (const name of ['Edit EQ', 'Edit dynamics', 'Edit limiter', 'Edit space']) await expect(page.getByRole('button', { name })).toBeEnabled();
    await expect(page.getByRole('slider', { name: 'Master level' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Analyze' })).toBeVisible();
  }
  await transport.getByRole('button', { name: 'Stop', exact: true }).click();
});

test('LAS-45: resizing while playing keeps playback running in every layout', async ({ page }) => {
  await page.goto('/');
  await loadTone(page);
  const transport = transportOf(page);
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('Playing');
  for (const [id] of LAYOUTS) {
    await switcher(page).selectOption(id);
    for (const size of [{ width: 1920, height: 1080 }, { width: 1024, height: 768 }, { width: 761, height: 450 }]) {
      await page.setViewportSize(size);
      await expect(transport.getByRole('status')).toHaveText('Playing');
    }
  }
  await transport.getByRole('button', { name: 'Stop', exact: true }).click();
});

test('LAS-45: layouts are structurally different, not recolours', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  const geometry = {};
  for (const [id] of LAYOUTS.slice(1)) {
    await switcher(page).selectOption(id);
    const [dock, tracks, master, mixer, inspector] = await Promise.all(['.layout-dock', '.tracks', '.master', '.mixer', '#inspector-region'].map(s => box(page, s)));
    geometry[id] = { dock, tracks, master, mixer, inspector };
  }
  // A: dock at the left of the tracks; inspector under the master at the right.
  expect(geometry.a.dock.x + geometry.a.dock.width).toBeLessThanOrEqual(geometry.a.tracks.x + 1);
  expect(geometry.a.inspector.x).toBeGreaterThan(geometry.a.mixer.x + geometry.a.mixer.width - 2);
  // B: the strip wall comes before the tracks; inspector is not part of this layout.
  expect(geometry.b.mixer.y).toBeLessThan(geometry.b.tracks.y);
  expect(geometry.b.inspector).toBeNull();
  // C: instruments come before the tracks and span wider than the master column.
  expect(geometry.c.dock.y).toBeLessThan(geometry.c.tracks.y);
  expect(geometry.c.dock.width).toBeGreaterThan(geometry.c.master.width * 2);
  // D: dock is the left navigation; the inspector sits between the tracks and the mixer bank.
  expect(geometry.d.dock.x).toBeLessThan(geometry.d.tracks.x);
  expect(geometry.d.inspector.y).toBeGreaterThan(geometry.d.tracks.y);
  expect(geometry.d.inspector.y).toBeLessThan(geometry.d.mixer.y);
  // All four differ in where the master sits relative to the mixer bank.
  const signature = id => [Math.sign(Math.round(geometry[id].mixer.y - geometry[id].tracks.y)), Math.round(geometry[id].dock.width / 40), Math.round(geometry[id].master.width / 40)].join(':');
  expect(new Set(['a', 'b', 'c', 'd'].map(signature)).size).toBe(4);
});

test('LAS-45: B and D use an upright master fader that is still the real control', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await loadTone(page);
  const fader = page.getByRole('slider', { name: 'Master level' });
  const before = await fader.boundingBox();
  expect(before.width).toBeGreaterThan(before.height); // Classic: horizontal
  for (const id of ['b', 'd']) {
    await switcher(page).selectOption(id);
    await expect(page.getByTestId('vertical-master-fader')).toBeVisible();
    const upright = await fader.boundingBox();
    expect(upright.height).toBeGreaterThan(upright.width * 3);
    await fader.focus();
    await page.keyboard.press('Home'); // mute (keyboard path of the same range input)
    await expect(page.locator('.master-value')).toHaveText('−∞ dB');
    await page.keyboard.press('End');
    await expect(page.locator('.master-value')).toHaveText('0.0 dB');
  }
  await switcher(page).selectOption('a');
  await expect(page.getByTestId('vertical-master-fader')).toHaveCount(0);
});

test('LAS-45: an open editor window, its values and the inspector toggle share one state across layouts', async ({ page }) => {
  await page.goto('/');
  await loadTone(page, 5);
  await page.getByRole('button', { name: 'Edit EQ' }).click();
  const editor = page.getByRole('dialog', { name: 'EQ' });
  await expect(editor).toBeVisible();
  const position = await editor.boundingBox();
  const before = await page.locator('.project-status').getAttribute('class');
  await switcher(page).selectOption('c');
  await expect(editor).toBeVisible();
  expect(await editor.boundingBox()).toEqual(position);
  await expect(page.locator('.project-status')).toHaveAttribute('class', before);
  await page.keyboard.press('Escape');
  // Inspector: choose Dynamics, bypass it, and see the same state on the strip and after Undo.
  await switcher(page).selectOption('d');
  await page.getByRole('button', { name: 'Inspect Dynamics' }).click();
  const inspector = page.getByTestId('inspector');
  await expect(inspector).toContainText('Dynamics');
  const strip = page.getByRole('region', { name: 'Dynamics channel strip' });
  const initial = await strip.getAttribute('data-state');
  await inspector.getByRole('checkbox', { name: 'Dynamics on' }).click();
  await expect(strip).not.toHaveAttribute('data-state', initial);
  await switcher(page).selectOption('a');
  await expect(page.getByRole('region', { name: 'Dynamics channel strip' })).not.toHaveAttribute('data-state', initial);
  await page.getByRole('button', { name: 'Undo', exact: true }).first().click();
  await expect(page.getByRole('region', { name: 'Dynamics channel strip' })).toHaveAttribute('data-state', initial);
});

test('LAS-45: switching layouts alone does not dirty a project', async ({ page }) => {
  await page.goto('/');
  const before = await page.locator('.project-status').getAttribute('class');
  const text = await page.locator('.project-status').textContent();
  for (const [id] of LAYOUTS.slice(1)) await switcher(page).selectOption(id);
  await expect(page.locator('.project-status')).toHaveAttribute('class', before);
  await expect(page.locator('.project-status')).toHaveText(text);
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

test('LAS-45: instruments are sourced — real-time panels, offline values only after Analyze, no invented numbers', async ({ page }) => {
  await page.goto('/');
  for (const id of ['a', 'b', 'c', 'd']) {
    await switcher(page).selectOption(id);
    const measured = page.getByTestId('measured-panel');
    await expect(measured).toHaveAttribute('data-measured', 'false');
    await expect(measured).toContainText('Not analyzed yet');
    await expect(measured).toContainText('Real-time LUFS and true peak: not available');
  }
  await switcher(page).selectOption('c');
  await expect(page.getByTestId('realtime-panel')).toContainText('Real-time · monitor output');
  await loadTone(page, 5);
  await page.getByRole('button', { name: 'Analyze' }).click();
  const dialog = page.getByRole('dialog', { name: 'Track analysis' });
  await expect(dialog.getByRole('status')).toHaveText('Analysis complete.', { timeout: 30000 });
  await dialog.getByRole('button', { name: 'Close analysis' }).click();
  for (const id of ['c', 'a', 'b', 'd']) {
    await switcher(page).selectOption(id);
    const measured = page.getByTestId('measured-panel');
    await expect(measured).toHaveAttribute('data-measured', 'true');
    await expect(measured).toContainText('Offline analysis (whole file)');
    await expect(measured).toContainText('LUFS');
    await expect(measured).toContainText('dBTP');
  }
});

test('LAS-45: stem channels are a read-only view of the real stem session; the AI slot is stable', async ({ page }) => {
  await page.goto('/');
  for (const [id] of LAYOUTS) {
    await switcher(page).selectOption(id);
    await expect(page.locator('[data-slot="ai-coproducer"]')).toHaveCount(1);
  }
  for (const id of ['b', 'd']) {
    await switcher(page).selectOption(id);
    const strips = page.getByTestId('stem-strips');
    await expect(strips).toContainText('No stems in this session');
    await expect(strips).toContainText('Read-only view');
    await strips.getByRole('button', { name: 'Open Stems mixer' }).click();
    await expect(page.getByRole('dialog', { name: 'Stem session' })).toBeVisible();
    await page.getByRole('button', { name: 'Close stems' }).click();
  }
});

test('LAS-45: controls expose accessible names in every layout', async ({ page }) => {
  await page.goto('/');
  for (const [id] of LAYOUTS.slice(1)) {
    await switcher(page).selectOption(id);
    await expect(page.getByRole('complementary', { name: 'Studio instruments' })).toBeVisible();
    await expect(page.getByRole('complementary', { name: 'Selected processor inspector' }).or(page.locator('main[data-layout="b"]'))).toBeAttached();
    await expect(page.getByRole('group', { name: 'Processing modules' })).toBeVisible();
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
      await expect(page.getByRole('button', { name: /Export/ }).first()).toBeAttached();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await page.screenshot({ path: testInfo.outputPath(`layout-${id}-${viewport.width}x${viewport.height}.png`), fullPage: true });
    });
  }
}

// Review screenshots (committed under docs/screenshots/LAS-45): run with LAS45_SHOTS=1.
test.describe('review screenshots', () => {
  test.skip(!process.env.LAS45_SHOTS, 'only when LAS45_SHOTS=1');
  for (const viewport of [{ width: 1920, height: 1080 }, { width: 1280, height: 720 }, { width: 1024, height: 768 }, { width: 761, height: 450 }]) {
    for (const [id] of LAYOUTS) {
      test(`shot ${id} ${viewport.width}x${viewport.height}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/');
        await loadTone(page, 20);
        await page.getByRole('button', { name: 'Analyze' }).click();
        const dialog = page.getByRole('dialog', { name: 'Track analysis' });
        await expect(dialog.getByRole('status')).toHaveText('Analysis complete.', { timeout: 30000 });
        await dialog.getByRole('button', { name: 'Close analysis' }).click();
        await switcher(page).selectOption(id);
        await transportOf(page).getByRole('button', { name: 'Play', exact: true }).click();
        await expect(transportOf(page).getByRole('status')).toHaveText('Playing');
        await page.waitForTimeout(1200);
        await page.screenshot({ path: `docs/screenshots/LAS-45/${id}-${viewport.width}x${viewport.height}.png`, fullPage: true });
      });
    }
  }
});
