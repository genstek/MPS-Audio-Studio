import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { defaultChain, editBand, serializeChain, setEqMode, validateChain } from '../../src/dsp/chain-params.js';
import { renderChain } from '../../src/dsp/chain.js';
import { encodeWav } from '../../src/dsp/wav-encode.js';
import { serializePreset } from '../../src/presets.js';
import { FIXTURES } from '../fixtures/dsp-fixtures.js';
import { concat } from '../fixtures/signals.js';
import { PRESETS } from '../harness/presets.js';
import { makeWav } from '../fixtures/wav.js';
import { installChainProbe, lastChainParams, paramsMessageCount } from './helpers/chain-probe.js';
import { enterSecret, newEmail, newPassword, registerVerified } from './helpers/accounts.js';

// LAS-33 workflows: presets kept in the owner's account, migration and refusal of imported files,
// preferences kept apart from reference targets, and decisions remembered only on request.
test.use({ trace: 'off' }); // these tests type account secrets

const TONE = makeWav({ seconds: 4, channels: 2, sampleRate: 44100, frequency: 440, dbfs: -18 });
function customChain() {
  let chain = setEqMode(defaultChain(), 'independent');
  chain = editBand(chain, 'left', 2, { enabled: true, type: 'low-shelf', frequency: 80, gain: 2.5, q: 0.8 });
  chain = editBand(chain, 'right', 15, { enabled: true, type: 'bell', frequency: 2500, gain: -3, q: 2 });
  chain = editBand(chain, 'right', 23, { enabled: true, type: 'low-pass', frequency: 18000, gain: 0, q: 0.707 });
  return validateChain({ ...chain, compressor: { ...chain.compressor, enabled: true, threshold: -22, ratio: 2.5 }, limiter: { ...chain.limiter, inputGain: 3.5, ceiling: -0.8 } });
}

async function signIn(page, request, label) {
  const email = newEmail(label);
  const password = newPassword();
  const account = await registerVerified(page, request, email, password);
  await account.email.fill(email);
  await enterSecret(account.password, password);
  await account.dialog.getByRole('button', { name: 'Sign in' }).click();
  await expect(account.dialog.getByRole('heading', { name: 'Your account' })).toBeVisible();
  await account.dialog.getByRole('button', { name: 'Close account dialog' }).click();
}

async function importTrack(page, buffer = TONE, name = 'tone.wav') {
  await page.getByLabel('Import WAV').setInputFiles({ name, mimeType: 'audio/wav', buffer });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
}

function settings(page) {
  const dialog = page.getByRole('dialog', { name: 'Chain settings' });
  return {
    dialog,
    open: () => page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: 'Settings…' }).click(),
    close: () => dialog.getByRole('button', { name: 'Close settings' }).click(),
    status: dialog.getByRole('status'),
    alert: dialog.getByRole('alert'),
    item: name => dialog.getByRole('listitem').filter({ hasText: name }),
  };
}

// Every request to these endpoints must be small JSON, sent to this studio only.
function watchSettingsTraffic(page) {
  const seen = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (!/^\/api\/(presets|preferences|decisions)/.test(url.pathname)) return;
    seen.push({ host: url.host, method: request.method(), type: request.headers()['content-type'] ?? null, bytes: request.postDataBuffer()?.length ?? 0 });
  });
  return seen;
}
const expectSettingsOnly = seen => {
  expect(seen.length).toBeGreaterThan(0);
  for (const r of seen) {
    expect(r.host).toBe('127.0.0.1:5173');
    if (r.bytes) expect(r.type).toBe('application/json');
    expect(r.bytes).toBeLessThan(64 * 1024);
  }
};

test('LAS-33: save a customised chain as a preset, reload, apply it exactly, rename, export and delete', async ({ page, request }, testInfo) => {
  await installChainProbe(page);
  const traffic = watchSettingsTraffic(page);
  await page.goto('/');
  await signIn(page, request, 'preset');
  await importTrack(page);
  const ui = settings(page);
  await ui.open();
  await ui.dialog.getByLabel('Load settings file').setInputFiles({ name: 'custom.json', mimeType: 'application/json', buffer: Buffer.from(serializeChain(customChain())) });
  await expect(ui.status).toHaveText('Loaded custom.json.');
  await ui.dialog.getByLabel('Preset name').fill('Night drive');
  await ui.dialog.getByRole('button', { name: 'Save current settings as preset' }).click();
  await expect(ui.status).toHaveText('Saved the preset “Night drive”.');
  await expect(ui.item('Night drive')).toContainText('saved settings · chain v2'); // schema v2 since LAS-64 (Space)
  for (const [width, height] of [[360, 780], [1280, 720]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}px: no horizontal page scroll`).toBe(true);
    // Every section stays one column: the file pickers sit inside the dialog (defect found here).
    const box = await ui.dialog.boundingBox();
    for (const picker of await ui.dialog.locator('.file-picker').all()) {
      const pickerBox = await picker.boundingBox();
      expect(pickerBox.x + pickerBox.width, `${width}px: file picker inside the dialog`).toBeLessThanOrEqual(box.x + box.width);
    }
    const heading = await ui.dialog.getByRole('heading', { name: 'My presets' }).boundingBox();
    const nameField = await ui.dialog.getByLabel('Preset name').boundingBox();
    expect(nameField.y, `${width}px: the preset form sits below its heading`).toBeGreaterThan(heading.y + heading.height - 1);
    await ui.dialog.getByRole('region', { name: 'My presets' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`settings-presets-${width}x${height}.png`) });
  }

  // A new page load starts from the defaults; the preset brings back the complete chain.
  await page.reload();
  await importTrack(page);
  await ui.open();
  await expect(ui.item('Night drive')).toBeVisible();
  await ui.dialog.getByRole('button', { name: 'Apply Night drive' }).click();
  await expect(ui.status).toHaveText('Applied “Night drive” (one undo step).');
  await expect.poll(() => lastChainParams(page)).toEqual(customChain());

  await ui.dialog.getByRole('button', { name: 'Rename Night drive' }).click();
  await ui.dialog.getByLabel('New name').fill('Night drive v2');
  await ui.dialog.getByRole('button', { name: 'Save name' }).click();
  await expect(ui.status).toHaveText('Renamed to “Night drive v2”.');
  const downloading = page.waitForEvent('download');
  await ui.dialog.getByRole('button', { name: 'Export Night drive v2' }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe('Night-drive-v2.mps-preset.json');
  await file.saveAs(testInfo.outputPath('exported.json'));
  const exported = JSON.parse(readFileSync(testInfo.outputPath('exported.json'), 'utf8'));
  expect(exported).toEqual({ schema: 'mps-preset', version: 1, name: 'Night drive v2', chain: customChain(), origin: 'manual', analysisVersion: null, proposalVersion: null, strength: null });
  await ui.dialog.getByRole('button', { name: 'Delete Night drive v2' }).click();
  await expect(ui.status).toHaveText('Deleted the preset “Night drive v2”.');
  await expect(ui.dialog.getByText('No presets yet.')).toBeVisible();
  expectSettingsOnly(traffic);
});

test('LAS-33: imported files are migrated or refused with a reason, without touching the current settings', async ({ page, request }) => {
  await installChainProbe(page);
  await page.goto('/');
  await signIn(page, request, 'import');
  await importTrack(page);
  const ui = settings(page);
  await ui.open();
  const messages = await paramsMessageCount(page);
  // An LAS-28 settings file in the version 1 schema (before Space, LAS-64).
  const { space: _space, ...current } = JSON.parse(serializeChain(customChain())); // eslint-disable-line no-unused-vars
  const legacy = { ...current, version: 1, order: ['eq', 'compressor', 'limiter'] };
  await ui.dialog.getByLabel('Import preset file').setInputFiles({ name: 'club-master.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)) });
  await expect(ui.status).toHaveText('Imported “club-master” (migrated from an mps-chain v1 settings file). Apply it when you want it.');
  await expect(ui.item('club-master')).toContainText('imported file');
  const newer = { ...JSON.parse(serializePreset({ name: 'Future', chain: customChain() })), version: 2 }; // mps-preset v2 is newer
  await ui.dialog.getByLabel('Import preset file').setInputFiles({ name: 'future.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(newer)) });
  await expect(ui.alert).toHaveText('future.json: This preset was saved by a newer studio (mps-preset v2); update the studio to open it. Nothing was changed.');
  const broken = JSON.parse(serializePreset({ name: 'Broken', chain: customChain() }));
  broken.chain.limiter.ceiling = 3;
  await ui.dialog.getByLabel('Import preset file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(broken)) });
  await expect(ui.alert).toHaveText(/^broken\.json: The preset's settings are invalid: .*ceiling.* Nothing was changed\.$/);
  await ui.dialog.getByLabel('Import preset file').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
  await expect(ui.alert).toHaveText('notes.json: The file is not an MPS preset or settings file. Nothing was changed.');
  await expect(ui.dialog.getByRole('listitem')).toHaveCount(1);
  expect(await paramsMessageCount(page)).toBe(messages); // the playing chain never changed
});

test('LAS-33: preferences stay apart from reference targets, either can be reset, decisions are remembered only on request, and a second account sees nothing', async ({ page, request, browser }, testInfo) => {
  test.setTimeout(180_000);
  await installChainProbe(page);
  const traffic = watchSettingsTraffic(page);
  const RATE = 44100;
  const loop = FIXTURES.programme(RATE).map(channel => Float32Array.from(concat(channel, channel)));
  const wav = channels => Buffer.from(encodeWav(channels, RATE, { bitDepth: 16 }).bytes);
  await page.goto('/');
  await signIn(page, request, 'prefs');
  await importTrack(page, wav(loop.map(c => c.map(v => v * 0.5))), 'my-mix.wav');
  await page.getByRole('button', { name: 'Compare with a reference', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare with a reference' });
  await dialog.getByLabel('WAV on this device').check();
  await dialog.getByLabel('Choose reference WAV').setInputFiles({ name: 'reference.wav', mimeType: 'audio/wav', buffer: wav(renderChain(PRESETS.master, loop, RATE).channels) });
  for (const [label, value] of [['Reference start (s)', '1'], ['Reference end (s)', '7'], ['Mix start (s)', '1'], ['Mix end (s)', '7']]) await dialog.getByLabel(label).fill(value);
  await dialog.getByRole('button', { name: 'Measure and compare' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Compared with reference.wav.', { timeout: 30_000 });
  const panel = dialog.getByRole('region', { name: 'Proposal from this comparison' });
  await panel.getByRole('button', { name: 'Propose settings' }).click();
  const card = panel.getByRole('article', { name: /^Your preferences/ });
  await expect(card).toContainText('not saved', { timeout: 90_000 });

  // A preference: high shelf +2 dB, saved to the account.
  await card.getByLabel('High shelf (8 kHz)').fill('2');
  await card.getByRole('button', { name: 'Save my preferences' }).click();
  await expect(panel).toContainText('Preferences saved to your account.');
  await expect(card).toContainText('saved');
  await card.scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('proposal-preferences-1280x720.png') });
  await panel.getByRole('button', { name: 'Preview proposal' }).click();
  const bells = params => params.eq.left.filter((band, i) => band.enabled && i < 22).length;
  await expect.poll(async () => (await lastChainParams(page))?.eq.left[23]).toEqual({ enabled: true, type: 'high-shelf', frequency: 8000, q: 0.707, gain: 2 });
  const referenceBells = bells(await lastChainParams(page));
  expect(referenceBells).toBeGreaterThan(0);
  // Reference targets off: only the preference shelf plays. Back on: both.
  await panel.getByLabel('Use reference targets').uncheck();
  await expect.poll(async () => bells(await lastChainParams(page))).toBe(0);
  expect((await lastChainParams(page)).eq.left[23].gain).toBe(2);
  await panel.getByLabel('Use reference targets').check();
  await expect.poll(async () => bells(await lastChainParams(page))).toBe(referenceBells);
  // Reset preferences: the shelf goes, the reference targets stay.
  await card.getByRole('button', { name: 'Reset my preferences' }).click();
  await expect(panel).toContainText('Preferences reset; the reference targets are unchanged.');
  await expect.poll(async () => (await lastChainParams(page)).eq.left[23].enabled).toBe(false);
  expect(bells(await lastChainParams(page))).toBe(referenceBells);

  // Decisions: remembered only when ticked.
  await panel.getByLabel('Remember my decision').check();
  await panel.getByLabel('Rating').selectOption('4');
  await panel.getByRole('button', { name: 'Reject proposal' }).click();
  await expect(panel).toContainText('Proposal rejected; your settings are unchanged. Decision remembered.');
  await dialog.getByRole('button', { name: 'Close comparison' }).click();
  const ui = settings(page);
  await ui.open();
  await expect(ui.dialog.getByRole('region', { name: 'Remembered proposal decisions' })).toContainText('Rejected at 100 % · rated 4/5');
  await ui.dialog.getByRole('button', { name: 'Forget all decisions' }).click();
  await expect(ui.status).toHaveText('Forgot all remembered decisions.');
  await expect(ui.dialog.getByText(/^None\. A decision is remembered only when you tick/)).toBeVisible();
  await ui.dialog.getByLabel('Preset name').fill('Mine');
  await ui.dialog.getByRole('button', { name: 'Save current settings as preset' }).click();
  await expect(ui.item('Mine')).toBeVisible();
  expectSettingsOnly(traffic);

  // A second account sees none of it.
  const context = await browser.newContext();
  const second = await context.newPage();
  await second.goto('/');
  await signIn(second, request, 'other');
  await importTrack(second);
  const theirs = settings(second);
  await theirs.open();
  await expect(theirs.dialog.getByText('No presets yet.')).toBeVisible();
  await expect(theirs.dialog.getByText(/^None\. A decision is remembered/)).toBeVisible();
  await context.close();
});
