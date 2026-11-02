import { test, expect } from '@playwright/test';

// LAS-7: the studio shell opens cleanly at common desktop sizes and at the smallest
// supported desktop size. Planned processing is visibly unavailable, not pretend-working.
const viewports = [
  { width: 1280, height: 720 },
  { width: 1440, height: 900 },
  { width: 761, height: 450 },
];

for (const viewport of viewports) {
  const size = `${viewport.width}x${viewport.height}`;

  test(`LAS-7: studio shell opens without console errors at ${size}`, async ({ page }, testInfo) => {
    // Collect every console error, uncaught exception and failed request while the page loads.
    const problems = [];
    page.on('console', message => { if (message.type() === 'error') problems.push(`console: ${message.text()}`); });
    page.on('pageerror', error => problems.push(`page error: ${error.message}`));
    page.on('requestfailed', request => problems.push(`request failed: ${request.url()}`));
    page.on('response', response => { if (response.status() >= 400) problems.push(`HTTP ${response.status()}: ${response.url()}`); });

    await page.setViewportSize(viewport);
    await page.goto('/');

    for (const name of ['Transport', 'Tracks', 'Master', 'Mixer']) {
      await expect(page.getByRole('region', { name, exact: true }), `${name} at ${size}`).toBeVisible();
    }
    // The empty state offers one clear way to import audio.
    await expect(page.getByRole('heading', { name: 'Your session starts here' })).toBeVisible();
    await expect(page.getByText('Import WAV', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Import WAV')).toBeEnabled();

    // Placeholders say they are unavailable and cannot be operated. Since LAS-28 EQ, Dynamics and
    // Limiter open real editors; since LAS-68 the master level works and, without audio, says why
    // it is disabled instead of claiming it is unavailable.
    const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
    // Since LAS-64 Space is a working module too; no strip is a placeholder any more.
    await expect(mixer.getByText('Coming soon', { exact: true })).toHaveCount(0);
    for (const name of ['Edit EQ', 'Edit dynamics', 'Edit limiter', 'Edit space']) await expect(mixer.getByRole('button', { name })).toBeEnabled();
    const master = page.getByRole('region', { name: 'Master', exact: true });
    await expect(master.getByRole('slider', { name: 'Master level' })).toBeDisabled();
    await expect(master.getByText('Import a WAV or add stems to use the master level.')).toBeVisible();
    await expect(master.getByText('Level control unavailable')).toHaveCount(0);
    await expect(master.getByRole('button', { name: 'Export WAV', exact: true })).toBeDisabled(); // needs a track

    // A screenshot of each size is kept with the report as evidence.
    const screenshot = testInfo.outputPath(`LAS-7-shell-${size}.png`);
    await page.screenshot({ path: screenshot });
    await testInfo.attach(`shell ${size}`, { path: screenshot, contentType: 'image/png' });

    expect(problems, 'console errors, page errors or failed requests').toEqual([]);
  });
}
