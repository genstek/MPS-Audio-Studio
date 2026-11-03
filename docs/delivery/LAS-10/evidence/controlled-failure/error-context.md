# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: controlled-failure.spec.mjs >> TC-001: mixer loads and displays its main UI elements
- Location: <scratch>/throwaway-spec/controlled-failure.spec.mjs:4:1

# Error details

```
Error: expect(locator).toHaveText(expected) failed

Locator:  getByRole('region', { name: 'Transport', exact: true }).getByRole('status')
Expected: "Deliberately wrong status for the LAS-10 failure demo"
Received: "No audio loaded"
Timeout:  5000ms

Call log:
  - Expect "toHaveText" getByRole('region', { name: 'Transport', exact: true }).getByRole('status') with timeout 5000ms
  - waiting for getByRole('region', { name: 'Transport', exact: true }).getByRole('status')
    14 × locator resolved to <p role="status" class="status">No audio loaded</p>
       - unexpected value "No audio loaded"

```

```yaml
- status: ●No audio loaded
```

# Test source

```ts
  1  | import { test, expect } from '/home/user/MPS-Audio-Studio-delivery/node_modules/@playwright/test/index.mjs';
  2  |
  3  | // test defines a case; page is a fresh browser tab provided by Playwright.
  4  | test('TC-001: mixer loads and displays its main UI elements', async ({ page }) => {
  5  |   // await waits for navigation. Locators find elements by accessible role/name.
  6  |   await page.goto('/');
  7  |   // expect assertions automatically wait for the expected UI state.
  8  |   await expect(page).toHaveTitle('MPS Audio Studio');
  9  |   await expect(page.getByRole('heading', { name: 'MPS Audio Studio', exact: true })).toBeVisible();
  10 |   await expect(page.getByRole('heading', { name: 'Untitled project' })).toBeVisible();
  11 |
  12 |   const transport = page.getByRole('region', { name: 'Transport', exact: true });
  13 |   await expect(transport).toBeVisible();
> 14 |   await expect(transport.getByRole('status')).toHaveText('Deliberately wrong status for the LAS-10 failure demo');
     |                                               ^ Error: expect(locator).toHaveText(expected) failed
  15 |   await expect(transport.getByRole('button', { name: 'Play', exact: false })).toBeDisabled();
  16 |   await expect(transport.getByRole('button', { name: 'Pause', exact: false })).toBeDisabled();
  17 |   await expect(transport.getByRole('button', { name: 'Stop', exact: false })).toBeDisabled();
  18 |
  19 |   const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  20 |   await expect(tracks).toBeVisible();
  21 |   await expect(tracks.getByRole('heading', { name: 'Your session starts here' })).toBeVisible();
  22 |   await expect(tracks.getByLabel('Import WAV')).toBeEnabled();
  23 |   await expect(tracks.getByText('WAV up to 100 MiB · Files stay on your device')).toBeVisible();
  24 |
  25 |   const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
  26 |   await expect(mixer).toBeVisible();
  27 |   // A small loop checks the same promise for each planned processing strip.
  28 |   for (const name of ['Input', 'EQ', 'Dynamics', 'Space']) {
  29 |     const strip = mixer.getByRole('region', { name: `${name} channel strip` });
  30 |     await expect(strip).toBeVisible();
  31 |     await expect(strip.getByRole('button', { name: `${name} processing unavailable` })).toBeDisabled();
  32 |   }
  33 |
  34 |   const master = page.getByRole('region', { name: 'Master', exact: true });
  35 |   await expect(master).toBeVisible();
  36 |   await expect(master.getByRole('slider', { name: 'Master level' })).toBeDisabled();
  37 |   await expect(master.getByRole('button', { name: 'Export WAV — coming soon' })).toBeDisabled();
  38 | });
  39 |
```