import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { STRIP_BUTTONS } from './helpers/layout.js';

// Every test opens its own page, so they can share workers.
test.describe.configure({ mode: 'parallel' });

// Desktop acceptance range: width >= 761 and height >= 450 CSS pixels. At 760px and below the
// layout stacks and the page scrolls.
const STACKED_MAX_WIDTH = 760;
const MIN_DESKTOP_HEIGHT = 450;

// One continuous sequence per test, without reloading: regression samples (776x888, 817x598,
// 785x520, 989x610, 971x553, 804x471, 784x626), larger views, the corners of the acceptance range,
// intermediate sizes, width-only and height-only changes, breakpoint crossings in both directions,
// shrinking and growing back.
const VIEWPORTS = [
  [1920, 1080], [1440, 900], [776, 888], [1280, 720], [990, 661], [989, 610], [784, 626], [817, 598],
  [803, 615], [971, 553], [900, 560], [785, 520], [804, 471], [761, 450], [1440, 450], [1280, 520],
  [1100, 600], [761, 520], [760, 520], [759, 598], [762, 598], [600, 650], [761, 650], [760, 650],
  [785, 900], [776, 888], [990, 661], [1440, 900], [1920, 1080],
];
// The long-file-name and load-error states use the regression samples and range corners.
const STATE_VIEWPORTS = [
  [776, 888], [1440, 900], [1280, 720], [989, 610], [784, 626], [817, 598], [971, 553], [785, 520],
  [804, 471], [761, 450], [1440, 450], [760, 520], [600, 650], [761, 520],
];
// Strip names and buttons follow the LAS-28 modules (EQ, Dynamics, Limiter) and the Space placeholder.
const STRIPS = Object.keys(STRIP_BUTTONS);
const LONG_NAME = 'Final master for the album release - extended club version (24-bit, 2026 remaster).wav';

const describe = locator => locator.evaluate(e => e.getAttribute('aria-label') || e.textContent.trim());

// Stacked layout only: scroll the page so the element sits mid-viewport. Edge alignment
// (scrollIntoViewIfNeeded) uses whole-pixel offsets and can leave a fraction of a pixel clipped.
const scrollPageTo = locator => locator.evaluate(e => e.scrollIntoView({ block: 'center' }));

// toBeInViewport does not detect overlays, so hit-test the centre and the middle of each edge.
async function expectUnobscured(locator, message) {
  const coveredPoints = await locator.evaluate(element => {
    const box = element.getBoundingClientRect();
    const points = [
      [box.left + box.width / 2, box.top + box.height / 2],
      [box.left + 2, box.top + box.height / 2], [box.right - 2, box.top + box.height / 2],
      [box.left + box.width / 2, box.top + 2], [box.left + box.width / 2, box.bottom - 2],
    ];
    return points.filter(([x, y]) => !element.contains(document.elementFromPoint(x, y))).length;
  });
  expect(coveredPoints, message).toBe(0);
}

async function expectFullyVisible(locator, message) {
  await expect(locator, message).toBeInViewport({ ratio: 1 });
  await expectUnobscured(locator, `${message} (not covered)`);
}

function overlaps(a, b) {
  return a.x < b.x + b.width - 0.5 && b.x < a.x + a.width - 0.5
    && a.y < b.y + b.height - 0.5 && b.y < a.y + a.height - 0.5;
}

const scrollState = scroller => scroller.evaluate(e => ({
  clientHeight: e.clientHeight, scrollHeight: e.scrollHeight, scrollTop: e.scrollTop,
}));

// Panels never overlap, and Export keeps its own space below the scrollable Master details.
async function checkPanels(page, label) {
  const master = page.getByRole('region', { name: 'Master', exact: true });
  const panels = {
    Transport: page.getByRole('region', { name: 'Transport' }), Tracks: page.getByRole('region', { name: 'Tracks', exact: true }),
    Master: master, Mixer: page.getByRole('region', { name: 'Mixer', exact: true }), Footer: page.locator('footer'),
  };
  const boxes = {};
  for (const [name, panel] of Object.entries(panels)) boxes[name] = await panel.boundingBox();
  const names = Object.keys(boxes);
  for (const [index, a] of names.entries()) {
    for (const b of names.slice(index + 1)) expect(overlaps(boxes[a], boxes[b]), `${label}: ${a} overlaps ${b}`).toBe(false);
  }
  const bodyBox = await master.getByRole('region', { name: 'Master details' }).boundingBox();
  const exportBox = await master.getByRole('button', { name: 'Export WAV' }).boundingBox();
  expect(exportBox.y, `${label}: Export starts below the Master details`).toBeGreaterThanOrEqual(bodyBox.y + bodyBox.height - 0.5);
  expect(exportBox.y + exportBox.height, `${label}: Export stays inside Master`).toBeLessThanOrEqual(boxes.Master.y + boxes.Master.height + 0.5);
}

// Desktop only, immediately after resizing and before any scrolling: no page overflow, every
// essential element and the whole footer fully visible and uncovered, nothing overlapping.
async function checkEssentialsBeforeScrolling(page, label) {
  const { width, height } = page.viewportSize();
  const documentSize = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
    scrollY: window.scrollY,
  }));
  expect(documentSize.scrollY, `${label}: page not scrolled`).toBe(0);
  expect(documentSize.width, `${label}: no horizontal page overflow`).toBeLessThanOrEqual(width);
  expect(documentSize.height, `${label}: no vertical page overflow`).toBeLessThanOrEqual(height);
  const transport = page.getByRole('region', { name: 'Transport' });
  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  const master = page.getByRole('region', { name: 'Master', exact: true });
  const masterBody = master.getByRole('region', { name: 'Master details' });
  const strips = page.getByRole('group', { name: 'Processing modules' });
  const essentials = [
    ...['Play', 'Pause', 'Stop'].map(name => [name, transport.getByRole('button', { name })]),
    ['playback status', transport.getByRole('status')],
    ['Tracks heading', tracks.getByRole('heading', { name: 'Tracks', exact: true })],
    ['Import/Replace WAV', tracks.getByRole('button', { name: 'Import WAV', exact: true })],
    ['Master heading', master.getByRole('heading', { name: 'Master', exact: true })],
    ['Master level', master.getByRole('slider', { name: 'Master level' })],
    ['Export WAV', master.getByRole('button', { name: 'Export WAV' })],
    ...STRIPS.flatMap(name => {
      const strip = strips.getByRole('region', { name: `${name} channel strip` });
      return [
        [`${name} heading`, strip.getByRole('heading', { name, exact: true })],
        [`${name} indicator`, strip.locator('.knob, .strip-visual')],
        [`${name} button`, strip.getByRole('button', { name: STRIP_BUTTONS[name] })],
      ];
    }),
    ['footer', page.locator('footer')],
  ];
  const alert = page.getByRole('alert');
  if (await alert.count()) essentials.push(['load error message', alert]);
  for (const [name, element] of essentials) {
    await expectFullyVisible(element, `${label}: ${name} visible before scrolling`);
  }
  await expect(masterBody.getByRole('slider'), `${label}: Master level sits outside the details scroller`).toHaveCount(0);
  const mixer = await scrollState(strips);
  expect(mixer.scrollTop, `${label}: Mixer not scrolled`).toBe(0);
  expect(mixer.scrollHeight, `${label}: Mixer shows all its content without inner scrolling`).toBeLessThanOrEqual(mixer.clientHeight + 1);
  // Text and the file button must keep their full height inside the Tracks area: neither spill
  // out nor collapse. Only the decorative icon may shrink.
  const squeezed = await tracks.evaluate(panel => {
    const area = panel.querySelector('.track-space').getBoundingClientRect();
    return [...panel.querySelectorAll('.track-content > :not(.audio-icon)')].filter(e => {
      const box = e.getBoundingClientRect();
      return box.top < area.top - 0.5 || box.bottom > area.bottom + 0.5 || e.scrollHeight > e.clientHeight + 1;
    }).map(e => e.className || e.tagName.toLowerCase());
  });
  expect(squeezed, `${label}: Tracks text and file button fully shown inside their area`).toEqual([]);
  await checkPanels(page, label);
}

// Programmatic scrolling proves the content is reachable; it says nothing about the keyboard.
async function checkScrollerEnds(scroller, firstItems, lastItems, stacked, label) {
  const { clientHeight, scrollHeight } = await scrollState(scroller);
  if (stacked) {
    expect(scrollHeight, `${label}: stacked layout keeps the panel unbounded`).toBeLessThanOrEqual(clientHeight + 1);
  }
  for (const [end, items] of [['top', firstItems], ['bottom', lastItems]]) {
    await scroller.evaluate((e, top) => { e.scrollTop = top ? 0 : e.scrollHeight; }, end === 'top');
    for (const item of items) {
      if (stacked) await scrollPageTo(item);
      await expectFullyVisible(item, `${label}: "${await describe(item)}" visible at the ${end}`);
    }
  }
}

// Real keyboard operation: Tab from Import WAV to the scroller, End to its bottom, Home back.
// End is the platform-neutral key: Playwright sends it with the macOS scrollToEndOfDocument:
// editing command, and Chromium on Windows/Linux scrolls with it natively. Control+End is a
// Windows/Linux document shortcut, not a macOS scrolling key.
// Since LAS-28 real controls sit between Import WAV and the mixer (Original/Processed, Match
// loudness, Export, Undo/Redo, Settings), so the Tab budget is 12 instead of 4.
async function checkKeyboardScroll(page, scroller, first, last, label) {
  await page.getByRole('button', { name: 'Import WAV', exact: true }).focus();
  for (let presses = 0; presses < 12 && !(await scroller.evaluate(e => e === document.activeElement)); presses++) {
    await page.keyboard.press('Tab');
  }
  await expect(scroller, `${label}: reachable with Tab`).toBeFocused();
  expect(await scroller.evaluate(e => e.matches(':focus-visible')), `${label}: focus ring shown`).toBe(true);
  await scroller.evaluate(e => { e.scrollTop = 0; });
  const { clientHeight, scrollHeight } = await scrollState(scroller);
  if (scrollHeight <= clientHeight + 1) {
    // Nothing to scroll: every item must already be visible, so no scrolling is asserted.
    await expect(last, `${label}: fits without scrolling`).toBeInViewport({ ratio: 1 });
    return;
  }
  await page.keyboard.press('End');
  await expect.poll(async () => (await scrollState(scroller)).scrollTop, { message: `${label}: End scrolls to the bottom` })
    .toBeGreaterThanOrEqual(scrollHeight - clientHeight - 1);
  await expect(scroller, `${label}: focus stays on the scroller`).toBeFocused();
  await expect(last, `${label}: last item visible after End`).toBeInViewport({ ratio: 1 });
  await page.keyboard.press('Home');
  await expect.poll(async () => (await scrollState(scroller)).scrollTop, { message: `${label}: Home returns to the top` })
    .toBe(0);
  await expect(first, `${label}: first item visible after Home`).toBeInViewport({ ratio: 1 });
}

async function checkLayout(page, label) {
  const { width } = page.viewportSize();
  const stacked = width <= STACKED_MAX_WIDTH;
  const transport = page.getByRole('region', { name: 'Transport' });
  const master = page.getByRole('region', { name: 'Master', exact: true });
  const masterBody = master.getByRole('region', { name: 'Master details' });
  const strips = page.getByRole('group', { name: 'Processing modules' });
  const outputStage = masterBody.getByText('OUTPUT STAGE');
  const lastDetail = masterBody.locator('.loudness-match p'); // the last line of the details (LAS-28)
  const stripTitles = STRIPS.map(name => strips.getByRole('heading', { name, exact: true }));
  const stripButtons = STRIPS.map(name => strips.getByRole('button', { name: STRIP_BUTTONS[name] }));

  if (stacked) {
    // Stacked layout: the page scrolls, Transport stays at the top and the rest must be reachable.
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(pageWidth, `${label}: no horizontal page overflow`).toBeLessThanOrEqual(width);
    await expect(transport, `${label}: Transport visible`).toBeInViewport({ ratio: 1 });
    for (const name of ['Play', 'Pause', 'Stop']) {
      await expectFullyVisible(transport.getByRole('button', { name }), `${label}: ${name} visible`);
    }
    const reachable = [
      ['Import WAV', page.getByRole('button', { name: 'Import WAV', exact: true })],
      ['Master level', master.getByRole('slider', { name: 'Master level' })],
      ['Export WAV', master.getByRole('button', { name: 'Export WAV' })],
      ['footer', page.locator('footer')],
    ];
    if (await page.getByRole('alert').count()) reachable.push(['load error message', page.getByRole('alert')]);
    for (const [name, element] of reachable) {
      await scrollPageTo(element);
      await expectFullyVisible(element, `${label}: ${name} reachable`);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await checkPanels(page, label);
  } else {
    await checkEssentialsBeforeScrolling(page, label);
  }

  // Supplementary Master details may scroll: both ends reachable and unobscured.
  await checkScrollerEnds(masterBody, [outputStage], [lastDetail], stacked, `${label} Master details`);
  if (stacked) {
    await checkScrollerEnds(strips, stripTitles, stripButtons, true, `${label} Mixer`);
    await page.evaluate(() => window.scrollTo(0, 0));
    return;
  }
  await checkKeyboardScroll(page, masterBody, outputStage, lastDetail, `${label} Master details keyboard`);
  await checkKeyboardScroll(page, strips, stripTitles[0], stripButtons[3], `${label} Mixer keyboard`);
}

async function runViewports(page, testInfo, prefix, viewports) {
  for (const [width, height] of viewports) {
    const label = `${prefix} ${width}x${height}`;
    await test.step(label, async () => {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => {
        window.scrollTo(0, 0);
        document.querySelectorAll('.master-body, .strips').forEach(e => { e.scrollTop = 0; });
      });
      // Saved before the checks, so a failing step leaves a screenshot named by its size.
      await page.screenshot({ path: testInfo.outputPath(`${prefix}-${width}x${height}.png`), fullPage: width <= STACKED_MAX_WIDTH });
      await checkLayout(page, label);
    });
  }
}

for (const loaded of [false, true]) {
  const state = loaded ? 'WAV-loaded' : 'empty';
  test(`LAS-51: ${state} layout survives viewport changes`, async ({ page }, testInfo) => {
    test.setTimeout(240_000); // 29 viewports with geometry and keyboard checks in one page.
    await page.goto('/');
    if (loaded) {
      await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
      await expect(page.getByRole('status')).toHaveText('Ready');
    }
    await runViewports(page, testInfo, state, VIEWPORTS);
  });
}

test('LAS-51: long file name keeps essential controls visible', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/');
  await page.getByLabel('Import WAV').setInputFiles({ name: LONG_NAME, mimeType: 'audio/wav', buffer: makeWav() });
  await expect(page.getByRole('status')).toHaveText('Ready');
  // A long name is shortened on screen; the heading keeps the full name and shows it on hover.
  await expect(page.getByRole('heading', { name: LONG_NAME, exact: true })).toHaveAttribute('title', LONG_NAME);
  await runViewports(page, testInfo, 'long-name', STATE_VIEWPORTS);
});

test('LAS-51: load error keeps essential controls visible', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await page.goto('/');
  const upload = page.getByLabel('Import WAV');
  await upload.setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await upload.setInputFiles({ name: 'broken.wav', mimeType: 'audio/wav', buffer: Buffer.from('RIFF0000WAVE') });
  await expect(page.getByRole('alert')).toContainText('Unable to decode');
  await runViewports(page, testInfo, 'load-error', STATE_VIEWPORTS);
  await expect(page.getByRole('heading', { name: 'tone.wav' })).toBeVisible();
});

// Denser sweep between the named samples: height-only changes at three widths and a width-only
// change at the smallest desktop height. A finite sweep still does not prove every size.
const SWEEPS = {
  'height 450-1080 at width 761': Array.from({ length: 22 }, (_, i) => [761, MIN_DESKTOP_HEIGHT + i * 30]),
  'height 450-1080 at width 1024': Array.from({ length: 22 }, (_, i) => [1024, MIN_DESKTOP_HEIGHT + i * 30]),
  'height 450-1080 at width 1440': Array.from({ length: 22 }, (_, i) => [1440, MIN_DESKTOP_HEIGHT + i * 30]),
  'width 761-1440 at height 450': Array.from({ length: 8 }, (_, i) => [761 + i * 97, MIN_DESKTOP_HEIGHT]),
};
for (const [name, sizes] of Object.entries(SWEEPS)) {
  test(`LAS-51: essential controls visible before scrolling, ${name}`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto('/');
    for (const [width, height] of sizes) {
      await test.step(`empty ${width}x${height}`, async () => {
        await page.setViewportSize({ width, height });
        await checkEssentialsBeforeScrolling(page, `empty ${width}x${height}`);
      });
    }
  });
}

test('LAS-51: playback state survives viewport changes', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await page.getByRole('button', { name: 'Play' }).click();
  // The 3-second fixture is still playing while the layout switches between desktop and stacked.
  for (const [width, height] of [[785, 520], [600, 650], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await expect(page.getByRole('status'), `playing at ${width}x${height}`).toHaveText('Playing');
  }
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.getByRole('status')).toHaveText('Paused');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('status')).toHaveText('Playing');
  await page.getByRole('button', { name: 'Stop' }).click();
  await expect(page.getByRole('status')).toHaveText('Stopped');
  await expect(page.getByRole('heading', { name: 'tone.wav' })).toBeVisible();
});
