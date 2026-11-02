import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

// LAS-20: in local-only (guest) use, audio never leaves the browser. Every request the page makes
// during import → play → pause → stop → remove is recorded; none may carry a body, change data
// or go to another origin.
test('LAS-20: local-only workflow sends no audio and no data to any server', async ({ page, baseURL }) => {
  const requests = [];
  page.on('request', request => requests.push({
    method: request.method(), url: request.url(), bodyBytes: request.postDataBuffer()?.length ?? 0,
  }));
  await page.goto('/');
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  await page.getByLabel('Import WAV').setInputFiles({ name: 'private-mix.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 5 }) });
  await expect(transport.getByRole('status')).toHaveText('Ready');
  await transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('Playing');
  await transport.getByRole('button', { name: 'Pause', exact: true }).click();
  await transport.getByRole('button', { name: 'Stop', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('Stopped');
  await page.getByRole('button', { name: 'Remove track', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('No audio loaded');

  const origin = new URL(baseURL).origin;
  const offending = requests.filter(r => r.method !== 'GET' || r.bodyBytes > 0 || new URL(r.url).origin !== origin);
  expect(offending, 'requests that could carry audio or data').toEqual([]);
  // Page assets only: nothing requested after the app had loaded mentions the file.
  expect(requests.filter(r => r.url.includes('private-mix')), 'file name never sent').toEqual([]);
});
