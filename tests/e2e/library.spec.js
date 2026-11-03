import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { enterSecret, newEmail, newPassword, registerVerified } from './helpers/accounts.js';

// Traces record typed values and cookies, so these account tests keep none.
test.use({ trace: 'off' });

const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const TRACK = makeWav({ seconds: 2 });

// Signs a new account in, closes the dialog and imports a track into the studio.
async function signedInWithTrack(page, request, label) {
  const email = newEmail(label);
  const password = newPassword();
  await page.goto('/');
  const ui = await registerVerified(page, request, email, password);
  await ui.email.fill(email);
  await enterSecret(ui.password, password);
  await ui.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(ui.dialog.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await ui.dialog.getByRole('button', { name: 'Close account dialog' }).click();
  await page.getByLabel('Import WAV').setInputFiles({ name: `${label}-mix.wav`, mimeType: 'audio/wav', buffer: TRACK });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
  await ui.open();
  await expect(ui.dialog.getByText('Your library is empty.')).toBeVisible();
  return { ui, email, password };
}

test('LAS-23: save the current track to the private library, download it unchanged and delete it', async ({ page, request }) => {
  const { ui } = await signedInWithTrack(page, request, 'ada');
  await expect(ui.dialog.getByText(/Saving uploads a copy of the current track to your private library/)).toBeVisible();
  await ui.dialog.getByRole('button', { name: 'Save “ada-mix.wav” to my library' }).click();
  await expect(ui.dialog.getByRole('status').last()).toHaveText('Saved ada-mix.wav to your library.');
  const saved = ui.dialog.getByRole('list', { name: 'Saved files' }).getByRole('listitem');
  await expect(saved).toHaveCount(1);
  await expect(saved).toContainText('ada-mix.wav');
  await expect(saved).toContainText('2.0 s');

  const downloading = page.waitForEvent('download');
  await ui.dialog.getByRole('button', { name: 'Download ada-mix.wav' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('ada-mix.wav');
  expect(sha(readFileSync(await download.path())), 'downloaded bytes equal the original').toBe(sha(TRACK));

  await ui.dialog.getByRole('button', { name: 'Delete ada-mix.wav' }).click();
  await ui.dialog.getByRole('button', { name: 'Confirm delete ada-mix.wav' }).click();
  await expect(ui.dialog.getByText('Your library is empty.')).toBeVisible();
});

test('LAS-23: another account cannot see or reach the first account\'s files', async ({ page, request, browser }, testInfo) => {
  const { ui } = await signedInWithTrack(page, request, 'owner');
  await ui.dialog.getByRole('button', { name: 'Save “owner-mix.wav” to my library' }).click();
  await expect(ui.dialog.getByRole('list', { name: 'Saved files' }).getByRole('listitem')).toHaveCount(1);
  const [project] = (await (await page.request.get('/api/projects')).json()).projects;
  const [asset] = (await (await page.request.get(`/api/projects/${project.id}`)).json()).assets;

  const otherContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const otherPage = await otherContext.newPage();
  await signedInWithTrack(otherPage, request, 'other');
  // The other account's library is empty, and the owner's ids lead nowhere.
  for (const path of [`/api/projects/${project.id}`, `/api/assets/${asset.id}`]) {
    expect((await otherPage.request.get(path)).status(), path).toBe(404);
  }
  const steal = await otherPage.request.post(`/api/assets/${asset.id}/download-link`, { headers: { 'X-MPS-Request': '1' } });
  expect(steal.status()).toBe(404);
  await otherContext.close();
});

test('LAS-23/LAS-22: saving after the session ended shows that, never a false success', async ({ page, request }) => {
  const { ui } = await signedInWithTrack(page, request, 'cy');
  // Another tab signs out (the same cookie): the server forgets the session.
  expect((await page.request.post('/api/auth/logout', { headers: { 'X-MPS-Request': '1' } })).status()).toBe(204);
  await ui.dialog.getByRole('button', { name: 'Save “cy-mix.wav” to my library' }).click();
  await expect(ui.alert).toHaveText('Your session has ended. Sign in again.');
  await expect(ui.dialog.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(ui.dialog.getByText(/Saved cy-mix.wav/)).toHaveCount(0);
});
