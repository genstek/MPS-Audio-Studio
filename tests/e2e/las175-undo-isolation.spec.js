import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installChainProbe, lastChainParams } from './helpers/chain-probe.js';

// LAS-175 (follow-up to #111, tracked in #112): does an EQ edit, Undo or Redo ever change Dynamics,
// Limiter or Space? Intended behaviour is ONE GLOBAL chronological history for the whole chain
// (see useChainSettings.js). These tests tell that apart from accidental cross-module mutation:
//  - every edit changes only the module that was edited (checked on the real params sent to the
//    audio worklet and on the rendered control values);
//  - Undo/Redo walk the edits newest-first / oldest-first across modules, one step per dispatch;
//  - layout switching and project Save/Open never add history snapshots.
// Native file pickers are replaced by an in-memory File System Access fake (as in project.spec.js).
const LAYOUTS = [['classic', 'Classic'], ['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'D']];
const TOGGLE = { EQ: 'EQ on', Dynamics: 'Compressor on', Limiter: 'Limiter on', Space: 'Space on' };
const TRACK = makeWav({ seconds: 4, channels: 2, frequency: 330, dbfs: -12 });

async function installFileStore(page) {
  await page.addInitScript(() => {
    const store = { files: {}, nextOpen: null };
    window.__fs = store;
    const handleFor = name => ({
      kind: 'file', name,
      async createWritable() {
        let text = '';
        return { async write(data) { text = typeof data === 'string' ? data : await new Response(data).text(); }, async close() { store.files[name] = text; } };
      },
      async getFile() { return new File([store.files[name] ?? ''], name, { type: 'application/json' }); },
    });
    window.showSaveFilePicker = async ({ suggestedName }) => handleFor(suggestedName);
    window.showOpenFilePicker = async () => [handleFor(store.nextOpen)];
  });
}

function ui(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const win = name => page.getByRole('dialog', { name, exact: true });
  return {
    transport, win,
    status: transport.getByRole('status'),
    projectStatus: page.locator('.project-status'),
    // Editors may cover each other or the mixer strips, so they are opened from the keyboard.
    open: async name => { await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: `Edit ${name}` }).focus(); await page.keyboard.press('Enter'); },
    field: async (dialog, label, value) => {
      const box = dialog.getByRole('spinbutton', { name: label, exact: true });
      await box.focus();
      await box.fill(String(value));
      await box.press('Enter');
    },
    eqGain: async value => ui(page).field(win('EQ'), 'Gain (dB)', value),
    dyn: value => ui(page).field(win('Dynamics'), 'Ratio (: 1)', value),
    lim: value => ui(page).field(win('Limiter'), 'Ceiling (dBTP)', value),
    spc: value => ui(page).field(win('Space'), 'Mix (wet) (%)', value),
    // Floating editors overlap. Focusing a control brings its window to the front (as clicking does),
    // after which a real pointer click on a button of that window lands on it.
    front: async name => { await win(name).getByLabel(TOGGLE[name], { exact: true }).focus(); await expect(win(name)).toHaveClass(/is-active/); },
    pointer: async (name, button) => { await ui(page).front(name); await win(name).getByRole('button', { name: button, exact: true }).click(); },
    undoButton: name => win(name).getByRole('button', { name: 'Undo', exact: true }),
    redoButton: name => win(name).getByRole('button', { name: 'Redo', exact: true }),
  };
}

// What the UI shows right now, read from the open editors.
async function rendered(page) {
  const num = async (name, label) => Number(await page.getByRole('dialog', { name, exact: true }).getByRole('spinbutton', { name: label, exact: true }).inputValue());
  const on = (name, label) => page.getByRole('dialog', { name, exact: true }).getByLabel(label, { exact: true }).isChecked();
  return {
    eqOn: await on('EQ', 'EQ on'), eqBand4Gain: await num('EQ', 'Gain (dB)'),
    compOn: await on('Dynamics', 'Compressor on'), ratio: await num('Dynamics', 'Ratio (: 1)'),
    limOn: await on('Limiter', 'Limiter on'), ceiling: await num('Limiter', 'Ceiling (dBTP)'),
    spaceOn: await on('Space', 'Space on'), mix: await num('Space', 'Mix (wet) (%)'),
  };
}
// The real stored DSP state: the last settings message the audio worklet received.
const stored = async page => {
  const p = await lastChainParams(page);
  if (!p) return null; // nothing sent to the engine yet (polled callers retry)
  return { eq: p.eq, compressor: p.compressor, limiter: p.limiter, space: p.space, order: p.order };
};
const without = (state, ...modules) => Object.fromEntries(Object.entries(state).filter(([k]) => !modules.includes(k)));
const pick = (state, ...modules) => Object.fromEntries(modules.map(k => [k, state[k]]));

// Distinct non-default EQ band 4 (a bell), Dynamics (on, ratio 3.5), Limiter (-2.5) and Space (on, mix 27).
async function setup(page, layout) {
  await installChainProbe(page);
  await installFileStore(page);
  await page.addInitScript(l => { if (!sessionStorage.getItem('las175-seeded')) { localStorage.setItem('mps.studioLayout', l); sessionStorage.setItem('las175-seeded', '1'); } }, layout);
  await page.goto('/');
  const studio = ui(page);
  await page.getByLabel('Import WAV').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: TRACK });
  await expect(studio.status).toHaveText('Ready');
  for (const name of ['EQ', 'dynamics', 'limiter', 'space']) await studio.open(name); // four editors open concurrently
  await expect(page.locator('dialog.editor-dialog[open]')).toHaveCount(4);
  const eq = studio.win('EQ');
  await studio.pointer('EQ', 'Parametric');
  await studio.pointer('EQ', 'Band 4');
  await studio.front('EQ');
  await eq.getByLabel('Band 4 on', { exact: true }).focus();
  await eq.getByLabel('Band 4 on', { exact: true }).check();
  await studio.field(eq, 'Frequency (Hz)', 1200);
  await studio.eqGain(2);
  await studio.front('Dynamics');
  await studio.win('Dynamics').getByLabel('Compressor on', { exact: true }).check();
  await studio.dyn(3.5);
  await studio.lim(-2.5);
  await studio.front('Space');
  await studio.win('Space').getByLabel('Space on', { exact: true }).check();
  await studio.spc(27);
  const initial = await stored(page);
  expect(initial.compressor).toMatchObject({ enabled: true, ratio: 3.5 });
  expect(initial.limiter).toMatchObject({ enabled: true, ceiling: -2.5 });
  expect(initial.space).toMatchObject({ enabled: true, mix: 27 });
  expect(initial.eq.left[3]).toMatchObject({ enabled: true, frequency: 1200, gain: 2 });
  return studio;
}

for (const [layout, label] of LAYOUTS) {
  test.describe(`layout ${label}`, () => {
    test(`EQ-only edit: stored DSP state and rendered values — before, after, Undo, Redo (${layout})`, async ({ page }) => {
      const studio = await setup(page, layout);
      const before = await stored(page);
      const shownBefore = await rendered(page);
      expect(shownBefore).toMatchObject({ eqOn: true, eqBand4Gain: 2, compOn: true, ratio: 3.5, limOn: true, ceiling: -2.5, spaceOn: true, mix: 27 });

      await studio.eqGain(-4.5);
      const after = await stored(page);
      expect(after.eq.left[3].gain).toBe(-4.5);
      expect(after.eq.right[3].gain).toBe(-4.5); // Link mode: both channels
      // An EQ edit changes eq only.
      expect(without(after, 'eq')).toEqual(without(before, 'eq'));
      expect(await rendered(page)).toEqual({ ...shownBefore, eqBand4Gain: -4.5 });

      // One Undo, by pointer: exactly the EQ edit is reverted, nothing else moves.
      await studio.pointer('EQ', 'Undo');
      await expect.poll(() => stored(page)).toEqual(before);
      expect(await rendered(page)).toEqual(shownBefore);
      // Redo, by pointer, puts back the same state.
      await studio.pointer('Limiter', 'Redo');
      await expect.poll(() => stored(page)).toEqual(after);
      expect(await rendered(page)).toEqual({ ...shownBefore, eqBand4Gain: -4.5 });

      // Keyboard dispatch (document-level Ctrl+Z / Ctrl+Shift+Z): one step each, not duplicated.
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('Control+z');
      await expect.poll(() => stored(page)).toEqual(before);
      await page.keyboard.press('Control+Shift+z');
      await expect.poll(() => stored(page)).toEqual(after);
      await page.keyboard.press('Control+z');
      await expect.poll(() => stored(page)).toEqual(before);
      expect(await rendered(page)).toEqual(shownBefore);
    });

    test(`interleaved EQ → Dynamics → Limiter → Space within 600 ms: global chronological history, no cross-module mutation (${layout})`, async ({ page }) => {
      const studio = await setup(page, layout);
      await page.waitForTimeout(700); // the setup edits must not coalesce with the first edit below
      const s0 = await stored(page);
      // Different keys in quick succession never coalesce: each is its own step.
      const t0 = Date.now();
      await studio.eqGain(-3);
      const s1 = await stored(page);
      await studio.dyn(5);
      const s2 = await stored(page);
      await studio.lim(-4);
      const s3 = await stored(page);
      await studio.spc(40);
      const s4 = await stored(page);
      expect(Date.now() - t0, 'edits must land inside one coalescing window to prove separate keys do not merge').toBeLessThan(600 * 4);
      // Each edit changed only its own module.
      expect(without(s1, 'eq')).toEqual(without(s0, 'eq'));
      expect(without(s2, 'compressor')).toEqual(without(s1, 'compressor'));
      expect(without(s3, 'limiter')).toEqual(without(s2, 'limiter'));
      expect(without(s4, 'space')).toEqual(without(s3, 'space'));
      expect([s1.eq.left[3].gain, s2.compressor.ratio, s3.limiter.ceiling, s4.space.mix]).toEqual([-3, 5, -4, 40]);

      // Global chronological Undo (INTENDED): newest edit first, whichever editor's button is used.
      await studio.pointer('EQ', 'Undo');
      await expect.poll(() => stored(page)).toEqual(s3);
      await studio.pointer('Dynamics', 'Undo');
      await expect.poll(() => stored(page)).toEqual(s2);
      await page.evaluate(() => document.activeElement?.blur());
      await page.keyboard.press('Control+z');
      await expect.poll(() => stored(page)).toEqual(s1);
      expect(await rendered(page)).toMatchObject({ eqBand4Gain: -3, ratio: 3.5, ceiling: -2.5, mix: 27 });
      await studio.pointer('Space', 'Undo');
      await expect.poll(() => stored(page)).toEqual(s0);
      expect(await rendered(page)).toMatchObject({ eqBand4Gain: 2, ratio: 3.5, ceiling: -2.5, mix: 27 });
      // Redo walks forward oldest first.
      for (const expected of [s1, s2, s3, s4]) {
        await studio.pointer('EQ', 'Redo');
        await expect.poll(() => stored(page)).toEqual(expected);
      }
      expect(await rendered(page)).toMatchObject({ eqBand4Gain: -3, ratio: 5, ceiling: -4, mix: 40 });
      // Undo during history of a *different* module than the last EQ edit does not touch EQ:
      // from s4, undoing twice reverts Space and Limiter, EQ and Dynamics stay as edited.
      await studio.pointer('EQ', 'Undo');
      await studio.pointer('EQ', 'Undo');
      await expect.poll(() => stored(page)).toEqual(s2);
      expect(pick(await stored(page), 'eq')).toEqual(pick(s1, 'eq'));
      expect(pick(await stored(page), 'compressor')).toEqual(pick(s2, 'compressor'));
    });

    test(`same-key edits within 600 ms form one undo step; layout switching adds no history (${layout})`, async ({ page }) => {
      const studio = await setup(page, layout);
      await page.waitForTimeout(700);
      const s0 = await stored(page);
      // Two EQ gain edits of the same band, back to back: one coalesced step.
      await studio.eqGain(-1);
      await studio.eqGain(-2);
      const s1 = await stored(page);
      await studio.lim(-3);
      const s2 = await stored(page);
      const edited = await rendered(page);

      // Switch through every layout and back: no new params, no new history, values intact.
      const layoutSelect = page.getByRole('combobox', { name: 'Studio Layout' });
      const messagesBefore = await page.evaluate(() => window.__chainProbe.params.length);
      for (const id of ['a', 'b', 'c', 'd', 'classic', layout]) await layoutSelect.selectOption(id);
      expect(await page.evaluate(() => window.__chainProbe.params.length)).toBe(messagesBefore);
      expect(await stored(page)).toEqual(s2);
      expect(await rendered(page)).toEqual(edited);

      // Exactly two Undo steps separate s2 from s0 (limiter, then the coalesced EQ edit): layout switching
      // added no snapshot, and the two same-key EQ edits did not become two steps.
      await studio.pointer('Limiter', 'Undo');
      await expect.poll(() => stored(page)).toEqual(s1);
      await studio.pointer('Limiter', 'Undo');
      await expect.poll(() => stored(page)).toEqual(s0);
      expect(await rendered(page)).toMatchObject({ eqBand4Gain: 2, ceiling: -2.5, ratio: 3.5, mix: 27 });
    });
  });
}

for (const [layout, label] of [LAYOUTS[0], LAYOUTS[4]]) {
  test(`project Save → reopen restores EQ/Dynamics/Limiter/Space exactly, with empty history; Undo/Redo isolation holds afterwards (${label})`, async ({ page }) => {
    const studio = await setup(page, layout);
    await page.waitForTimeout(700);
    await studio.eqGain(-4.5); // the last edit before saving
    const saved = await stored(page);
    const shownSaved = await rendered(page);
    await page.keyboard.press('Control+s');
    await expect(studio.projectStatus).toHaveText(/^Saved to /);
    const [name, text] = await page.evaluate(() => Object.entries(window.__fs.files)[0]);
    const file = JSON.parse(text);
    expect(pick(file.chain, 'eq', 'compressor', 'limiter', 'space')).toEqual(pick(saved, 'eq', 'compressor', 'limiter', 'space'));

    // "Restart", then Open.
    await page.evaluate(([n, t]) => sessionStorage.setItem('fs', JSON.stringify({ [n]: t })), [name, text]);
    await page.reload();
    await page.evaluate(n => { window.__fs.files = JSON.parse(sessionStorage.getItem('fs')); window.__fs.nextOpen = n; }, name);
    await page.keyboard.press('Control+o');
    await expect(studio.projectStatus).toContainText('Opened');
    const relink = page.getByRole('dialog', { name: 'Missing audio' });
    // Relinking the original WAV gives the audio engine a track, so the restored settings reach it.
    await relink.getByLabel('Relink tone.wav').setInputFiles({ name: 'tone.wav', mimeType: 'audio/wav', buffer: TRACK });
    await expect(studio.status).toHaveText('Ready');
    await relink.getByRole('button', { name: 'Done' }).click();
    // The engine only receives settings when they change, so the restored chain is read back through
    // the Settings file download (the app's own chain state), value for value.
    await page.getByRole('button', { name: 'Settings…' }).focus();
    await page.keyboard.press('Enter');
    const settings = page.getByRole('dialog', { name: 'Chain settings' });
    const download = page.waitForEvent('download');
    await settings.getByRole('link', { name: 'Download settings (.json)' }).click();
    const restored = JSON.parse(readFileSync(await (await download).path(), 'utf8'));
    expect(pick(restored, 'eq', 'compressor', 'limiter', 'space', 'order')).toEqual(saved);
    await settings.getByRole('button', { name: 'Close settings' }).click();
    // Opening a project loads settings with an empty history: nothing to undo.
    for (const n of ['EQ', 'dynamics', 'limiter', 'space']) if (!(await page.locator('dialog.editor-dialog[open]').filter({ hasText: n === 'dynamics' ? 'Compressor' : n }).count())) await studio.open(n);
    await expect(page.locator('dialog.editor-dialog[open]')).toHaveCount(4);
    await studio.pointer('EQ', 'Parametric');
    await studio.front('EQ');
    await studio.win('EQ').getByRole('button', { name: /^Band 4( \(on\))?$/ }).click(); // enabled bands are labelled "(on)"
    expect(await rendered(page)).toEqual(shownSaved);
    await expect(studio.undoButton('Limiter')).toBeDisabled();
    await expect(studio.redoButton('Limiter')).toBeDisabled();
    await page.keyboard.press('Control+z');
    expect(await rendered(page)).toEqual(shownSaved); // Undo with no history changes nothing

    // After reopening, a new EQ edit and its Undo/Redo still touch eq only.
    await studio.eqGain(1.5);
    await expect.poll(() => stored(page)).not.toBeNull();
    const edited = await stored(page);
    expect(edited.eq.left[3].gain).toBe(1.5);
    expect(without(edited, 'eq')).toEqual(without(saved, 'eq'));
    await studio.pointer('EQ', 'Undo');
    await expect.poll(() => stored(page)).toEqual(saved);
    await studio.pointer('EQ', 'Redo');
    await expect.poll(() => stored(page)).toEqual(edited);
  });
}
