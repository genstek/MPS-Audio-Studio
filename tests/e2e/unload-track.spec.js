import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import {
  installAudioProbe, audioSources, startOffsets, contextStates, holdDecoding, releaseDecoding,
} from './helpers/audio-probe.js';

function studio(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  return {
    tracks,
    status: transport.getByRole('status'),
    timer: transport.getByRole('timer', { name: 'Playback position' }),
    play: transport.getByRole('button', { name: 'Play' }),
    pause: transport.getByRole('button', { name: 'Pause' }),
    stop: transport.getByRole('button', { name: 'Stop' }),
    upload: page.getByLabel('Import WAV'),
    remove: tracks.getByRole('button', { name: 'Remove track' }),
  };
}

// The empty state of TC-001, plus nothing left playing or connected in the engine.
async function expectEmptySession(page, label) {
  const ui = studio(page);
  await expect(ui.status, label).toHaveText('No audio loaded');
  await expect(ui.tracks.getByRole('heading', { name: 'Your session starts here' }), label).toBeVisible();
  await expect(ui.tracks.getByText('00 TRACKS'), label).toBeVisible();
  await expect(ui.tracks.getByText('Import WAV', { exact: true }), label).toBeVisible();
  await expect(ui.timer, label).toHaveText('00:00.0 / 00:00.0');
  for (const button of [ui.play, ui.pause, ui.stop]) await expect(button, label).toBeDisabled();
  await expect(ui.remove, label).toHaveCount(0);
  await expect(page.getByRole('alert'), label).toHaveCount(0);
  const sources = await audioSources(page);
  expect({ playing: sources.playing, connected: sources.connected }, `${label}: engine`).toEqual({ playing: 0, connected: 0 });
}

test('LAS-12: Remove track empties the session from Playing, Paused and Stopped', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  const ui = studio(page);

  for (const state of ['Playing', 'Paused', 'Stopped']) {
    await ui.upload.setInputFiles({ name: `${state}.wav`, mimeType: 'audio/wav', buffer: makeWav({ seconds: 30 }) });
    await expect(ui.status).toHaveText('Ready');
    await ui.play.click();
    await expect(ui.status).toHaveText('Playing');
    if (state === 'Paused') await ui.pause.click();
    if (state === 'Stopped') await ui.stop.click();
    await expect(ui.status).toHaveText(state);

    await ui.remove.click();
    await expectEmptySession(page, `removed while ${state}`);
    // Keyboard focus lands on the import control instead of being lost with the button.
    await expect(ui.upload, `removed while ${state}: focus`).toBeFocused();
    // The app's audio context idles once nothing is loaded.
    expect(await contextStates(page), `removed while ${state}: context`).toEqual(['suspended']);
  }
  // Nothing started on its own after the removals: three Plays, three sources.
  const started = (await audioSources(page)).started;
  await page.waitForTimeout(300); // Waiting is the point: no late start may appear.
  expect((await audioSources(page)).started).toBe(started);
  expect(started).toBe(3);
});

test('LAS-12: removing during a replacement import keeps the session empty', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'first.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(ui.status).toHaveText('Ready');

  await holdDecoding(page);
  await ui.upload.setInputFiles({ name: 'late.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(ui.status).toHaveText('Loading audio…');
  await ui.remove.click();
  await releaseDecoding(page);
  // The late decode finishes, but it may not bring audio back into the emptied session.
  await expectEmptySession(page, 'after the late decode');
  await expect(ui.tracks.getByRole('heading', { name: 'late.wav' })).toHaveCount(0);
  await expect(ui.upload).toBeEnabled();
});

test('LAS-12: the same and a different WAV import and play after removal; the file is unchanged', async ({ page }, testInfo) => {
  await installAudioProbe(page);
  await page.goto('/');
  const ui = studio(page);
  // A real file on disk, so its bytes can be compared after the session used it.
  const path = testInfo.outputPath('same-file.wav');
  writeFileSync(path, makeWav({ seconds: 30 }));
  const sha256 = () => createHash('sha256').update(readFileSync(path)).digest('hex');
  const before = sha256();

  await ui.upload.setInputFiles(path);
  await expect(ui.status).toHaveText('Ready');
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  await ui.remove.click();
  await expectEmptySession(page, 'after removing same-file.wav');

  await ui.upload.setInputFiles(path);
  await expect(ui.status).toHaveText('Ready');
  await expect(ui.tracks.getByRole('heading', { name: 'same-file.wav' })).toBeVisible();
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  expect((await startOffsets(page)).at(-1), 'same file plays from the start').toBe(0);
  expect(await contextStates(page)).toEqual(['running']);
  await ui.remove.click();
  await expectEmptySession(page, 'after removing it again');

  await ui.upload.setInputFiles({ name: 'other.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 2, channels: 2 }) });
  await expect(ui.status).toHaveText('Ready');
  await expect(ui.tracks.getByRole('heading', { name: 'other.wav' })).toBeVisible();
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  expect(await audioSources(page)).toEqual({ started: 3, playing: 1, connected: 1 });
  await ui.stop.click();

  expect(sha256(), 'the original file on disk is byte-for-byte unchanged').toBe(before);
});
