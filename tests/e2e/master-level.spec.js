import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAudioProbe, audioSources } from './helpers/audio-probe.js';
import { installChainProbe, masterGainValue, pathGains, speakersRmsDb } from './helpers/chain-probe.js';

// LAS-68: Master Level is a monitor volume after the Original/Processed switch, for the single
// track and the stems. What reaches the speakers is measured by the probe's own tap on the audio
// destination (not by the app's meters). Gains are checked at 0 dB, −6 dB and mute.
const TONE_DBFS = -20; // sine peak; its RMS is 3.01 dB lower
const UNITY_RMS = TONE_DBFS - 3.01;

// A 16-bit stereo 1 kHz tone with the chosen channels silent (L-only / R-only fixtures).
function stereoTone({ left = true, right = true, seconds = 8 } = {}) {
  const rate = 44100, frames = rate * seconds, amplitude = 32768 * 10 ** (TONE_DBFS / 20);
  const bytes = Buffer.alloc(44 + frames * 4);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22); bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 4, 28); bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 4, 40);
  for (let n = 0; n < frames; n++) {
    const v = Math.round(amplitude * Math.sin((2 * Math.PI * 1000 * n) / rate));
    bytes.writeInt16LE(left ? v : 0, 44 + n * 4);
    bytes.writeInt16LE(right ? v : 0, 46 + n * 4);
  }
  return bytes;
}

function studio(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const master = page.getByRole('region', { name: 'Master', exact: true });
  return {
    transport, master,
    status: transport.getByRole('status'),
    timer: transport.getByRole('timer', { name: 'Playback position' }),
    fader: master.getByRole('slider', { name: 'Master level' }),
    value: master.locator('.master-value'),
    upload: page.getByLabel('Import WAV'),
    load: (name, buffer) => page.getByLabel('Import WAV').setInputFiles({ name, mimeType: 'audio/wav', buffer }),
  };
}

// Waits until what reaches the speakers settles at the expected RMS (±tolerance), per channel.
async function expectSpeakers(page, expected, message, tolerance = 0.25) {
  await expect.poll(async () => {
    const level = await speakersRmsDb(page);
    const ok = (actual, wanted) => (wanted === null ? actual === null : actual !== null && Math.abs(actual - wanted) <= tolerance);
    return level && ok(level.left, expected.left) && ok(level.right, expected.right) ? 'ok' : JSON.stringify(level);
  }, { message, timeout: 5000 }).toBe('ok');
}

test('LAS-68: the fader explains why it is disabled, then sets 0 dB, −6 dB and mute on what reaches the speakers, in both A/B paths, without interrupting playback', async ({ page }) => {
  await installChainProbe(page);
  await installAudioProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await expect(ui.fader).toBeDisabled();
  await expect(ui.master.getByText('Import a WAV or add stems to use the master level.')).toBeVisible();
  await expect(ui.master.getByText('Level control unavailable')).toHaveCount(0);

  await ui.load('stereo.wav', stereoTone());
  await expect(ui.status).toHaveText('Ready');
  await expect(ui.fader).toBeEnabled();
  await expect(ui.fader).toHaveAttribute('aria-valuetext', '0.0 dB');
  await expect(ui.master.getByText('Monitor volume · not in exported WAV')).toBeVisible();
  await ui.transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(ui.status).toHaveText('Playing');
  await expectSpeakers(page, { left: UNITY_RMS, right: UNITY_RMS }, 'unity: the tone reaches both speakers unchanged');

  // Keyboard: 12 steps of 0.5 dB down.
  await ui.fader.focus();
  for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowLeft');
  await expect(ui.fader).toHaveAttribute('aria-valuetext', '−6.0 dB');
  await expect(ui.value).toHaveText('−6.0 dB');
  await expect.poll(() => masterGainValue(page)).toBeCloseTo(10 ** (-6 / 20), 3);
  await expectSpeakers(page, { left: UNITY_RMS - 6, right: UNITY_RMS - 6 }, '−6 dB on both channels');
  await expect(ui.status).toHaveText('Playing');

  // Original path: the same monitor gain follows the A/B switch (matching keeps both equally loud here).
  await ui.master.getByRole('radio', { name: 'Original' }).check();
  await expect.poll(async () => (await pathGains(page)).original).toBeGreaterThan(0.9);
  await expectSpeakers(page, { left: UNITY_RMS - 6, right: UNITY_RMS - 6 }, '−6 dB on the Original path too');
  await ui.master.getByRole('radio', { name: 'Processed' }).check();

  // Page Down: 6 dB at a time; Home: mute; the reset button: unity.
  await ui.fader.focus();
  await page.keyboard.press('PageDown');
  await expect(ui.fader).toHaveAttribute('aria-valuetext', '−12.0 dB');
  await page.keyboard.press('Home');
  await expect(ui.fader).toHaveAttribute('aria-valuetext', 'Muted (−∞ dB)');
  await expect(ui.value).toHaveText('−∞ dB');
  await expect.poll(() => masterGainValue(page)).toBe(0);
  await expectSpeakers(page, { left: null, right: null }, 'mute: silence at the speakers');
  await ui.master.getByRole('button', { name: 'Reset master level to 0 dB' }).click();
  await expect(ui.fader).toHaveAttribute('aria-valuetext', '0.0 dB');
  await expectSpeakers(page, { left: UNITY_RMS, right: UNITY_RMS }, 'reset to unity');

  // The fader never restarted playback: one source, the clock kept running.
  expect((await audioSources(page)).started).toBe(1);
  const before = await ui.timer.textContent();
  await page.waitForTimeout(300);
  expect(await ui.timer.textContent()).not.toBe(before);
});

test('LAS-68: left-only, right-only and mono files are attenuated equally on the channels that carry sound', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  const cases = [
    ['left-only.wav', stereoTone({ right: false }), { left: UNITY_RMS - 6, right: null }],
    ['right-only.wav', stereoTone({ left: false }), { left: null, right: UNITY_RMS - 6 }],
    ['mono.wav', makeWav({ seconds: 8, channels: 1, frequency: 1000, dbfs: TONE_DBFS }), { left: UNITY_RMS - 6, right: UNITY_RMS - 6 }],
  ];
  for (const [name, buffer, expected] of cases) {
    await ui.load(name, buffer);
    await expect(page.getByRole('heading', { name })).toBeVisible();
    await ui.fader.fill('-6');
    await expect(ui.fader).toHaveAttribute('aria-valuetext', '−6.0 dB');
    await ui.transport.getByRole('button', { name: 'Play', exact: true }).click();
    await expect(ui.status).toHaveText('Playing');
    await expectSpeakers(page, expected, `${name} at −6 dB`);
    await ui.transport.getByRole('button', { name: 'Stop', exact: true }).click();
  }
});

test('LAS-68: the level is kept through pause, stop, editors, replacement, unload and reload, and never changes the exported WAV', async ({ page }, testInfo) => {
  await installAudioProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.load('tone.wav', stereoTone({ seconds: 20 }));
  await expect(ui.status).toHaveText('Ready');

  const exportOnce = async name => {
    await ui.master.getByRole('button', { name: 'Export WAV', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Export processed WAV' });
    await dialog.getByRole('button', { name: /^Export( again)?$/ }).click();
    await expect(dialog.getByRole('status')).toHaveText('Export ready.', { timeout: 60_000 });
    const download = page.waitForEvent('download');
    await dialog.getByRole('link', { name: /^Save / }).click();
    const path = testInfo.outputPath(name);
    await (await download).saveAs(path);
    await dialog.getByRole('button', { name: 'Close export' }).click();
    return createHash('sha256').update(readFileSync(path)).digest('hex');
  };
  const atUnity = await exportOnce('unity.wav');
  await ui.fader.fill('-20');
  await expect(ui.value).toHaveText('−20.0 dB');
  const atMinus20 = await exportOnce('minus20.wav');
  expect(atMinus20, 'the export is byte-identical whatever the monitor level').toBe(atUnity);
  testInfo.annotations.push({ type: 'export SHA-256 at 0 dB and −20 dB', description: atUnity });

  // Rapid pointer drags while playing: the transport keeps going with one source.
  await ui.transport.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(ui.status).toHaveText('Playing');
  const box = await ui.fader.boundingBox();
  await page.mouse.move(box.x + 2, box.y + box.height / 2);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++) await page.mouse.move(box.x + ((i % 2 ? 0.9 : 0.1) * box.width), box.y + box.height / 2);
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height / 2);
  await page.mouse.up();
  await expect(ui.status).toHaveText('Playing');
  expect((await audioSources(page)).playing).toBe(1);
  await ui.fader.fill('-9');
  await expect(ui.value).toHaveText('−9.0 dB');

  for (const action of ['Pause', 'Pause', 'Stop']) await ui.transport.getByRole('button', { name: action, exact: true }).click();
  await page.getByRole('button', { name: 'Edit EQ' }).click();
  await page.getByRole('button', { name: 'Close EQ' }).click();
  await expect(ui.value).toHaveText('−9.0 dB');
  await ui.load('next.wav', stereoTone({ seconds: 2 }));
  await expect(page.getByRole('heading', { name: 'next.wav' })).toBeVisible();
  await expect(ui.value).toHaveText('−9.0 dB');
  await page.getByRole('button', { name: 'Remove track', exact: true }).click();
  await expect(ui.fader).toBeDisabled();
  await expect(ui.fader).toHaveAttribute('aria-valuetext', '−9.0 dB');
  await page.reload();
  await expect(ui.fader).toHaveAttribute('aria-valuetext', '−9.0 dB');
  await expect(ui.fader).toBeDisabled();
});

test('LAS-68: one Master Level for the stem mix too, also reachable inside the stem session', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await page.getByRole('button', { name: 'Stems…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Stem session' });
  await dialog.getByLabel('Add stem WAVs').setInputFiles([
    { name: 'left.wav', mimeType: 'audio/wav', buffer: stereoTone({ right: false }) },
    { name: 'right.wav', mimeType: 'audio/wav', buffer: stereoTone({ left: false }) },
  ]);
  await expect(dialog.getByRole('status')).toHaveText(/^2 stems/);
  const stemFader = dialog.getByRole('slider', { name: 'Master level' });
  await stemFader.fill('-6');
  await dialog.getByRole('button', { name: 'Play', exact: true }).click();
  // Two stems at their own levels, both 6 dB down at the speakers.
  await expectSpeakers(page, { left: UNITY_RMS - 6, right: UNITY_RMS - 6 }, 'stem mix at −6 dB');
  await dialog.getByRole('button', { name: 'Stop', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close stems' }).click();
  // Only stems are loaded: the main fader is enabled and shows the same level.
  await expect(ui.fader).toBeEnabled();
  await expect(ui.fader).toHaveAttribute('aria-valuetext', '−6.0 dB');
});
