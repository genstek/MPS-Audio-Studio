import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { analyze } from '../../src/dsp/analysis.js';
import { audioSources, installAudioProbe } from './helpers/audio-probe.js';
import { comparisonGains, installChainProbe, lastChainParams, paramsMessageCount } from './helpers/chain-probe.js';
import { enterSecret, newEmail, newPassword, registerVerified } from './helpers/accounts.js';

// LAS-31 workflows. They prove that the comparison measures the chosen sections, flags its limits,
// drives the real output stage at matched loudness and never changes the processing settings.
// Measurement accuracy is covered by the unit tests; these checks do not prove audio quality.
test.use({ trace: 'off' }); // the saved-reference test types account secrets

const MIX = makeWav({ seconds: 12, channels: 2, sampleRate: 44100, frequency: 440, dbfs: -20 });
const REFERENCE = makeWav({ seconds: 12, channels: 2, sampleRate: 44100, frequency: 880, dbfs: -12 });
const arrayBuffer = buffer => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
const lufsOf = (wav, segment) => {
  const audio = decodeWav(arrayBuffer(wav));
  return analyze(audio.samples, audio.sampleRate, segment).loudness.integratedLufs;
};
const shown = (value, unit) => `${value > 0 ? '+' : ''}${value.toFixed(1).replace('-', '−')} ${unit}`;

function studio(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const dialog = page.getByRole('dialog', { name: 'Compare with a reference' });
  return {
    status: transport.getByRole('status'),
    play: transport.getByRole('button', { name: 'Play', exact: true }),
    upload: page.getByLabel('Import WAV'),
    dialog,
    open: () => page.getByRole('button', { name: 'Compare with a reference', exact: true }).click(),
    dialogStatus: dialog.getByRole('status'),
    alert: dialog.getByRole('alert'),
    compare: dialog.getByRole('button', { name: 'Measure and compare' }),
    row: name => dialog.getByRole('row', { name: new RegExp(`^${name}`) }),
    sections: async ({ mix, reference }) => {
      if (reference) {
        await dialog.getByLabel('Reference start (s)').fill(reference[0]);
        await dialog.getByLabel('Reference end (s)').fill(reference[1]);
      }
      await dialog.getByLabel('Mix start (s)').fill(mix[0]);
      await dialog.getByLabel('Mix end (s)').fill(mix[1]);
    },
  };
}

async function importMix(page, ui, { navigate = true } = {}) {
  if (navigate) await page.goto('/');
  await ui.upload.setInputFiles({ name: 'my-mix.wav', mimeType: 'audio/wav', buffer: MIX });
  await expect(ui.status).toHaveText('Ready');
}

test.beforeEach(async ({ page }) => {
  await installChainProbe(page);
  await installAudioProbe(page);
});

test('LAS-31: compare a mix section with a local reference, listen level-matched, no settings change', async ({ page }) => {
  const ui = studio(page);
  await importMix(page, ui);
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  const paramsBefore = await lastChainParams(page);
  const messagesBefore = await paramsMessageCount(page);

  await ui.open();
  await expect(ui.dialog.getByText('Sign in (Account) to use saved references.')).toBeVisible();
  await expect(ui.dialog.getByLabel('WAV on this device')).toBeChecked();
  await ui.dialog.getByLabel('Choose reference WAV').setInputFiles({ name: 'reference.wav', mimeType: 'audio/wav', buffer: REFERENCE });
  await expect(ui.dialog.getByText('reference.wav: 12.0 s, 44,100 Hz, stereo')).toBeVisible();
  await ui.sections({ mix: ['1', '11'], reference: ['2', '12'] });
  await ui.compare.click();
  await expect(ui.dialogStatus).toHaveText('Compared with reference.wav.', { timeout: 30_000 });

  // The displayed values are those of the chosen sections, computed independently here.
  const mixLufs = lufsOf(MIX, { start: 1, end: 11 });
  const referenceLufs = lufsOf(REFERENCE, { start: 2, end: 12 });
  const loudness = ui.row('Integrated loudness');
  await expect(loudness).toContainText('Level difference (not a quality measure)');
  await expect(loudness.getByRole('cell').nth(0)).toHaveText(shown(referenceLufs, 'LUFS').replace('+', ''));
  await expect(loudness.getByRole('cell').nth(1)).toHaveText(shown(mixLufs, 'LUFS').replace('+', ''));
  await expect(loudness.getByRole('cell').nth(3)).toHaveText(shown(mixLufs - referenceLufs, 'LU'));
  await expect(ui.dialog.getByRole('table')).toContainText('Mix 1.0–11.0 s, reference 2.0–12.0 s');
  for (const group of ['Loudness and level', 'Dynamics', 'Stereo', 'Tonal balance']) await expect(ui.dialog.getByRole('columnheader', { name: group })).toBeVisible();
  await expect(ui.dialog.getByRole('listitem').filter({ hasText: 'Note: Level differences are measurements, not quality scores; listening is level-matched.' })).toBeVisible();
  await expect(ui.dialog.getByRole('heading', { name: 'Interpretation (not a measurement)' })).toBeVisible();

  // Monitor: two looping sections through the output stage, the louder versions turned down.
  await ui.dialog.getByRole('button', { name: 'Start monitor' }).click();
  await expect(ui.dialog.getByText(/^Looping the mix 1\.0–11\.0 s and the reference 2\.0–12\.0 s\. Matching gains: /)).toBeVisible();
  await expect(ui.status).toHaveText('Stopped'); // normal playback was replaced
  expect(await audioSources(page)).toMatchObject({ playing: 2 });
  const referenceGain = 10 ** ((mixLufs - referenceLufs) / 20); // the reference is louder
  await expect.poll(async () => (await comparisonGains(page)).reference).toBeCloseTo(referenceGain, 2);
  expect(await comparisonGains(page)).toMatchObject({ processed: 0, original: 0 });
  await ui.dialog.getByLabel('Mix', { exact: true }).check();
  await expect.poll(() => comparisonGains(page)).toMatchObject({ processed: 0, reference: 0 });
  expect((await comparisonGains(page)).original).toBeGreaterThan(0.99);
  await ui.dialog.getByLabel('Processed mix').check();
  await expect.poll(async () => (await comparisonGains(page)).processed).toBeGreaterThan(0.95);

  // Closing stops the monitor and restores normal listening.
  await ui.dialog.getByRole('button', { name: 'Close comparison' }).click();
  await expect.poll(() => audioSources(page)).toMatchObject({ playing: 0 });
  await expect.poll(async () => (await comparisonGains(page)).reference).toBe(0);
  // QA-03: choosing, comparing and monitoring sent no settings to the chain.
  expect(await paramsMessageCount(page)).toBe(messagesBefore);
  expect(await lastChainParams(page)).toEqual(paramsBefore);
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
});

test('LAS-31: mono, unequal, short and silent sections give honest outcomes', async ({ page }) => {
  const ui = studio(page);
  await importMix(page, ui);
  await ui.open();
  const mono = makeWav({ seconds: 10, channels: 1, sampleRate: 48000, frequency: 880, dbfs: -12 });
  await ui.dialog.getByLabel('Choose reference WAV').setInputFiles({ name: 'mono.wav', mimeType: 'audio/wav', buffer: mono });
  await ui.sections({ mix: ['0', '4'], reference: ['0', '10'] });
  await ui.compare.click();
  await expect(ui.dialogStatus).toHaveText('Compared with mono.wav.', { timeout: 30_000 });
  const limits = ui.dialog.getByRole('list').first();
  await expect(limits).toContainText('Uncertain: A section is shorter than 5 s');
  await expect(limits).toContainText('Uncertain: The sections differ in length (4.0 s mix, 10.0 s reference)');
  await expect(limits).toContainText('Not compared: Stereo measures are not compared: the reference is mono.');
  await expect(limits).toContainText('Uncertain: Different sample rates (44100 Hz mix, 48000 Hz reference)');
  await expect(ui.row('Correlation').getByRole('cell').nth(3)).toHaveText('not compared');
  await expect(ui.row('Side relative to mid').getByRole('cell').nth(4)).toHaveText('not compared');
  for (const item of await ui.dialog.locator('.comparison-interpretations li').allTextContents()) expect(item).toMatch(/\(uncertain: see the limits above\)$/);

  const silent = makeWav({ seconds: 10, channels: 2, sampleRate: 44100, dbfs: -200 });
  await ui.dialog.getByLabel('Choose reference WAV').setInputFiles({ name: 'silent.wav', mimeType: 'audio/wav', buffer: silent });
  await ui.sections({ mix: ['1', '11'], reference: ['0', '10'] });
  await ui.compare.click();
  await expect(ui.alert).toHaveText('The reference section is silent; choose a section with music.', { timeout: 30_000 });
  await expect(ui.dialog.getByRole('table')).toHaveCount(0);

  await ui.sections({ mix: ['5', '13'], reference: ['0', '10'] });
  await ui.compare.click();
  await expect(ui.alert).toHaveText('Choose a mix section inside the track (0 to 12.0 s).');
  await ui.sections({ mix: ['1', '11'], reference: ['8', '11'] });
  await ui.compare.click();
  await expect(ui.alert).toHaveText('Choose a reference section inside the file (0 to 10.0 s).', { timeout: 30_000 });
});

async function signIn(page, request) {
  const email = newEmail('compare');
  const password = newPassword();
  const account = await registerVerified(page, request, email, password);
  await account.email.fill(email);
  await enterSecret(account.password, password);
  await account.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(account.dialog.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await account.dialog.getByRole('button', { name: 'Close account dialog' }).click();
}

async function saveReference(page, buffer, name, segment) {
  const dialog = page.getByRole('dialog', { name: 'Reference profiles' });
  await page.getByRole('button', { name: 'References', exact: true }).click();
  await dialog.getByLabel('Choose reference WAV').setInputFiles({ name: `${name}.wav`, mimeType: 'audio/wav', buffer });
  await dialog.getByLabel('Start (s)').fill(segment[0]);
  await dialog.getByLabel('End (s)').fill(segment[1]);
  await dialog.getByLabel('Name').fill(name);
  await dialog.getByLabel(/^Style or artist/).fill('Enigma');
  await dialog.getByLabel(/^Source version/).fill('1990 album');
  await dialog.getByRole('button', { name: 'Measure segment' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Measured.', { timeout: 30_000 });
  await dialog.getByRole('button', { name: 'Save to my references' }).click();
  await expect(dialog.getByRole('status')).toHaveText(`Saved “${name}” (Enigma, 1990 album).`);
  await dialog.getByRole('button', { name: 'Close references' }).click();
}

test('LAS-31: saved references use their stored measurements, switching them changes no settings, a mismatched file is refused', async ({ page, request }) => {
  const ui = studio(page);
  await page.goto('/');
  await signIn(page, request); // signing in reloads the page, so the mix is imported afterwards
  await importMix(page, ui, { navigate: false });
  const quiet = makeWav({ seconds: 12, channels: 2, sampleRate: 44100, frequency: 660, dbfs: -24 });
  await saveReference(page, REFERENCE, 'Chorus', ['2', '10']);
  await saveReference(page, quiet, 'Intro', ['0', '8']);
  const messagesBefore = await paramsMessageCount(page);

  await ui.open();
  await expect(ui.dialog.getByLabel('Saved reference', { exact: true }).first()).toBeChecked();
  const select = ui.dialog.getByRole('combobox', { name: 'Saved reference' });
  await select.selectOption({ label: 'Chorus · Enigma · 1990 album · 2.0–10.0 s' });
  await ui.sections({ mix: ['1', '11'] });
  await ui.compare.click();
  await expect(ui.dialogStatus).toHaveText('Compared with Chorus (Enigma, 1990 album).', { timeout: 30_000 });
  await expect(ui.row('Integrated loudness').getByRole('cell').nth(0)).toHaveText(shown(lufsOf(REFERENCE, { start: 2, end: 10 }), 'LUFS').replace('+', ''));
  await ui.dialog.getByRole('button', { name: 'Start monitor' }).click();
  await expect(ui.dialog.getByText(/^Looping the mix 1\.0–11\.0 s and the reference 2\.0–10\.0 s\./)).toBeVisible();

  await select.selectOption({ label: 'Intro · Enigma · 1990 album · 0.0–8.0 s' });
  await ui.compare.click();
  await expect(ui.dialogStatus).toHaveText('Compared with Intro (Enigma, 1990 album).', { timeout: 30_000 });
  await expect(ui.row('Integrated loudness').getByRole('cell').nth(0)).toHaveText(shown(lufsOf(quiet, { start: 0, end: 8 }), 'LUFS').replace('+', ''));
  expect(await paramsMessageCount(page)).toBe(messagesBefore); // QA-03

  // The stored measurements are used only with the exact file they describe.
  await page.route('**/api/download/**', route => route.fulfill({ status: 200, contentType: 'audio/wav', body: quiet.subarray(0, quiet.length - 2) }));
  await ui.compare.click();
  await expect(ui.alert).toHaveText('The stored reference file does not match its profile (checksums differ); measure it again in References.', { timeout: 30_000 });
});

test('LAS-31: the comparison fits 360×780 and 1440×900; the table scrolls inside its own region', async ({ page }, testInfo) => {
  const ui = studio(page);
  await importMix(page, ui);
  await ui.open();
  await ui.dialog.getByLabel('Choose reference WAV').setInputFiles({ name: 'reference.wav', mimeType: 'audio/wav', buffer: REFERENCE });
  await ui.sections({ mix: ['1', '11'], reference: ['2', '12'] });
  await ui.compare.click();
  await expect(ui.dialogStatus).toHaveText('Compared with reference.wav.', { timeout: 30_000 });
  for (const [width, height] of [[360, 780], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    const box = await ui.dialog.boundingBox();
    expect(box.x, `${width}px: dialog inside the viewport`).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width, `${width}px: dialog inside the viewport`).toBeLessThanOrEqual(width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}px: no horizontal page scroll`).toBe(true);
    const scroller = ui.dialog.getByRole('region', { name: 'Measured differences' });
    const overflow = await scroller.evaluate(element => element.scrollWidth > element.clientWidth);
    expect(overflow, `${width}px: the table scrolls only when narrow`).toBe(width < 700);
    await page.screenshot({ path: testInfo.outputPath(`compare-dialog-${width}x${height}.png`) });
  }
  await ui.dialog.getByRole('region', { name: 'Measured differences' }).focus();
  await expect(ui.dialog.getByRole('region', { name: 'Measured differences' })).toBeFocused();
});
