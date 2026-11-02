import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

// TC-003 (LAS-10): unsupported or broken files are rejected with a clear message,
// and the studio stays usable, so a valid WAV can still be imported afterwards.
const rejected = [
  ['wrong extension', { name: 'song.mp3', mimeType: 'audio/mpeg', buffer: makeWav() }, 'Choose a WAV file.'],
  ['empty file', { name: 'empty.wav', mimeType: 'audio/wav', buffer: Buffer.alloc(0) }, 'This file is not a valid WAV.'],
  ['text renamed to .wav', { name: 'notes.wav', mimeType: 'audio/wav', buffer: Buffer.from('not audio at all') }, 'This file is not a valid WAV.'],
];

test('TC-003: unsupported or invalid files show a recoverable error', async ({ page }) => {
  await page.goto('/');
  const upload = page.getByLabel('Import WAV');
  const status = page.getByRole('status');

  for (const [description, file, message] of rejected) {
    // setInputFiles chooses a file exactly like the system file picker would.
    await upload.setInputFiles(file);
    await expect(page.getByRole('alert'), description).toContainText(message);
    await expect(status, `${description}: nothing was loaded`).toHaveText('No audio loaded');
    await expect(page.getByRole('button', { name: 'Play', exact: true }), `${description}: Play stays disabled`).toBeDisabled();
  }

  // Recovery: a valid file is accepted and the error disappears.
  await upload.setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(status).toHaveText('Ready');
  await expect(page.getByRole('alert')).toHaveCount(0);
});
