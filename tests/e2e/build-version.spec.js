import { test, expect } from '@playwright/test';

// LAS-169: testers can identify the actual source build before loading audio.
test('shows build version and source identity in the header', async ({ page }) => {
  await page.goto('/');
  const build = page.getByTestId('build-identity');
  await expect(build).toBeVisible();
  await expect(build).toContainText(/v\d+\.\d+\.\d+/);
  const details = await build.getAttribute('title');
  expect(details).toMatch(/Version: \d+\.\d+\.\d+/);
  expect(details).toMatch(/Built \(UTC\): /);
  expect(details).toMatch(/Commit: (?:[a-f0-9]{40}|unknown)/);
  if (process.env.CI) expect(details).toMatch(/Commit: [a-f0-9]{40}/);
});

test('LAS-169: build identity stays in the viewport at narrow desktop sizes', async ({ page }) => {
  await page.goto('/');
  for (const [width, height] of [[761, 450], [768, 1024], [800, 600], [804, 471], [1024, 768]]) {
    await test.step(`${width}x${height}`, async () => {
      await page.setViewportSize({ width, height });
      const identity = page.getByTestId('build-identity');
      await expect(identity).toBeInViewport({ ratio: 1 });
      const box = await identity.boundingBox();
      expect(box.width, 'a visible build label, not an invisible zero-width placeholder').toBeGreaterThanOrEqual(35);
      const size = await page.evaluate(() => ({
        width: document.documentElement.scrollWidth,
        height: document.documentElement.scrollHeight,
      }));
      expect(size.width, 'header must not widen the page').toBeLessThanOrEqual(width);
      expect(size.height, 'header must not make the desktop page scroll').toBeLessThanOrEqual(height);
    });
  }
});
