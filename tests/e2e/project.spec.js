import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installChainProbe, lastChainParams } from './helpers/chain-probe.js';

// LAS-60 (New project) and LAS-69 (Save / Save As / Open, section presets). Native file pickers
// cannot be driven in a headless browser, so the File System Access API is replaced by an
// in-memory file store that behaves like it (handles, writes that only land on close(), cancel and
// write failures). The download/upload fallback is tested separately with the API removed.
async function installFileStore(page) {
  await page.addInitScript(() => {
    const store = { files: {}, saveAs: [], nextSaveName: null, cancelNext: false, failNext: null, holdClose: null, opens: 0 };
    window.__fs = store;
    const handleFor = name => ({
      kind: 'file', name,
      async createWritable() {
        let text = '';
        return {
          async write(data) { text = typeof data === 'string' ? data : await new Response(data).text(); },
          async close() {
            if (store.holdClose) await store.holdClose;
            if (store.failNext) { const message = store.failNext; store.failNext = null; throw new Error(message); }
            store.files[name] = text;
          },
        };
      },
      async getFile() { return new File([store.files[name] ?? ''], name, { type: 'application/json' }); },
    });
    window.showSaveFilePicker = async ({ suggestedName }) => {
      if (store.cancelNext) { store.cancelNext = false; throw new DOMException('The user aborted a request.', 'AbortError'); }
      const name = store.nextSaveName ?? suggestedName;
      store.nextSaveName = null;
      store.saveAs.push(name);
      return handleFor(name);
    };
    window.showOpenFilePicker = async () => { store.opens++; return [handleFor(store.nextOpen)]; };
  });
}
const files = page => page.evaluate(() => window.__fs.files);
const sha = buffer => createHash('sha256').update(buffer).digest('hex');

function studio(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  return {
    transport,
    status: transport.getByRole('status'),
    projectName: transport.locator('.project-name'),
    projectStatus: page.locator('.project-status'),
    newButton: transport.getByRole('button', { name: 'New project', exact: true }),
    menu: async item => { await transport.getByRole('button', { name: 'Project ▾' }).click(); await page.getByRole('menuitem', { name: item, exact: true }).click(); },
    newDialog: page.getByRole('dialog', { name: 'New project' }),
    prompt: page.locator('dialog[aria-labelledby="unsaved-title"]'),
    relink: page.getByRole('dialog', { name: 'Missing audio' }),
    load: (name, buffer) => page.getByLabel('Import WAV').setInputFiles({ name, mimeType: 'audio/wav', buffer }),
    openEditor: async name => { await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: `Edit ${name}` }).focus(); await page.keyboard.press('Enter'); },
  };
}
const TRACK = makeWav({ seconds: 4, channels: 2, frequency: 330, dbfs: -12 });
const STEM = makeWav({ seconds: 3, channels: 1, frequency: 110, dbfs: -18 });

test('LAS-60: New project asks for a name, validates it, Cancel keeps the session, and work in progress is protected', async ({ page }) => {
  await installFileStore(page);
  await page.goto('/');
  const ui = studio(page);
  await expect(ui.projectName).toHaveText('Untitled project');
  await expect(ui.projectStatus).toHaveText('Not saved yet');
  await ui.load('mix.wav', TRACK);
  await expect(ui.status).toHaveText('Ready');
  await expect(ui.projectStatus).toHaveText('Unsaved changes');

  // Keyboard operable; empty and whitespace-only names are refused.
  await ui.newButton.focus();
  await page.keyboard.press('Enter');
  await expect(ui.newDialog).toBeVisible();
  await ui.newDialog.getByRole('button', { name: 'Create' }).click();
  await expect(ui.newDialog.getByRole('alert')).toHaveText('Enter a project name.');
  await ui.newDialog.getByLabel('Project name').fill('   ');
  await ui.newDialog.getByRole('button', { name: 'Create' }).click();
  await expect(ui.newDialog.getByRole('alert')).toHaveText('Enter a project name.');
  // Cancel keeps everything.
  await ui.newDialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(ui.newDialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'mix.wav' })).toBeVisible();

  // Create from a session with work: Save / Discard / Cancel is asked; Cancel keeps it.
  await ui.newButton.click();
  await ui.newDialog.getByLabel('Project name').fill('Album master');
  await ui.newDialog.getByRole('button', { name: 'Create' }).click();
  await expect(ui.prompt).toBeVisible();
  await expect(ui.prompt.getByRole('heading')).toHaveText('Save changes to “Untitled project”?');
  await ui.prompt.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: 'mix.wav' })).toBeVisible();
  await expect(ui.projectName).toHaveText('Untitled project');

  // Discard: a clean new project with its name; defaults; no audio; editors closed.
  await ui.openEditor('limiter');
  await page.getByRole('dialog', { name: 'Limiter' }).getByLabel('Limiter on', { exact: true }).uncheck();
  await ui.newButton.click();
  await ui.newDialog.getByLabel('Project name').fill('  Album master  ');
  await ui.newDialog.getByRole('button', { name: 'Create' }).click();
  await ui.prompt.getByRole('button', { name: 'Discard' }).click();
  await expect(ui.projectName).toHaveText('Album master');
  await expect(ui.status).toHaveText('No audio loaded');
  await expect(page.getByRole('heading', { name: 'Your session starts here' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Limiter' })).toBeHidden();
  await expect(page.getByRole('region', { name: 'Limiter channel strip' })).toHaveAttribute('data-state', 'on');
  await expect(ui.projectStatus).toHaveText('Not saved yet');
  // An empty session needs no question.
  await ui.newButton.click();
  await ui.newDialog.getByLabel('Project name').fill('Second');
  await ui.newDialog.getByRole('button', { name: 'Create' }).click();
  await expect(ui.prompt).toBeHidden();
  await expect(ui.projectName).toHaveText('Second');
});

test('LAS-69: Save, Save again, Save As, reopen after a restart with relink: settings, stems, layout and media identity come back', async ({ page }) => {
  await installFileStore(page);
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.newButton.click();
  await ui.newDialog.getByLabel('Project name').fill('Album master');
  await ui.newDialog.getByRole('button', { name: 'Create' }).click();
  await ui.load('mix.wav', TRACK);
  await expect(ui.status).toHaveText('Ready');
  // Settings in several modules, with their editors closed afterwards (still saved).
  await ui.openEditor('space');
  const space = page.getByRole('dialog', { name: 'Space' });
  await space.getByLabel('Space on', { exact: true }).check();
  await space.getByRole('combobox', { name: 'Space preset' }).selectOption('Hall');
  await space.getByRole('button', { name: 'Close Space' }).click();
  await ui.openEditor('limiter');
  const limiter = page.getByRole('dialog', { name: 'Limiter' });
  await limiter.getByRole('spinbutton', { name: 'Ceiling (dBTP)' }).fill('-2');
  await limiter.getByRole('spinbutton', { name: 'Ceiling (dBTP)' }).press('Enter');
  await limiter.getByRole('button', { name: 'Move Limiter window' }).focus();
  await page.keyboard.press('ArrowLeft');
  // (The Limiter window may cover the Master panel; the radio is reached from the keyboard.)
  await page.getByRole('region', { name: 'Master', exact: true }).getByRole('radio', { name: 'Original' }).focus();
  await page.keyboard.press('Space');
  // One stem with its own strip settings.
  await page.getByRole('button', { name: 'Stems…' }).click();
  const stems = page.getByRole('dialog', { name: 'Stem session' });
  await stems.getByLabel('Add stem WAVs').setInputFiles({ name: 'bass.wav', mimeType: 'audio/wav', buffer: STEM });
  await expect(stems.getByRole('status')).toHaveText(/^1 stem/);
  await stems.getByRole('slider', { name: 'Gain (dB)' }).fill('-6');
  await stems.getByRole('button', { name: 'Mute' }).click();
  await stems.getByRole('button', { name: 'Close stems' }).click();
  const saved = await lastChainParams(page);
  const limiterBox = await limiter.boundingBox();

  // First save asks where (Ctrl+S, not the browser's Save Page).
  const prevented = await page.evaluate(() => { const e = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, bubbles: true, cancelable: true }); document.dispatchEvent(e); return e.defaultPrevented; });
  expect(prevented).toBe(true);
  await expect(ui.projectStatus).toHaveText('Saved to Album master.mps-project.json');
  let store = await files(page);
  const first = JSON.parse(store['Album master.mps-project.json']);
  expect(first).toMatchObject({ schema: 'mps-project', version: 1, project: { name: 'Album master' }, media: { policy: 'manifest' }, player: { listening: 'original' } });
  expect(first.chain).toEqual(saved);
  expect(first.media.track).toMatchObject({ name: 'mix.wav', size: TRACK.length, sha256: sha(TRACK), channels: 2 });
  expect(first.media.stems).toMatchObject([{ name: 'bass.wav', size: STEM.length, sha256: sha(STEM), gainDb: -6, mute: true }]);
  expect(first.layout.windows.limiter).toMatchObject({ open: true, x: Math.round(limiterBox.x) });
  expect(JSON.stringify(first).length).toBeLessThan(40_000); // settings only, no audio

  // Edit → unsaved; Save updates the same file without asking again.
  await limiter.getByLabel('Limiter on', { exact: true }).uncheck();
  await expect(ui.projectStatus).toHaveText('Unsaved changes');
  await ui.menu('Save project');
  await expect(ui.projectStatus).toHaveText('Saved to Album master.mps-project.json');
  expect(await page.evaluate(() => window.__fs.saveAs)).toEqual(['Album master.mps-project.json']);
  store = await files(page);
  expect(JSON.parse(store['Album master.mps-project.json']).chain.limiter.enabled).toBe(false);

  // Save As: a new file with a new project id; the original is not overwritten afterwards.
  await page.evaluate(() => { window.__fs.nextSaveName = 'Album master copy.mps-project.json'; });
  await ui.menu('Save project as');
  await expect(ui.projectStatus).toHaveText('Saved to Album master copy.mps-project.json');
  await limiter.getByLabel('Limiter on', { exact: true }).check();
  await page.keyboard.press('Control+s');
  await expect(ui.projectStatus).toHaveText('Saved to Album master copy.mps-project.json');
  store = await files(page);
  const original = JSON.parse(store['Album master.mps-project.json']);
  const copy = JSON.parse(store['Album master copy.mps-project.json']);
  expect(original.chain.limiter.enabled).toBe(false);
  expect(copy.chain.limiter.enabled).toBe(true);
  expect(copy.project.id).not.toBe(original.project.id);

  // "Restart": a new page load, then Open (the file store survives in this fake).
  await page.evaluate(store => sessionStorage.setItem('fs', JSON.stringify(store)), store);
  await page.reload();
  await page.evaluate(() => { window.__fs.files = JSON.parse(sessionStorage.getItem('fs')); window.__fs.nextOpen = 'Album master.mps-project.json'; });
  await expect(ui.projectName).toHaveText('Untitled project');
  await page.keyboard.press('Control+o');
  await expect(ui.projectName).toHaveText('Album master');
  // Settings, listening and layout restored; nothing plays; missing audio is listed, not dropped.
  // The restored chain is compared value for value through the Settings file download.
  await ui.relink.getByRole('button', { name: 'Close missing audio' }).click();
  await page.getByRole('button', { name: 'Settings…' }).focus();
  await page.keyboard.press('Enter');
  const settingsDialog = page.getByRole('dialog', { name: 'Chain settings' });
  const settingsDownload = page.waitForEvent('download');
  await settingsDialog.getByRole('link', { name: 'Download settings (.json)' }).click();
  expect(JSON.parse(readFileSync(await (await settingsDownload).path(), 'utf8'))).toEqual(original.chain);
  await settingsDialog.getByRole('button', { name: 'Close settings' }).click();
  await page.getByRole('button', { name: '2 audio files missing — Relink…' }).click();
  await expect(page.getByRole('region', { name: 'Master', exact: true }).getByRole('radio', { name: 'Original' })).toBeChecked();
  await expect(page.getByRole('dialog', { name: 'Limiter' })).toBeVisible();
  expect(Math.round((await page.getByRole('dialog', { name: 'Limiter' }).boundingBox()).x)).toBe(original.layout.windows.limiter.x);
  await expect(ui.status).toHaveText('No audio loaded');
  await expect(ui.relink).toBeVisible();
  await expect(ui.relink.getByRole('status')).toHaveText('2 files still missing.');
  // A different file is refused; the original is accepted.
  await ui.relink.getByLabel('Relink mix.wav').setInputFiles({ name: 'mix.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 4, channels: 2 }) });
  await expect(ui.relink.getByRole('alert')).toContainText('is not the saved mix.wav (its SHA-256 differs)');
  await expect(ui.status).toHaveText('No audio loaded');
  await ui.relink.getByLabel('Relink mix.wav').setInputFiles({ name: 'mix.wav', mimeType: 'audio/wav', buffer: TRACK });
  await expect(ui.relink.getByRole('status')).toHaveText('1 file still missing.');
  await expect(ui.status).toHaveText('Ready');
  await expect(page.getByRole('button', { name: '1 audio file missing — Relink…' })).toBeVisible();
  await ui.relink.getByLabel('Relink bass.wav').setInputFiles({ name: 'bass.wav', mimeType: 'audio/wav', buffer: STEM });
  await expect(ui.relink.getByRole('status')).toHaveText('All audio is linked.');
  await ui.relink.getByRole('button', { name: 'Done' }).click();
  await expect(ui.projectStatus).toHaveText('Opened Album master.mps-project.json');
  await page.getByRole('button', { name: 'Stems…' }).click();
  await expect(stems.getByRole('slider', { name: 'Gain (dB)' })).toHaveValue('-6');
  await expect(stems.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'true');
});

test('LAS-69: cancelled and failed saves keep the session and the last saved file; edits made while saving stay unsaved; bad files are refused', async ({ page }) => {
  await installFileStore(page);
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.load('mix.wav', TRACK);
  await expect(ui.status).toHaveText('Ready');
  await page.keyboard.press('Control+s');
  await expect(ui.projectStatus).toHaveText('Saved to Untitled project.mps-project.json');
  const good = (await files(page))['Untitled project.mps-project.json'];

  await ui.openEditor('limiter');
  const limiter = page.getByRole('dialog', { name: 'Limiter' });
  await limiter.getByLabel('Limiter on', { exact: true }).uncheck();
  // Save As cancelled in the picker: nothing changes.
  await page.evaluate(() => { window.__fs.cancelNext = true; });
  await ui.menu('Save project as');
  await expect(ui.projectStatus).toHaveText('Unsaved changes');
  // A failed write: the message is shown, the session and the old file stay.
  await page.evaluate(() => { window.__fs.failNext = 'The disk is full.'; });
  await page.keyboard.press('Control+s');
  await expect(ui.projectStatus).toHaveText('Save failed: The disk is full. Your work is still here.');
  expect((await files(page))['Untitled project.mps-project.json']).toBe(good);
  await expect(limiter.getByLabel('Limiter on', { exact: true })).not.toBeChecked();
  // An edit made while a save is in progress is not covered by that save.
  await page.evaluate(() => { window.__fs.holdClose = new Promise(resolve => { window.__fs.release = resolve; }); });
  await page.keyboard.press('Control+s');
  await expect(ui.projectStatus).toHaveText('Saving…');
  await limiter.getByRole('spinbutton', { name: 'Release (ms)' }).fill('250');
  await limiter.getByRole('spinbutton', { name: 'Release (ms)' }).press('Enter');
  await page.evaluate(() => { window.__fs.holdClose = null; window.__fs.release(); });
  await expect(ui.projectStatus).toHaveText('Unsaved changes');
  expect(JSON.parse((await files(page))['Untitled project.mps-project.json']).chain.limiter).toMatchObject({ enabled: false, release: 100 });

  // Corrupt and newer files are refused without touching the session.
  const before = await lastChainParams(page);
  await page.evaluate(() => { window.__fs.files['broken.mps-project.json'] = '{"schema":"mps-project",'; window.__fs.files['future.mps-project.json'] = JSON.stringify({ schema: 'mps-project', version: 9 }); });
  for (const [name, message] of [['broken.mps-project.json', 'not valid JSON'], ['future.mps-project.json', 'newer studio']]) {
    await page.evaluate(n => { window.__fs.nextOpen = n; }, name);
    await ui.menu('Open project');
    await ui.prompt.getByRole('button', { name: 'Discard' }).click();
    await expect(page.getByRole('alert').filter({ hasText: name })).toContainText(message);
    await expect(page.getByRole('heading', { name: 'mix.wav' })).toBeVisible();
    expect(await lastChainParams(page)).toEqual(before);
    await page.getByRole('button', { name: 'Dismiss' }).focus();
    await page.keyboard.press('Enter');
  }
});

test('LAS-69: without the File System Access API, Save downloads a project file and Open uses the file picker', async ({ page }, testInfo) => {
  await page.addInitScript(() => { delete window.showSaveFilePicker; delete window.showOpenFilePicker; });
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.load('mix.wav', TRACK);
  await expect(ui.status).toHaveText('Ready');
  const downloading = page.waitForEvent('download');
  await ui.menu('Save project');
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('Untitled project.mps-project.json');
  await expect(ui.projectStatus).toHaveText('Saved as a download (Untitled project.mps-project.json)');
  const path = testInfo.outputPath('downloaded.mps-project.json');
  await download.saveAs(path);
  expect(JSON.parse(readFileSync(path, 'utf8')).media.track.sha256).toBe(sha(TRACK));
  await page.reload();
  const chooser = page.waitForEvent('filechooser');
  await ui.menu('Open project');
  await (await chooser).setFiles(path);
  await expect(ui.relink).toBeVisible();
  await expect(ui.relink.getByRole('status')).toHaveText('1 file still missing.');
});

test('LAS-69: section presets save and load one module only, with undo; whole files and other modules are refused', async ({ page }, testInfo) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await ui.load('mix.wav', TRACK); // the chain (and the probe's view of it) exists once audio is loaded
  await expect(ui.status).toHaveText('Ready');
  await ui.openEditor('space');
  const space = page.getByRole('dialog', { name: 'Space' });
  await space.getByLabel('Space on', { exact: true }).check();
  await space.getByRole('combobox', { name: 'Space preset' }).selectOption('Plate');
  const downloading = page.waitForEvent('download');
  await space.getByRole('button', { name: 'Save Space preset' }).click();
  const file = await downloading;
  expect(file.suggestedFilename()).toBe('space-preset.mps-module.json');
  const path = testInfo.outputPath('space.json');
  await file.saveAs(path);
  expect(JSON.parse(readFileSync(path, 'utf8'))).toMatchObject({ schema: 'mps-module-preset', module: 'space', settings: { enabled: true, mix: 20, decay: 1.6 } });
  // Change Space and the limiter; loading the Space preset restores Space only.
  await space.getByRole('combobox', { name: 'Space preset' }).selectOption('Hall');
  await ui.openEditor('limiter');
  const limiter = page.getByRole('dialog', { name: 'Limiter' });
  await limiter.getByLabel('Limiter on', { exact: true }).uncheck();
  await space.getByLabel('Load Space preset').setInputFiles(path);
  await expect(space.getByText('Loaded space.json into Space only (one undo step).')).toBeVisible();
  let params = await lastChainParams(page);
  expect(params.space).toMatchObject({ enabled: true, mix: 20, decay: 1.6 });
  expect(params.limiter.enabled).toBe(false);
  await space.getByRole('button', { name: 'Undo', exact: true }).focus(); // the Limiter window may cover it
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await lastChainParams(page)).space.decay).toBe(2.6);
  // The Space preset in the Limiter editor is refused; nothing changes.
  params = await lastChainParams(page);
  await limiter.getByLabel('Load Limiter preset').setInputFiles(path);
  await expect(limiter.getByRole('alert')).toContainText('This preset is for Space; load it in the Space editor. Nothing was changed.');
  expect(await lastChainParams(page)).toEqual(params);
});

test('LAS-69: leaving the page with unsaved changes asks first', async ({ page }) => {
  await page.goto('/');
  await studio(page).load('mix.wav', TRACK);
  await expect(studio(page).projectStatus).toHaveText('Unsaved changes');
  const dialog = page.waitForEvent('dialog');
  await page.close({ runBeforeUnload: true });
  const asked = await dialog;
  expect(asked.type()).toBe('beforeunload');
  await asked.dismiss();
});
