import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

// LAS-172. Saving the analysis report: the saved file must carry the numbers on screen, a
// cancelled or failed save must not claim success, and a report is only offered for a finished run.
function studio(page) {
  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Track analysis' });
  return {
    tracks,
    dialog,
    upload: page.getByLabel('Import WAV'),
    status: page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status'),
    analyze: tracks.getByRole('button', { name: /^Analyz/ }),
    analysisStatus: dialog.getByRole('status').first(),
    saveReport: dialog.getByRole('button', { name: 'Save report…' }),
    asPdf: dialog.getByRole('button', { name: 'Save as PDF' }),
    asJson: dialog.getByRole('button', { name: 'Save as JSON' }),
    saveStatus: dialog.getByTestId('save-status'),
    row: name => dialog.getByRole('row', { name: new RegExp(`^${name.replace(/[()×−]/g, '.')}`) }).getByRole('cell'),
  };
}

const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function analysed(page, testInfo, { channels = 2, sampleRate = 48000 } = {}) {
  await page.goto('/');
  const ui = studio(page);
  const path = testInfo.outputPath('tone.wav');
  writeFileSync(path, makeWav({ seconds: 5, channels, sampleRate, frequency: 1000, dbfs: -20 }));
  await ui.upload.setInputFiles(path);
  await expect(ui.status).toHaveText('Ready');
  await ui.analyze.click();
  await expect(ui.analysisStatus).toHaveText('Analysis complete.');
  return { ui, path };
}

test('LAS-172: PDF and JSON downloads open and agree with the dialog; the source file is untouched', async ({ page }, testInfo) => {
  await page.addInitScript(() => { delete window.showSaveFilePicker; }); // the download route (Safari, Firefox)
  const { ui, path } = await analysed(page, testInfo);
  const before = sha(readFileSync(path));
  const integrated = (await ui.row('Integrated loudness').innerText()).replace('−', '-');

  await ui.saveReport.click();
  const [pdfDownload] = await Promise.all([page.waitForEvent('download'), ui.asPdf.click()]);
  expect(pdfDownload.suggestedFilename()).toMatch(/^tone_analysis_\d{8}T\d{6}Z\.pdf$/);
  const pdf = readFileSync(await pdfDownload.path());
  expect(pdf.subarray(0, 9).toString()).toBe('%PDF-1.4\n');
  expect(pdf.toString('latin1')).toContain(`(${integrated}) Tj`);
  expect(pdf.toString('latin1')).toContain(`(${await ui.dialog.getByTestId('source-sha256').innerText()}) Tj`.slice(0, 20));
  await expect(ui.saveStatus).toContainText('download started');

  await ui.saveReport.click();
  const [jsonDownload] = await Promise.all([page.waitForEvent('download'), ui.asJson.click()]);
  expect(jsonDownload.suggestedFilename()).toMatch(/^tone_analysis_\d{8}T\d{6}Z\.json$/);
  const json = JSON.parse(readFileSync(await jsonDownload.path(), 'utf8'));
  expect(json.schema).toBe('mps-track-analysis/v1');
  expect(json.source).toMatchObject({ fileName: 'tone.wav', sha256: before });
  expect(json.media).toMatchObject({ sampleRateHz: 48000, channels: 2, bitsPerSample: 16, durationSeconds: 5 });
  expect(json.loudness.integratedLufs.toFixed(1)).toBe(integrated.replace(' LUFS', ''));
  expect(JSON.stringify(json)).not.toContain(path); // no filesystem path
  expect(sha(readFileSync(path)), 'the source file is unchanged').toBe(before);
});

test('LAS-172: mono 44.1 kHz reports the real metadata and no stereo section', async ({ page }, testInfo) => {
  await page.addInitScript(() => { delete window.showSaveFilePicker; });
  const { ui } = await analysed(page, testInfo, { channels: 1, sampleRate: 44100 });
  await ui.saveReport.click();
  const [download] = await Promise.all([page.waitForEvent('download'), ui.asJson.click()]);
  const json = JSON.parse(readFileSync(await download.path(), 'utf8'));
  expect(json.media).toMatchObject({ sampleRateHz: 44100, channels: 1 });
  expect(json.stereo).toBeNull();
});

test('LAS-172: the file picker route reports success only after the write completes', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.__written = [];
    window.showSaveFilePicker = async options => ({
      name: options.suggestedName,
      createWritable: async () => ({ write: async blob => { window.__written.push({ type: blob.type, text: await blob.text() }); }, close: async () => {} }),
    });
  });
  const { ui } = await analysed(page, testInfo);
  await ui.saveReport.click();
  await ui.asJson.click();
  await expect(ui.saveStatus).toHaveText(/^Report saved as tone_analysis_\d{8}T\d{6}Z\.json\.$/);
  const written = await page.evaluate(() => window.__written);
  expect(written).toHaveLength(1);
  expect(JSON.parse(written[0].text).schema).toBe('mps-track-analysis/v1');
});

test('LAS-172: cancelling the save dialog or a write error never shows success', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    window.showSaveFilePicker = async () => { throw Object.assign(new Error('The user aborted a request.'), { name: 'AbortError' }); };
  });
  const { ui } = await analysed(page, testInfo);
  await ui.saveReport.click();
  await ui.asPdf.click();
  await expect(ui.saveStatus).toHaveText('Save cancelled. No report was written.');
  await expect(ui.dialog.getByText(/Report saved|download started/)).toHaveCount(0);

  await page.evaluate(() => {
    window.showSaveFilePicker = async () => ({ name: 'x.pdf', createWritable: async () => ({ write: async () => { throw new Error('disk full'); }, close: async () => {}, abort: async () => {} }) });
  });
  await ui.saveReport.click();
  await ui.asPdf.click();
  await expect(ui.dialog.getByRole('alert')).toHaveText('The report could not be saved: disk full');
  await expect(ui.dialog.getByText(/Report saved|download started/)).toHaveCount(0);
});

test('LAS-172: no Save report while analysing, after a cancel, or for a replaced track; offered again after re-analysis', async ({ page }, testInfo) => {
  await page.goto('/');
  const ui = studio(page);
  const first = testInfo.outputPath('a.wav');
  const second = testInfo.outputPath('b.wav');
  writeFileSync(first, makeWav({ seconds: 120, channels: 2, sampleRate: 48000 }));
  writeFileSync(second, makeWav({ seconds: 5, channels: 2, sampleRate: 96000 }));
  await ui.upload.setInputFiles(first);
  await expect(ui.status).toHaveText('Ready');
  await ui.analyze.click();
  await expect(ui.saveReport).toHaveCount(0); // still running
  await ui.dialog.getByRole('button', { name: 'Cancel analysis' }).click();
  await expect(ui.analysisStatus).toHaveText('Analysis cancelled.');
  await expect(ui.saveReport).toHaveCount(0);

  await ui.dialog.getByRole('button', { name: 'Close analysis' }).click();
  await ui.upload.setInputFiles(second);
  await expect(ui.status).toHaveText('Ready');
  await ui.analyze.click();
  await expect(ui.analysisStatus).toHaveText('Analysis complete.');
  await expect(ui.saveReport).toBeEnabled();
  await ui.dialog.getByRole('button', { name: 'Close analysis' }).click();

  // Replacing the track discards the result: the dialog starts again without a report to save.
  await ui.upload.setInputFiles(first);
  await expect(ui.status).toHaveText('Ready');
  await ui.analyze.click();
  await expect(ui.dialog.getByText('Analysis complete.')).toHaveCount(0);
  await expect(ui.saveReport).toHaveCount(0);
});
