import { test, expect } from '@playwright/test';

test('LAS-51: Import WAV stays fully visible after resizing to 785x520', async ({ page }) => {
    await page.setViewportSize({ width: 817, height: 598 });
    await page.goto('/');

    await page.setViewportSize({ width: 785, height: 520 });

    const importWav = page.getByRole('button', {
        name: 'Import WAV',
        exact: true,
    });

    await expect(importWav).toBeInViewport({ ratio: 1 });
});
