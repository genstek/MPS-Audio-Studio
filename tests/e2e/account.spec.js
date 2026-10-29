import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { accountDialog, enterSecret, newEmail, newPassword, registerVerified } from './helpers/accounts.js';

// Traces record typed values and cookies, so these account tests keep none (LAS-21 AC-04).
test.use({ trace: 'off' });

test('LAS-21: register, verify from the email link, sign in and sign out', async ({ page, request, context }) => {
  const email = newEmail('ada');
  const password = newPassword();
  await page.goto('/');
  const ui = await registerVerified(page, request, email, password);
  // The token is removed from the address bar after use.
  expect(new URL(page.url()).hash).toBe('');

  await ui.email.fill(email);
  await enterSecret(ui.password, password);
  await ui.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(ui.dialog.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await expect(ui.dialog.getByText(`Signed in as ${email}`)).toBeVisible();
  // The server, not the page, decides: a protected endpoint accepts the session cookie.
  expect((await page.request.get('/api/account')).status()).toBe(200);
  const [session] = (await context.cookies()).filter(cookie => cookie.name === 'mps_session');
  expect(session).toMatchObject({ httpOnly: true, sameSite: 'Lax' });

  await ui.dialog.getByRole('button', { name: 'Sign out' }).click();
  await expect(ui.dialog.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(ui.status).toHaveText('Signed out.');
  expect((await page.request.get('/api/account')).status()).toBe(401);
  // Replaying the old cookie directly against the API fails too.
  const replay = await request.get('/api/account', { headers: { Cookie: `mps_session=${session.value}` } });
  expect(replay.status()).toBe(401);
});

test('LAS-21: wrong password and unverified email are refused without opening a session', async ({ page, context }) => {
  const email = newEmail('bob');
  const password = newPassword();
  await page.goto('/');
  const ui = accountDialog(page);
  await ui.open();
  await ui.dialog.getByRole('button', { name: 'Create account' }).click();
  await ui.email.fill(email);
  await enterSecret(ui.password, password);
  await ui.dialog.getByRole('button', { name: 'Create account' }).click();
  await expect(ui.dialog.getByRole('heading', { name: 'Check your email' })).toBeVisible();

  // Correct password, address not verified yet: explain and offer a new link.
  await ui.dialog.getByRole('button', { name: 'Back to sign in' }).click();
  await ui.email.fill(email);
  await enterSecret(ui.password, password);
  await ui.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(ui.alert).toHaveText('Verify your email first. We can send a new link.');
  await expect(ui.dialog.getByRole('button', { name: 'Send a new verification link' })).toBeVisible();

  // Wrong password: the same message as for an unknown address.
  await ui.dialog.getByRole('button', { name: 'Back to sign in' }).click();
  await ui.email.fill(email);
  await enterSecret(ui.password, newPassword());
  await ui.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(ui.alert).toHaveText('Email or password is incorrect.');
  await ui.email.fill(newEmail('nobody'));
  await ui.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(ui.alert).toHaveText('Email or password is incorrect.');

  expect((await context.cookies()).filter(cookie => cookie.name === 'mps_session')).toEqual([]);
  expect((await page.request.get('/api/account')).status()).toBe(401);
});

test('LAS-21: without the account server the studio still plays and says accounts are unavailable', async ({ page }) => {
  await page.route('**/api/**', route => route.abort('connectionrefused'));
  await page.goto('/');
  const ui = accountDialog(page);
  await ui.open();
  await expect(ui.alert).toHaveText('Accounts are unavailable right now. Local playback still works.');
  await ui.dialog.getByRole('button', { name: 'Close account dialog' }).click();
  await expect(ui.dialog).toBeHidden();
  await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
  await page.getByRole('button', { name: 'Play' }).click();
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Playing');
});
