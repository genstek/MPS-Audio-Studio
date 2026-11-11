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
