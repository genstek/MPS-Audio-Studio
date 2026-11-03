import { test, expect } from '@playwright/test';
import { accountDialog, emailLink, enterSecret, newEmail, newPassword, openEmailLink, registerVerified } from './helpers/accounts.js';

// Traces record typed values and cookies, so these account tests keep none.
test.use({ trace: 'off' });

async function signIn(ui, email, password) {
  await ui.email.fill(email);
  await enterSecret(ui.password, password);
  await ui.dialog.getByRole('button', { name: 'Sign in' }).click();
}

test('LAS-22: reset a forgotten password from the email link; other sessions are signed out', async ({ page, request, browser }, testInfo) => {
  const email = newEmail('ada');
  const oldPassword = newPassword();
  const newPasswordValue = newPassword();
  await page.goto('/');
  const laptop = await registerVerified(page, request, email, oldPassword);
  await signIn(laptop, email, oldPassword);
  await expect(laptop.dialog.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await laptop.dialog.getByRole('button', { name: 'Close account dialog' }).click();

  // On another device: Forgot password → email link → new password.
  const phoneContext = await browser.newContext({ baseURL: testInfo.project.use.baseURL });
  const phonePage = await phoneContext.newPage();
  await phonePage.goto('/');
  const phone = accountDialog(phonePage);
  await phone.open();
  await phone.dialog.getByRole('button', { name: 'Forgot password?' }).click();
  await phone.email.fill(email);
  await phone.dialog.getByRole('button', { name: 'Send reset link' }).click();
  await expect(phone.status).toHaveText('If this email has an account, a reset link is on its way.');
  await openEmailLink(phonePage, await emailLink(request, email, 'reset'));
  await expect(phone.dialog.getByRole('heading', { name: 'Choose a new password' })).toBeVisible();
  expect(new URL(phonePage.url()).hash, 'token removed from the address bar').toBe('');
  await enterSecret(phone.dialog.getByLabel('New password'), newPasswordValue);
  await phone.dialog.getByRole('button', { name: 'Set new password' }).click();
  await expect(phone.status).toHaveText('Password changed. Sign in with your new password. You were signed out everywhere else.');
  await phoneContext.close();

  // Back on the first device the old session is gone, and says so.
  await laptop.open();
  await expect(laptop.alert).toHaveText('Your session has ended. Sign in again.');
  expect((await page.request.get('/api/account')).status()).toBe(401);
  await signIn(laptop, email, oldPassword);
  await expect(laptop.alert).toHaveText('Email or password is incorrect.');
  await enterSecret(laptop.password, newPasswordValue);
  await laptop.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(laptop.dialog.getByRole('heading', { name: 'Your account' })).toBeVisible();
});

test('LAS-22: used and forged reset links are refused with a way to ask again', async ({ page, request }) => {
  const email = newEmail('bob');
  await page.goto('/');
  await registerVerified(page, request, email, newPassword());
  const ui = accountDialog(page);
  await ui.dialog.getByRole('button', { name: 'Forgot password?' }).click();
  await ui.email.fill(email);
  await ui.dialog.getByRole('button', { name: 'Send reset link' }).click();
  await expect(ui.dialog.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  const link = await emailLink(request, email, 'reset');

  await openEmailLink(page, link);
  await enterSecret(ui.dialog.getByLabel('New password'), newPassword());
  await ui.dialog.getByRole('button', { name: 'Set new password' }).click();
  await expect(ui.dialog.getByRole('heading', { name: 'Sign in' })).toBeVisible();

  for (const [label, url] of [['used link', link], ['forged link', 'http://127.0.0.1:5173/#reset=forged-token']]) {
    await openEmailLink(page, url);
    await enterSecret(ui.dialog.getByLabel('New password'), newPassword());
    await ui.dialog.getByRole('button', { name: 'Set new password' }).click();
    await expect(ui.alert, label).toHaveText('This reset link is invalid or has expired. Request a new one.');
    await expect(ui.dialog.getByRole('button', { name: 'Request a new reset link' })).toBeVisible();
  }
});

test('LAS-22: repeated wrong passwords are throttled, for unknown addresses too', async ({ page, request }) => {
  const email = newEmail('cy');
  const password = newPassword();
  await page.goto('/');
  const ui = await registerVerified(page, request, email, password);
  for (const address of [email, newEmail('ghost')]) {
    for (let attempt = 1; attempt <= 5; attempt++) {
      await signIn(ui, address, newPassword());
      await expect(ui.alert, `${address} attempt ${attempt}`).toHaveText('Email or password is incorrect.');
    }
    // Sixth try, even with the right password: wait.
    await signIn(ui, address, password);
    await expect(ui.alert, address).toHaveText('Too many attempts. Try again in 15 minutes.');
  }
});
