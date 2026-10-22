import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

const DESKTOP_SAMPLES = [
  [776, 888], [817, 598], [785, 520], [989, 610], [971, 553],
  [804, 471], [784, 626], [1440, 900], [1280, 720], [990, 661],
  [900, 560], [850, 500], [820, 480], [761, 450], [900, 450],
  [1100, 700], [803, 615], [762, 598], [800, 550],
];

const RESIZE_SEQUENCE = [
  [1440, 900], [817, 598], [785, 520], [804, 471], [761, 450],
  [776, 888], [971, 553], [989, 610], [784, 626], [1280, 720],
];

function corruptWav() {
  return Buffer.from('not-a-wav-file');
}

async function assertNoDocumentOverflow(page) {
  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollHeight: document.documentElement.scrollHeight,
    clientHeight: document.documentElement.clientHeight,
    innerHeight,
  }));
  expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.clientWidth);
  expect(metrics.scrollHeight).toBeLessThanOrEqual(Math.max(metrics.clientHeight, metrics.innerHeight));
}

async function assertFullyVisible(locator) {
  await expect(locator).toBeVisible();
  await expect(locator).toBeInViewport({ ratio: 1 });
}

async function assertNoPanelOverlap(page) {
  const boxes = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { top: r.top, left: r.left, right: r.right, bottom: r.bottom };
    };
    return {
      transport: pick('.transport'),
      tracks: pick('.tracks'),
      master: pick('.master'),
      mixer: pick('.mixer'),
      footer: pick('footer'),
    };
  });
  const pairs = [
    ['transport', 'tracks'],
    ['transport', 'master'],
    ['tracks', 'mixer'],
    ['master', 'mixer'],
    ['mixer', 'footer'],
  ];
  for (const [a, b] of pairs) {
    const A = boxes[a];
    const B = boxes[b];
    expect(A && B, `${a}/${b} missing`).toBeTruthy();
    const overlap = !(A.bottom <= B.top + 1 || B.bottom <= A.top + 1
      || A.right <= B.left + 1 || B.right <= A.left + 1);
    if (a === 'tracks' && b === 'mixer') {
      expect(A.bottom).toBeLessThanOrEqual(B.top + 1);
    } else if (a === 'master' && b === 'mixer') {
      expect(A.bottom).toBeLessThanOrEqual(B.top + 1);
    } else if (a === 'mixer' && b === 'footer') {
      expect(A.bottom).toBeLessThanOrEqual(B.top + 1);
    } else if (overlap && A.bottom > B.top + 1 && B.bottom > A.top + 1
      && A.right > B.left + 1 && B.right > A.left + 1) {
      throw new Error(`Unexpected overlap between ${a} and ${b}`);
    }
  }
  expect(boxes.tracks.right).toBeLessThanOrEqual(boxes.master.left + 1);
}

async function assertEssentialsVisible(page, { importName = 'Import WAV' } = {}) {
  // Intentionally no programmatic scrolling before these checks.
  const transport = page.getByRole('region', { name: 'Transport' });
  await assertFullyVisible(transport);
  for (const name of ['Play', 'Pause', 'Stop']) {
    await assertFullyVisible(transport.getByRole('button', { name }));
  }
  await assertFullyVisible(page.getByRole('status'));

  await assertFullyVisible(page.getByRole('heading', { name: 'Tracks', exact: true }));
  // Accessible name stays "Import WAV"; visible label may read Replace WAV after a load.
  const upload = page.getByLabel('Import WAV');
  await assertFullyVisible(upload);
  await expect(page.locator('.file-picker')).toContainText(importName);

  await assertFullyVisible(page.getByRole('heading', { name: 'Master', exact: true }));
  await assertFullyVisible(page.getByLabel('Master level'));
  await assertFullyVisible(page.getByRole('button', { name: 'Export WAV — coming soon' }));

  const level = page.getByLabel('Master level');
  const exportButton = page.getByRole('button', { name: 'Export WAV — coming soon' });
  const details = page.getByRole('region', { name: 'Master details' });
  const levelBox = await level.boundingBox();
  const exportBox = await exportButton.boundingBox();
  const detailsBox = await details.boundingBox();
  expect(levelBox && exportBox && detailsBox).toBeTruthy();
  expect(detailsBox.y + detailsBox.height).toBeLessThanOrEqual(levelBox.y + 1);
  expect(levelBox.y + levelBox.height).toBeLessThanOrEqual(exportBox.y + 1);

  await assertFullyVisible(page.getByRole('heading', { name: 'Mixer', exact: true }));
  for (const name of ['Input', 'EQ', 'Dynamics', 'Space']) {
    await assertFullyVisible(page.getByRole('heading', { name, exact: true }));
    await assertFullyVisible(page.locator(`.strip[aria-label="${name} channel strip"] .knob`));
    await assertFullyVisible(page.getByRole('button', { name: `${name} processing unavailable` }));
  }

  const footer = page.locator('footer');
  await assertFullyVisible(footer);
  await assertFullyVisible(footer.getByText('LOCAL / WEB AUDIO'));
  await assertFullyVisible(footer.getByText(/Playback foundation/));

  await assertNoDocumentOverflow(page);
  await assertNoPanelOverlap(page);
}

async function loadTone(page, name = 'tone.wav') {
  await page.getByLabel('Import WAV').setInputFiles({
    name,
    mimeType: 'audio/wav',
    buffer: makeWav(),
  });
  await expect(page.getByRole('status')).toHaveText('Ready');
}

for (const [width, height] of DESKTOP_SAMPLES) {
  test(`LAS-51 essentials visible empty at ${width}x${height}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await assertEssentialsVisible(page);
  });
}

test('LAS-51 essentials survive shrink-then-grow resizing', async ({ page }) => {
  await page.goto('/');
  for (const [width, height] of RESIZE_SEQUENCE) {
    await page.setViewportSize({ width, height });
    await assertEssentialsVisible(page);
  }
});

test('LAS-51 essentials with WAV loaded, long filename, and load error', async ({ page }) => {
  await page.setViewportSize({ width: 785, height: 520 });
  await page.goto('/');
  await assertEssentialsVisible(page);

  await loadTone(page);
  await assertEssentialsVisible(page, { importName: 'Replace WAV' });

  await page.setViewportSize({ width: 804, height: 471 });
  await page.getByLabel('Import WAV').setInputFiles({
    name: 'very-long-session-name-for-layout-stress-testing-across-short-desktop-heights.wav',
    mimeType: 'audio/wav',
    buffer: makeWav(),
  });
  await expect(page.getByRole('status')).toHaveText('Ready');
  await assertEssentialsVisible(page, { importName: 'Replace WAV' });

  await page.setViewportSize({ width: 761, height: 450 });
  await page.getByLabel('Import WAV').setInputFiles({
    name: 'broken.wav',
    mimeType: 'audio/wav',
    buffer: corruptWav(),
  });
  await expect(page.getByRole('alert')).toBeVisible();
  await assertEssentialsVisible(page, { importName: 'Replace WAV' });
  await assertFullyVisible(page.getByRole('alert'));
});

test('LAS-51 stacked layout still scrolls below 761px width', async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 520 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Import WAV', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Space processing unavailable' }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Space processing unavailable' })).toBeInViewport({ ratio: 1 });
  const scrollHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  const innerHeight = await page.evaluate(() => innerHeight);
  expect(scrollHeight).toBeGreaterThan(innerHeight);
});
