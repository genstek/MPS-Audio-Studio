import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { TEST_API, enterSecret, newEmail, newPassword, registerVerified } from './helpers/accounts.js';

// Traces record typed values and cookies, so these account tests keep none.
test.use({ trace: 'off' });

const TRACK = makeWav({ seconds: 2 });

async function signedInWithSavedTrack(page, request, label) {
  const email = newEmail(label);
  const password = newPassword();
  await page.goto('/');
  const ui = await registerVerified(page, request, email, password);
  await ui.email.fill(email);
  await enterSecret(ui.password, password);
  await ui.dialog.getByRole('button', { name: 'Sign in' }).click();
  await ui.dialog.getByRole('button', { name: 'Close account dialog' }).click();
  await page.getByLabel('Import WAV').setInputFiles({ name: `${label}.wav`, mimeType: 'audio/wav', buffer: TRACK });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
  await ui.open();
  await ui.dialog.getByRole('button', { name: `Save “${label}.wav” to my library` }).click();
  await expect(ui.dialog.getByRole('list', { name: 'Saved files' }).getByRole('listitem')).toHaveCount(1);
  return { ui, email, password };
}

const sentBytes = async (request, email) => (await (await request.get(`${TEST_API}/api/dev/transmissions?email=${encodeURIComponent(email)}`)).json()).transmissions;

test('LAS-24: Cancel sends nothing; Allow sends once to the named recipient; permission can be withdrawn', async ({ page, request }) => {
  const { ui, email } = await signedInWithSavedTrack(page, request, 'ada');
  const posts = [];
  page.on('request', r => { if (r.method() !== 'GET') posts.push(new URL(r.url()).pathname); });

  await ui.dialog.getByRole('button', { name: 'Send ada.wav to Local test recipient' }).click();
  const question = ui.dialog.getByRole('group', { name: 'Send “ada.wav” to Local test recipient?' });
  await expect(question).toContainText('located on this computer (test stand-in, nothing leaves it)');
  await expect(question).toContainText('kept only in the test server\'s data folder');
  await question.getByRole('button', { name: 'Cancel' }).click();
  await expect(question).toBeHidden();
  expect(posts, 'Cancel made no request').toEqual([]);
  expect(await sentBytes(request, email), 'nothing received').toEqual([]);

  await ui.dialog.getByRole('button', { name: 'Send ada.wav to Local test recipient' }).click();
  await question.getByRole('button', { name: 'Allow and send' }).click();
  await expect(ui.dialog.getByRole('status').last()).toHaveText('Sent ada.wav to Local test recipient.');
  expect(posts.filter(path => path.endsWith('/external-jobs'))).toHaveLength(1);
  expect(await sentBytes(request, email)).toEqual([expect.objectContaining({ recipient: 'local-test-recipient', bytes: TRACK.length })]);

  const allowed = ui.dialog.getByRole('list', { name: 'Allowed external services' });
  await expect(allowed).toContainText('Local test recipient');
  await allowed.getByRole('button', { name: 'Withdraw permission for Local test recipient' }).click();
  await expect(allowed).toBeHidden();
  const blocked = await page.request.post(`/api/assets/${(await (await page.request.get(`/api/projects/${(await (await page.request.get('/api/projects')).json()).projects[0].id}`)).json()).assets[0].id}/external-jobs`, {
    headers: { 'X-MPS-Request': '1' }, data: { recipient: 'local-test-recipient' },
  });
  expect(blocked.status(), 'after withdrawal the server refuses').toBe(403);
});

test('LAS-24: deleting the account needs the password and removes the library', async ({ page, request }) => {
  const { ui, email, password } = await signedInWithSavedTrack(page, request, 'bob');
  await ui.dialog.getByRole('button', { name: 'Delete account…' }).click();
  await expect(ui.dialog.getByText(/Files on your computer are not touched/)).toBeVisible();
  await enterSecret(ui.dialog.getByLabel('Password to confirm'), newPassword());
  await ui.dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(ui.alert).toHaveText('The password is not correct. Nothing was deleted.');
  expect((await page.request.get('/api/account')).status()).toBe(200);

  await ui.dialog.getByRole('button', { name: 'Delete account…' }).click();
  await enterSecret(ui.dialog.getByLabel('Password to confirm'), password);
  await ui.dialog.getByRole('button', { name: 'Delete my account' }).click();
  await expect(ui.dialog.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(ui.status).toHaveText('Your account, your library and all saved files were deleted from the studio server.');
  expect((await page.request.get('/api/account')).status()).toBe(401);
  await ui.email.fill(email);
  await enterSecret(ui.password, password);
  await ui.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(ui.alert).toHaveText('Email or password is incorrect.');
  // The studio itself still has the local track: deletion touched only the server copy.
  await expect(page.getByRole('heading', { name: 'bob.wav' })).toBeAttached();
});
