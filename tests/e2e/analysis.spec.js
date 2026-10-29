import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAnalysisProbe, holdAnalysisResults, releaseAnalysisResults, heldAnalysisResults, longTasksSince } from './helpers/analysis-probe.js';

// LAS-26. These checks prove the analysis is wired to the real file and stays responsive; the
// measurements themselves are validated by the unit tests and the FFmpeg cross-check, not here.
function studio(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Track analysis' });
  return {
    tracks,
    dialog,
    status: transport.getByRole('status'),
    play: transport.getByRole('button', { name: 'Play' }),
    upload: page.getByLabel('Import WAV'),
    analyze: tracks.getByRole('button', { name: /^Analyz/ }),
    analysisStatus: dialog.getByRole('status'),
    report: dialog.locator('.analysis-report'),
    close: dialog.getByRole('button', { name: 'Close analysis' }),
    row: name => dialog.getByRole('row', { name: new RegExp(`^${name.replace(/[()×−]/g, '.')}`) }).getByRole('cell'),
  };
}

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

test('LAS-26: a -23 dBFS 1 kHz stereo tone reads -23.0 LUFS with labelled peaks; repeatable, file unchanged', async ({ page }, testInfo) => {
  await page.goto('/');
  const ui = studio(page);
  const path = testInfo.outputPath('ebu-tone.wav');
  writeFileSync(path, makeWav({ seconds: 20, channels: 2, sampleRate: 48000, frequency: 1000, dbfs: -23 }));
  const before = sha(readFileSync(path));

  await expect(ui.analyze).toHaveCount(0); // nothing to analyse yet
  await ui.upload.setInputFiles(path);
  await expect(ui.status).toHaveText('Ready');
  await ui.analyze.click();
  await expect(ui.analysisStatus).toHaveText('Analysis complete.');
  await expect(ui.row('Integrated loudness')).toHaveText('−23.0 LUFS');
  await expect(ui.row('True peak (4× oversampled)')).toHaveText('−23.00 dBTP');
  await expect(ui.row('Sample peak')).toHaveText('−23.00 dBFS');
  await expect(ui.row('Loudness range')).toHaveText('0.0 LU');
  await expect(ui.row('Crest factor')).toHaveText('3.0 dB');
  await expect(ui.row('Clipping')).toHaveText('None detected');
  await expect(ui.row('Correlation')).toHaveText('+1.00');
  await expect(ui.row('Loudness change in mono')).toHaveText('0.0 LU');
  await expect(ui.row('Side relative to mid')).toHaveText('No side signal (left = right)');
  await expect(ui.row('Peak to loudness ratio')).toHaveText('0.0 dB');
  await expect(ui.dialog.getByRole('row', { name: /^1 kHz/ })).toContainText('100.0 %');
  await expect(ui.dialog.getByText(`mps-analysis-1 · 48,000 Hz · stereo · 16-bit PCM · whole file 0:00.0–0:20.0`)).toBeVisible();
  await expect(ui.dialog.locator('code')).toHaveText(before); // the hash of the file on disk

  // The same file analysed again gives exactly the same report.
  const first = await ui.report.innerText();
  await ui.dialog.getByRole('button', { name: 'Analyze again' }).click();
  await expect(ui.analysisStatus).toHaveText('Analysis complete.');
  expect(await ui.report.innerText()).toBe(first);
  await testInfo.attach('analysis-report.txt', { body: first, contentType: 'text/plain' });

  await ui.close.click();
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  expect(sha(readFileSync(path)), 'the source file is unchanged').toBe(before);
});

test('LAS-26: a long analysis runs off the main thread, can be cancelled, retried and left running', async ({ page }, testInfo) => {
  test.setTimeout(120_000); // three analyses of a two-minute file, with other tests running in parallel
  await installAnalysisProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'long.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 120, channels: 2, sampleRate: 48000 }) });
  await expect(ui.status).toHaveText('Ready');

  await holdAnalysisResults(page);
  await ui.analyze.click();
  await expect(ui.analysisStatus).toHaveText('Measuring loudness, peaks, stereo and spectrum…');
  await ui.dialog.getByRole('button', { name: 'Cancel analysis' }).click();
  await expect(ui.analysisStatus).toHaveText('Analysis cancelled.');
  await expect(ui.report).toHaveCount(0);

  await ui.dialog.getByRole('button', { name: 'Try again' }).click();
  await expect(ui.analysisStatus).toHaveText('Measuring loudness, peaks, stereo and spectrum…');
  // Closing the dialog leaves the analysis running; playback works meanwhile.
  await ui.close.click();
  await expect(ui.analyze).toHaveText('Analyzing…');
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  await expect.poll(() => heldAnalysisResults(page), { timeout: 60_000 }).toContain('done');
  await ui.analyze.click();
  await expect(ui.analysisStatus).toHaveText('Measuring loudness, peaks, stereo and spectrum…');
  await releaseAnalysisResults(page);
  await expect(ui.analysisStatus).toHaveText('Analysis complete.');
  await expect(ui.row('Integrated loudness')).toHaveText(/^−\d+\.\d LUFS$/);
  await expect(ui.dialog.getByText(/whole file 0:00\.0–2:00\.0/)).toBeVisible();

  // An unheld run of the same two-minute file: the main thread has no long task of 200 ms or more.
  const since = await page.evaluate(() => performance.now());
  await ui.dialog.getByRole('button', { name: 'Analyze again' }).click();
  await expect(ui.analysisStatus).toHaveText('Analysis complete.', { timeout: 60_000 });
  testInfo.annotations.push({ type: 'unheld analysis of 2:00 stereo 48 kHz', description: `${Math.round((await page.evaluate(() => performance.now())) - since)} ms` });
  const tasks = await longTasksSince(page, since);
  const longest = Math.max(0, ...tasks.map(task => task.duration));
  testInfo.annotations.push({ type: 'main-thread long tasks during analysis', description: `${tasks.length}, longest ${Math.round(longest)} ms` });
  expect(longest).toBeLessThan(200);
});

test('LAS-26: replacing the track during analysis never shows the old file\'s report', async ({ page }) => {
  await installAnalysisProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'first.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 10, channels: 2, sampleRate: 48000, dbfs: -12 }) });
  await expect(ui.status).toHaveText('Ready');
  await holdAnalysisResults(page);
  await ui.analyze.click();
  await expect.poll(() => heldAnalysisResults(page), { timeout: 30_000 }).toContain('done');
  await ui.close.click();

  await ui.upload.setInputFiles({ name: 'second.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 10, channels: 1, sampleRate: 44100, dbfs: -30 }) });
  await expect(ui.tracks.getByRole('heading', { name: 'second.wav' })).toBeVisible();
  await expect(ui.analyze).toHaveText('Analyze');
  await releaseAnalysisResults(page); // the first file's result arrives late and must be ignored
  await ui.analyze.click();
  await expect(ui.analysisStatus).toHaveText('Analysis complete.');
  await expect(ui.dialog.getByText('second.wav')).toBeVisible();
  await expect(ui.dialog.getByText(/44,100 Hz · mono/)).toBeVisible();
  await expect(ui.dialog.getByText('Mono file: stereo measures do not apply.')).toBeVisible();
  await expect(ui.row('Sample peak')).toHaveText('−30.00 dBFS');
});

test('LAS-26: unsupported audio fails clearly and the session keeps working', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'quad.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 2, channels: 4, sampleRate: 48000 }) });
  await expect(ui.status).toHaveText('Ready');
  await ui.analyze.click();
  await expect(ui.dialog.getByRole('alert')).toHaveText('Analysis supports mono and stereo audio. This file has 4 channels.');
  await expect(ui.report).toHaveCount(0);
  await expect(ui.dialog.getByRole('button', { name: 'Try again' })).toBeEnabled();
  await ui.close.click();
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
});

test('LAS-26: the Analyze button fits the Tracks heading from 320 px wide', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.upload.setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: makeWav() });
  await expect(ui.status).toHaveText('Ready');
  for (const width of [320, 360, 768, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    const overflow = await ui.tracks.locator('.panel-heading').evaluate(heading => {
      const box = heading.getBoundingClientRect();
      const padding = parseFloat(getComputedStyle(heading).paddingRight);
      return [...heading.querySelectorAll('h2, :scope .heading-tools > button, .badge')]
        .filter(element => element.getClientRects().length)
        .map(element => ({ text: element.textContent, right: element.getBoundingClientRect().right, limit: box.right - padding + 0.5 }))
        .filter(item => item.right > item.limit);
    });
    expect(overflow, `${width}px: heading items beyond the panel's padding`).toEqual([]);
  }
});
