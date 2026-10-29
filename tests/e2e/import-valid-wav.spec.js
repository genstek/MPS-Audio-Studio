import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

// TC-002 (Jira LAS-57): a valid WAV is imported successfully.
// Test data: LAS-TC002-tone.wav, synthetic 3-second mono PCM16 tone at 44,100 Hz.
test('TC-002 (LAS-57): a valid WAV file is imported successfully', async ({ page }) => {
  // Step 1: clean session, empty workspace.
  await page.goto('/');
  const status = page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status');
  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  await expect(status).toHaveText('No audio loaded'); // expected 1
  await expect(tracks.getByText('00 TRACKS')).toBeVisible();

  // Steps 2-3: clicking Import WAV opens the system file picker; choose the test file there.
  const fileChooser = page.waitForEvent('filechooser');
  await tracks.getByText('Import WAV', { exact: true }).click();
  await (await fileChooser).setFiles({ name: 'LAS-TC002-tone.wav', mimeType: 'audio/wav', buffer: makeWav() }); // expected 2

  // Steps 4-5: inspect Tracks and Transport after the import has finished.
  await expect(status).toHaveText('Ready'); // expected 4
  await expect(page.getByRole('alert')).toHaveCount(0); // expected 3
  await expect(tracks.getByText('01 TRACK', { exact: true })).toBeVisible(); // expected 5

  // Expected 6: name and decoded information. The browser may resample the audio to its own
  // output rate, so the expected rate is the rate of a default AudioContext on this machine.
  const decodedRate = await page.evaluate(async () => {
    const context = new AudioContext();
    const rate = context.sampleRate;
    await context.close();
    return rate;
  });
  await expect(tracks.getByRole('heading', { name: 'LAS-TC002-tone.wav' })).toBeVisible();
  await expect(tracks.getByText(`3.0 seconds · 1 channel(s) · ${decodedRate.toLocaleString('en-US')} Hz decoded`)).toBeVisible();
  test.info().annotations.push({ type: 'decoded sample rate', description: `${decodedRate} Hz` });

  await expect(tracks.getByText('Replace WAV', { exact: true })).toBeVisible(); // expected 7
  await expect(tracks.getByText('Import WAV', { exact: true })).toHaveCount(0);

  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  await expect(transport.getByRole('button', { name: 'Play' })).toBeEnabled(); // expected 8
  await expect(transport.getByRole('button', { name: 'Stop' })).toBeEnabled();
  await expect(transport.getByRole('button', { name: 'Pause' })).toBeDisabled(); // expected 9

  // Expected 9 (second half): Pause becomes available once playback starts.
  await transport.getByRole('button', { name: 'Play' }).click();
  await expect(status).toHaveText('Playing');
  await expect(transport.getByRole('button', { name: 'Pause' })).toBeEnabled();
  await transport.getByRole('button', { name: 'Stop' }).click();
  await expect(status).toHaveText('Stopped');
});
