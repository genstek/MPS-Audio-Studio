import { test, expect } from '@playwright/test';

// test defines a case; page is a fresh browser tab provided by Playwright.
test('TC-001: mixer loads and displays its main UI elements', async ({ page }) => {
  // await waits for navigation. Locators find elements by accessible role/name.
  await page.goto('/');
  // expect assertions automatically wait for the expected UI state.
  await expect(page).toHaveTitle('MPS Audio Studio');
  await expect(page.getByRole('heading', { name: 'MPS Audio Studio', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Untitled project' })).toBeVisible();

  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  await expect(transport).toBeVisible();
  await expect(transport.getByRole('status')).toHaveText('No audio loaded');
  await expect(transport.getByRole('button', { name: 'Play', exact: false })).toBeDisabled();
  await expect(transport.getByRole('button', { name: 'Pause', exact: false })).toBeDisabled();
  await expect(transport.getByRole('button', { name: 'Stop', exact: false })).toBeDisabled();

  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  await expect(tracks).toBeVisible();
  await expect(tracks.getByRole('heading', { name: 'Your session starts here' })).toBeVisible();
  await expect(tracks.getByLabel('Import WAV')).toBeEnabled();
  await expect(tracks.getByText('WAV up to 250 MiB · Files stay on your device')).toBeVisible();

  const mixer = page.getByRole('region', { name: 'Mixer', exact: true });
  await expect(mixer).toBeVisible();
  // A small loop checks each processing strip. Since LAS-28 the EQ, Dynamics and Limiter strips are
  // working modules with an editor; Space (reverb/width) is still a labelled placeholder.
  for (const [name, button] of [['EQ', 'Edit EQ'], ['Dynamics', 'Edit dynamics'], ['Limiter', 'Edit limiter']]) {
    const strip = mixer.getByRole('region', { name: `${name} channel strip` });
    await expect(strip).toBeVisible();
    await expect(strip.getByRole('button', { name: button })).toBeEnabled();
  }
  const space = mixer.getByRole('region', { name: 'Space channel strip' });
  await expect(space.getByRole('button', { name: 'Space processing unavailable' })).toBeDisabled();

  const master = page.getByRole('region', { name: 'Master', exact: true });
  await expect(master).toBeVisible();
  await expect(master.getByRole('slider', { name: 'Master level' })).toBeDisabled();
  // Export needs a track first (LAS-28).
  await expect(master.getByRole('button', { name: 'Export WAV' })).toBeDisabled();
});
