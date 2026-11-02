import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { enterSecret, newEmail, newPassword, registerVerified } from './helpers/accounts.js';

// LAS-30. Account tests keep no traces (typed values and cookies).
test.use({ trace: 'off' });

const REFERENCE = makeWav({ seconds: 12, channels: 2, sampleRate: 44100, frequency: 440, dbfs: -12 });

function references(page) {
  const dialog = page.getByRole('dialog', { name: 'Reference profiles' });
  return {
    dialog,
    open: () => page.getByRole('button', { name: 'References', exact: true }).click(),
    choose: (buffer, name = 'sadeness.wav') => dialog.getByLabel('Choose reference WAV').setInputFiles({ name, mimeType: 'audio/wav', buffer }),
    status: dialog.getByRole('status'),
    alert: dialog.getByRole('alert'),
  };
}

async function signIn(page, request, label) {
  const email = newEmail(label);
  const password = newPassword();
  const ui = await registerVerified(page, request, email, password);
  await ui.email.fill(email);
  await enterSecret(ui.password, password);
  await ui.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(ui.dialog.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await ui.dialog.getByRole('button', { name: 'Close account dialog' }).click();
}

async function measure(ref, { start = '2', end = '10', name = 'Sadeness chorus', style = 'Enigma', version = '1990 album' } = {}) {
  await ref.dialog.getByLabel('Start (s)').fill(start);
  await ref.dialog.getByLabel('End (s)').fill(end);
  await ref.dialog.getByLabel('Name').fill(name);
  await ref.dialog.getByLabel(/^Style or artist/).fill(style);
  await ref.dialog.getByLabel(/^Source version/).fill(version);
  await ref.dialog.getByRole('button', { name: 'Measure segment' }).click();
}

test('LAS-30: measure a reference segment, save it privately, reanalyse it reproducibly and delete it', async ({ page, request }) => {
  await page.goto('/');
  await signIn(page, request, 'ref');
  const ref = references(page);
  await ref.open();
  await expect(ref.dialog.getByText('No saved references yet.')).toBeVisible();
  await expect(ref.dialog.getByText(/Nothing is trained or learned from it/)).toBeVisible();
  await ref.choose(REFERENCE);
  await expect(ref.status).toHaveText('sadeness.wav: 12.0 s, 44,100 Hz, stereo. Choose the segment to measure.');
  await measure(ref);
  await expect(ref.status).toHaveText('Measured.');
  await expect(ref.dialog.getByRole('table')).toContainText('Measured segment 2.0–10.0 s');
  await expect(ref.dialog.getByRole('row', { name: /^Integrated loudness/ })).toContainText('LUFS');
  await ref.dialog.getByRole('button', { name: 'Save to my references' }).click();
  await expect(ref.status).toHaveText('Saved “Sadeness chorus” (Enigma, 1990 album).');
  const item = ref.dialog.getByRole('listitem').filter({ hasText: 'Sadeness chorus' });
  await expect(item).toContainText('1990 album · 2.0–10.0 s');
  await expect(ref.dialog.getByRole('heading', { name: 'Enigma' })).toBeVisible();

  await item.getByRole('button', { name: 'Reanalyse Sadeness chorus' }).click();
  await expect(item).toContainText('Reproducible: the same measurements.', { timeout: 30_000 });
  await item.getByRole('button', { name: 'Delete profile Sadeness chorus' }).click();
  await expect(ref.status).toHaveText(/^Deleted the profile “Sadeness chorus”/);
  await expect(ref.dialog.getByText('No saved references yet.')).toBeVisible();
});

test('LAS-30: without an account measuring works and saving asks to sign in', async ({ page }) => {
  await page.goto('/');
  const ref = references(page);
  await ref.open();
  await expect(ref.dialog.getByText('Sign in (Account) to save and list references.')).toBeVisible();
  await ref.choose(REFERENCE);
  await measure(ref);
  await expect(ref.status).toHaveText('Measured.');
  await ref.dialog.getByRole('button', { name: 'Save to my references' }).click();
  await expect(ref.alert).toHaveText('Sign in (Account) to save references.');
});

test('LAS-30: short, outside and silent segments are refused clearly', async ({ page }) => {
  await page.goto('/');
  const ref = references(page);
  await ref.open();
  await ref.choose(REFERENCE);
  await measure(ref, { start: '2', end: '5' });
  await expect(ref.alert).toHaveText('Choose a segment of at least 5 seconds.');
  await measure(ref, { start: '6', end: '13' });
  await expect(ref.alert).toHaveText('Choose a segment inside the file (0 to 12.0 s).');
  await ref.choose(makeWav({ seconds: 8, channels: 1, sampleRate: 44100, dbfs: -200 }), 'silence.wav');
  await measure(ref, { start: '1', end: '7' });
  await expect(ref.alert).toHaveText('This segment is silent; choose one with music.');
  await expect(ref.dialog.getByRole('button', { name: 'Save to my references' })).toHaveCount(0);
});

test('LAS-30: another account does not see the first account\'s references', async ({ page, request, browser }) => {
  await page.goto('/');
  await signIn(page, request, 'owner');
  const ref = references(page);
  await ref.open();
  await ref.choose(REFERENCE);
  await measure(ref);
  await expect(ref.status).toHaveText('Measured.');
  await ref.dialog.getByRole('button', { name: 'Save to my references' }).click();
  await expect(ref.status).toHaveText(/^Saved/);

  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto('/');
  await signIn(otherPage, request, 'other');
  const otherRef = references(otherPage);
  await otherRef.open();
  await expect(otherRef.dialog.getByText('No saved references yet.')).toBeVisible();
  await other.close();
});

// Defect found in LAS-31: the file picker took the Tracks panel's named grid area and sat in an
// extra column outside the dialog on a 360 px screen.
test('LAS-30: the reference file picker stays inside the dialog at 360 px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  const ref = references(page);
  await ref.open();
  const dialog = await ref.dialog.boundingBox();
  const picker = await ref.dialog.locator('.file-picker').boundingBox();
  expect(picker.x).toBeGreaterThanOrEqual(dialog.x);
  expect(picker.x + picker.width).toBeLessThanOrEqual(dialog.x + dialog.width);
});
