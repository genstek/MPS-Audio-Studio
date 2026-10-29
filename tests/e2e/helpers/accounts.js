import { randomBytes } from 'node:crypto';
import { expect } from '@playwright/test';

export const TEST_API = 'http://127.0.0.1:8788';

// Throwaway credentials per test; nothing is stored in the repository. The MPSPW- prefix lets the
// LAS-25 artifact scan prove that no password reached a report, trace or log.
export const newPassword = () => `MPSPW-${randomBytes(12).toString('base64url')}`;
export const newEmail = label => `${label}-${randomBytes(6).toString('hex')}@example.test`;

// Types a secret into a field without the value appearing in Playwright step titles.
export async function enterSecret(locator, value) {
  await locator.evaluate((input, secret) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, secret);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}

// The newest development-outbox link for an address (verification or reset).
export async function emailLink(request, email, name) {
  const response = await request.get(`${TEST_API}/api/dev/outbox?to=${encodeURIComponent(email)}`);
  const [mail] = (await response.json()).messages;
  expect(mail, `mail for ${email}`).toBeTruthy();
  const link = mail.body.match(/https?:\/\/\S+/)[0];
  expect(new URL(link).searchParams.get(name)).toBeTruthy();
  return link;
}

export function accountDialog(page) {
  const dialog = page.getByRole('dialog');
  return {
    dialog,
    open: () => page.getByRole('button', { name: 'Account' }).click(),
    email: dialog.getByLabel('Email'),
    password: dialog.getByLabel('Password'),
    status: dialog.getByRole('status'),
    alert: dialog.getByRole('alert'),
  };
}

// Registers and verifies an account through the UI-independent API path used by the studio.
export async function registerVerified(page, request, email, password) {
  const ui = accountDialog(page);
  await ui.open();
  await ui.dialog.getByRole('button', { name: 'Create account' }).click();
  await ui.email.fill(email);
  await enterSecret(ui.password, password);
  await ui.dialog.getByRole('button', { name: 'Create account' }).click();
  await expect(ui.dialog.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await page.goto(await emailLink(request, email, 'verify'));
  await expect(ui.status).toHaveText('Email verified. You can sign in now.');
  return ui;
}
