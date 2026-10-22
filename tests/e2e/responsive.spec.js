import {test, expect} from '@playwright/test';

test('LAS48-TC-001: Initial empty workspace fits desktop viewports', async ({page}) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    const transport = page.getByRole('region', {
  name: 'Transport',
  exact: true,
});

await expect(transport).toBeVisible();

await expect(transport).toBeInViewport({ ratio: 1 });
const play = transport.getByRole('button', {
  name: 'Play',
  exact: false,
});

await expect(play).toBeInViewport({ ratio: 1 });

const pause = transport.getByRole('button', {
    name: 'Pause',
    exact: false,
    });

    await expect(pause).toBeInViewport({ ratio: 1 });

const stop = transport.getByRole('button', {
    name: 'Stop',
    exact: false,
    });

    await expect(stop).toBeInViewport({ ratio: 1 });

    const contentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const visibleWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(contentWidth).toBeLessThanOrEqual(visibleWidth);

    const mixer = page.getByRole('region', {
        name: 'Mixer',
        exact: true,
    });

    await expect(mixer).toBeVisible();
    await expect(mixer).toBeInViewport({ ratio: 1 });

});
