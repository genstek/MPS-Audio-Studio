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
const box = async (page, selector) => ((await page.locator(selector).count()) ? page.locator(selector).first().boundingBox() : null);
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
    await expect(page.getByRole('heading', { level: 3, name: 'long-tone.wav', exact: true })).toBeVisible();
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

test('LAS-45: layouts follow the approved concept compositions, not recolours', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  const geometry = {};
  for (const [id] of LAYOUTS.slice(1)) {
    await switcher(page).selectOption(id);
    const [rail, stage, bank, tracks, master, inspector] = await Promise.all(['.part.rail', '.part.stage', '.part.bank', '.tracks', '.master', '#inspector-region'].map(s => box(page, s)));
    geometry[id] = { rail, stage, bank, tracks, master, inspector };
  }
  const right = b => b.x + b.width;
  const { a, b, c, d } = geometry;
  // A: left rail; EQ/analyzer stage over a strip bank; master over inspector in the right column.
  expect(right(a.rail)).toBeLessThanOrEqual(a.stage.x + 1);
  expect(a.bank.y).toBeGreaterThan(a.stage.y + a.stage.height - 2);
  expect(a.master.x).toBeGreaterThan(right(a.stage) - 2);
  expect(a.inspector.x).toBeGreaterThan(right(a.bank) - 2);
  expect(a.inspector.y).toBeGreaterThan(a.master.y);
  // B: strip wall first with a tall master beside it; analysis dock underneath; no inspector.
  expect(b.bank.y).toBeLessThan(b.stage.y);
  expect(b.master.x).toBeGreaterThan(right(b.bank) - 2);
  expect(b.master.height).toBeGreaterThan(400);
  expect(b.stage.y).toBeGreaterThan(b.bank.y + b.bank.height - 2); // analysis dock under the wall
  expect(b.bank.width).toBeGreaterThan(b.master.width * 4);
  expect(b.inspector).toBeNull();
  expect(b.rail).toBeNull();
  // C: five-panel analysis row on top, then inspector, then the full-width bank with master at right.
  expect(c.stage.y).toBeLessThan(c.bank.y);
  expect(c.inspector.y).toBeGreaterThan(c.stage.y + c.stage.height - 2);
  expect(c.bank.y).toBeGreaterThan(c.inspector.y);
  expect(c.master.x).toBeGreaterThan(right(c.bank) - 2);
  expect(c.bank.width).toBeGreaterThan(c.stage.width * 0.7);
  // D: nav | selected channel | strips | master rack, all side by side.
  expect(right(d.rail)).toBeLessThanOrEqual(d.inspector.x + 1);
  expect(right(d.inspector)).toBeLessThanOrEqual(d.bank.x + 1);
  expect(right(d.bank)).toBeLessThanOrEqual(d.master.x + 1);
  expect(Math.abs(d.inspector.y - d.bank.y)).toBeLessThan(4);
  // The four differ in where the analysis stage sits relative to the strip bank.
  const signature = id => [Math.sign(Math.round(geometry[id].stage.y - geometry[id].bank.y)), Math.round(geometry[id].master.width / 40), geometry[id].rail ? 1 : 0].join(':');
  expect(new Set(['a', 'b', 'c', 'd'].map(signature)).size).toBe(4);
});

test('LAS-45: B, C and D use an upright master fader that is still the real control', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await loadTone(page);
  const fader = page.getByRole('slider', { name: 'Master level' });
  const before = await fader.boundingBox();
  expect(before.width).toBeGreaterThan(before.height); // Classic: horizontal
  for (const id of ['b', 'c', 'd']) {
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
    const measured = page.getByTestId('measured-panel').or(page.getByTestId('loudness-panel')).first();
    await expect(measured).toHaveAttribute('data-measured', 'false');
    await expect(measured).toContainText('Not analyzed yet');
    await expect(page.getByTestId('master-instruments')).toContainText('LUFS/TP: offline Analyze only');
    await expect(page.getByTestId('stereo-panel').or(page.locator('[data-layout="a"]')).first()).toBeAttached();
  }
  await switcher(page).selectOption('c');
  await expect(page.getByTestId('realtime-panel')).toContainText('Spectrum · real-time');
  await loadTone(page, 5);
  await page.getByRole('button', { name: 'Analyze' }).click();
  const dialog = page.getByRole('dialog', { name: 'Track analysis' });
  await expect(dialog.getByRole('status')).toHaveText('Analysis complete.', { timeout: 30000 });
  await dialog.getByRole('button', { name: 'Close analysis' }).click();
  for (const id of ['c', 'a', 'b', 'd']) {
    await switcher(page).selectOption(id);
    const measured = page.getByTestId('measured-panel').or(page.getByTestId('loudness-panel')).first();
    await expect(measured).toHaveAttribute('data-measured', 'true');
    await expect(page.getByTestId('master-instruments')).toContainText('LUFS (I)');
    await expect(page.getByTestId('master-instruments')).not.toContainText('Not analyzed');
    await expect(measured).toContainText('LUFS');
  }
});

test('LAS-45: stem channels are a read-only view of the real stem session; the AI slot is stable', async ({ page }) => {
  await page.goto('/');
  for (const [id] of LAYOUTS) {
    await switcher(page).selectOption(id);
    await expect(page.locator('[data-slot="ai-coproducer"]')).toHaveCount(1);
  }
  for (const id of ['a', 'b', 'c', 'd']) {
    await switcher(page).selectOption(id);
    const strips = page.getByTestId('stem-strips');
    await expect(strips).toHaveAttribute('data-real-strips', '0');
    await expect(strips).toContainText('none loaded');
    await expect(strips).toContainText('Read-only here');
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

// Console fit (>= 1200 x 700): layouts A-D are one screen tall. The page itself never scrolls;
// only strip banks, racks and panels scroll inside. Geometry only: no claim about audio.
const FIT = [{ width: 1672, height: 941 }, { width: 1920, height: 1080 }, { width: 1440, height: 900 }, { width: 1280, height: 720 }];
const fitControls = page => {
  const transport = transportOf(page);
  return [
    ...['Play', 'Pause', 'Stop', 'Rewind 5 seconds', 'Fast forward 5 seconds'].map(name => transport.getByRole('button', { name, exact: true })),
    transport.getByRole('status'), transport.getByRole('timer', { name: 'Playback position' }),
    switcher(page), page.getByTestId('build-identity'), page.getByRole('slider', { name: 'Timeline' }),
    page.getByRole('button', { name: 'Import WAV', exact: true }), page.getByRole('button', { name: 'Analyze' }),
    page.getByRole('slider', { name: 'Master level' }), page.getByRole('button', { name: 'Export WAV', exact: true }),
    page.getByRole('radio', { name: 'Processed' }), page.getByRole('radio', { name: 'Original' }),
    page.getByRole('button', { name: 'Undo', exact: true }).first(), page.getByRole('button', { name: 'Stems…' }),
    ...['Edit EQ', 'Edit dynamics', 'Edit limiter', 'Edit space'].map(name => page.getByRole('button', { name })),
    page.getByTestId('stem-strips').getByRole('button', { name: 'Open Stems mixer' }),
  ];
};
for (const viewport of FIT) {
  for (const [id, label] of LAYOUTS.slice(1)) {
    test(`LAS-45: ${label} fits one ${viewport.width}x${viewport.height} screen with internal scrolling only`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await page.goto('/');
      await loadTone(page, 5);
      await switcher(page).selectOption(id);
      const doc = () => page.evaluate(() => ({ h: document.documentElement.scrollHeight, w: document.documentElement.scrollWidth, y: window.scrollY, x: window.scrollX }));
      expect(await doc()).toEqual({ h: viewport.height, w: viewport.width, y: 0, x: 0 });
      // Every console region lies inside the viewport.
      for (const selector of ['.masthead', '.transport', '.tracks', '.master', '.mixer', '.part.bank', '.part.stage', 'main > footer']) {
        const region = await box(page, selector);
        expect(region, selector).not.toBeNull();
        expect(region.x, selector).toBeGreaterThanOrEqual(0);
        expect(region.y, selector).toBeGreaterThanOrEqual(0);
        expect(region.x + region.width, selector).toBeLessThanOrEqual(viewport.width + 0.5);
        expect(region.y + region.height, selector).toBeLessThanOrEqual(viewport.height + 0.5);
        expect(region.height, selector).toBeGreaterThan(10);
      }
      // The bank shows its strips at a usable height and scrolls sideways inside itself.
      const bank = page.locator('.bank-scroll');
      expect((await bank.boundingBox()).height).toBeGreaterThan(viewport.height * 0.22);
      expect(await bank.evaluate(node => getComputedStyle(node).overflowX)).toBe('auto');
      // Real controls are reachable without moving the page (a panel may scroll inside).
      const primary = viewport.height >= 900 && viewport.width >= 1600;
      for (const control of fitControls(page)) {
        if (!primary) await control.scrollIntoViewIfNeeded();
        await expect(control).toBeInViewport({ ratio: 1 });
      }
      expect(await doc()).toEqual({ h: viewport.height, w: viewport.width, y: 0, x: 0 });
      // Keyboard: the switcher and the master fader take focus and respond.
      await page.getByRole('slider', { name: 'Master level' }).focus();
      await page.keyboard.press('Home');
      await expect(page.locator('.master-value')).toHaveText('−∞ dB');
      await page.keyboard.press('End');
      await expect(page.locator('.master-value')).toHaveText('0.0 dB');
      expect((await doc()).y).toBe(0);
    });
  }
}

test('LAS-45: playback continues and the page stays put while an inner panel scrolls (fit mode)', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await loadTone(page);
  const transport = transportOf(page);
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('Playing');
  for (const id of ['a', 'b', 'c', 'd']) {
    await switcher(page).selectOption(id);
    await page.locator('.bank-scroll').evaluate(node => { node.scrollLeft = node.scrollWidth; });
    await page.getByRole('button', { name: 'Edit space' }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button', { name: 'Edit space' })).toBeInViewport({ ratio: 1 });
    await expect(transport.getByRole('status')).toHaveText('Playing');
    expect(await page.evaluate(() => window.scrollY)).toBe(0);
  }
  await transport.getByRole('button', { name: 'Stop', exact: true }).click();
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

// Stage 1 honesty: strips are real stems only; every other position is an inert PLANNED slot.
const SLOTS = { a: 15, b: 24, c: 16, d: 8 };
test('LAS-45: real stems become strips; empty positions are inert PLANNED slots with no fake controls', async ({ page }) => {
  await page.goto('/');
  await loadTone(page, 5);
  await page.getByRole('button', { name: 'Stems…' }).click();
  const stems = page.getByRole('dialog', { name: 'Stem session' });
  const wav = makeWav({ seconds: 2, channels: 2 });
  await stems.getByLabel('Add stem WAVs').setInputFiles([{ name: 'Kick.wav', mimeType: 'audio/wav', buffer: wav }, { name: 'Bass.wav', mimeType: 'audio/wav', buffer: wav }]);
  await expect(stems.getByRole('status')).toHaveText(/^2 stem/);
  await stems.getByRole('slider', { name: 'Gain (dB)' }).first().fill('-6');
  await stems.getByRole('button', { name: 'Close stems' }).click();
  for (const id of ['a', 'b', 'c', 'd']) {
    await switcher(page).selectOption(id);
    const bank = page.getByTestId('stem-strips');
    await expect(bank).toHaveAttribute('data-real-strips', '2');
    await expect(bank.locator('[data-real="true"]')).toHaveCount(2);
    await expect(bank.locator('[data-real="true"]').first()).toContainText('Kick.wav');
    await expect(bank.locator('[data-planned="true"]')).toHaveCount(SLOTS[id] - 2);
    // Planned slots: hidden from assistive tech, not focusable, no inputs, no meters, no names.
    const planned = bank.locator('[data-planned="true"]');
    await expect(planned.first()).toHaveAttribute('aria-hidden', 'true');
    await expect(planned.locator('input, button, [role="slider"], [role="meter"], [tabindex]')).toHaveCount(0);
    // No meters in strips at all (per-stem meters need Stage 2).
    await expect(bank.locator('[role="meter"]')).toHaveCount(0);
    // The strip's gain is the real stem gain (−6.0 dB on the first stem), read-only.
    await expect(bank.locator('[data-real="true"]').first().locator('output')).toHaveText('−6.0');
    await expect(bank.locator('[data-real="true"] input')).toHaveCount(0);
  }
});

test('LAS-45: inspector knobs drive the real compressor, share undo, and survive layout switches', async ({ page }) => {
  await page.goto('/');
  await loadTone(page, 5);
  await switcher(page).selectOption('a');
  const threshold = page.getByTestId('inspector').getByRole('slider', { name: 'Threshold' });
  await expect(threshold).toHaveAttribute('aria-valuenow', '-18');
  await threshold.focus();
  await page.keyboard.press('ArrowUp');
  await expect(threshold).toHaveAttribute('aria-valuenow', '-17');
  await switcher(page).selectOption('c');
  await expect(page.getByTestId('inspector').getByRole('slider', { name: 'Threshold' })).toHaveAttribute('aria-valuenow', '-17');
  await page.getByRole('button', { name: 'Undo', exact: true }).first().click();
  await expect(page.getByTestId('inspector').getByRole('slider', { name: 'Threshold' })).toHaveAttribute('aria-valuenow', '-18');
  // The compressor curve and EQ view are drawn from the same params.
  await expect(page.getByTestId('dynamics-view')).toContainText('thr -18 dB');
  await expect(page.getByTestId('eq-view')).toBeVisible();
});
