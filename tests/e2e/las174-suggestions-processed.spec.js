import { test, expect } from '@playwright/test';
import { encodeWav } from '../../src/dsp/wav-encode.js';
import { installChainProbe, lastChainParams } from './helpers/chain-probe.js';

// LAS-174 through the real UI and the real render worker: Suggestions measure the file as rendered
// through the committed chain, so a manual low-end EQ boost is seen (as an observation, never as a
// fault) and a zero-suggestion result is a success state. Whether a suggestion sounds better is a
// listening judgement these checks cannot make.
const RATE = 44100;
const CENTRES = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
const wavOf = gains => {
  const tones = Float32Array.from({ length: RATE * 6 }, (_, i) => CENTRES
    .reduce((sum, f) => sum + 0.05 * (gains[f] ?? 1) * Math.sin(2 * Math.PI * f * i / RATE + f), 0));
  return Buffer.from(encodeWav([tones, tones], RATE, { bitDepth: 16 }).bytes);
};
const FLAT = wavOf({});
const MID_EXCESS = wavOf({ 250: 2 });

async function boostBass(page) {
  await page.getByRole('button', { name: 'Edit EQ', exact: true }).click();
  const eq = page.getByRole('dialog', { name: 'EQ', exact: true });
  await eq.getByRole('button', { name: 'Graphic', exact: true }).click();
  await eq.getByRole('button', { name: 'Set up 10 graphic bands' }).click();
  for (const [name, presses] of [['31.5 Hz gain', 14], ['63 Hz gain', 17]]) {
    const fader = eq.getByRole('slider', { name, exact: true });
    await fader.focus();
    for (let i = 0; i < presses; i++) await fader.press('ArrowUp');
  }
  await expect(eq.getByRole('slider', { name: '31.5 Hz gain', exact: true })).toHaveAttribute('aria-valuenow', '7');
  await expect(eq.getByRole('slider', { name: '63 Hz gain', exact: true })).toHaveAttribute('aria-valuenow', '8.5');
  await expect.poll(async () => (await lastChainParams(page))?.eq.left[1].gain).toBe(8.5);
  await eq.getByRole('button', { name: 'Close EQ' }).click();
}

async function openPanel(page, buffer) {
  await installChainProbe(page);
  await page.goto('/');
  await page.getByLabel('Import WAV').setInputFiles({ name: 'tones.wav', mimeType: 'audio/wav', buffer });
  await expect(page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status')).toHaveText('Ready');
}

const suggestionsPanel = async page => {
  const master = page.getByRole('region', { name: 'Master details', exact: true });
  await master.getByRole('button', { name: 'Open suggestions' }).click();
  return page.getByRole('region', { name: 'Suggestions', exact: true });
};

test('LAS-174: +7 / +8.5 dB bass boosts are measured on the processed audio and shown as an observation; no proposal, nothing changes', async ({ page }) => {
  test.setTimeout(120_000);
  await openPanel(page, FLAT);
  await boostBass(page);
  const before = await lastChainParams(page);
  const panel = await suggestionsPanel(page);
  await expect(panel).toContainText('No AI model listened to your audio');
  await panel.getByRole('button', { name: 'Measure and suggest' }).click();
  const observation = panel.getByRole('article', { name: /^Low end changed by your settings/ });
  await expect(observation).toContainText('observation', { timeout: 30_000 });
  await expect(observation).toContainText(/31\.5 Hz octave: .* in the original, .* after your settings \(\+/);
  await expect(observation).toContainText(/63 Hz octave: .* after your settings \(\+/);
  await expect(observation).toContainText('not a fault');
  await expect(observation).toContainText('Measured on the processed audio at 44,100 Hz · settings revision');
  await expect(observation.getByRole('button')).toHaveCount(0);
  const none = panel.getByRole('article', { name: /^Tonal balance/ });
  await expect(none).toContainText('no change suggested');
  await expect(none).toContainText('No evidence-based EQ change suggested for the measured signal.');
  await expect(none).not.toContainText('unavailable');
  await expect(panel.getByRole('button', { name: 'Apply suggestion' })).toHaveCount(0);
  expect(await lastChainParams(page)).toEqual(before);
});

test('LAS-174: no rule match on an untouched chain is a success state with what was assessed', async ({ page }) => {
  test.setTimeout(90_000);
  await openPanel(page, FLAT);
  const panel = await suggestionsPanel(page);
  await panel.getByRole('button', { name: 'Measure and suggest' }).click();
  const none = panel.getByRole('article', { name: /^Tonal balance/ });
  await expect(none).toContainText('No evidence-based EQ change suggested for the measured signal.', { timeout: 30_000 });
  await expect(none).toContainText('250 Hz, 500 Hz and 4 kHz');
  await expect(none).toContainText('Limits');
  await expect(panel.getByRole('article')).toHaveCount(1);
  await expect(panel.getByRole('button', { name: 'Measure again' })).toBeVisible();
});

test('LAS-174: with a bass boost in place a justified proposal keeps it: A/B, Apply as one undo step, Undo', async ({ page }) => {
  test.setTimeout(120_000);
  await openPanel(page, MID_EXCESS);
  await boostBass(page);
  const before = await lastChainParams(page);
  const panel = await suggestionsPanel(page);
  await panel.getByRole('button', { name: 'Measure and suggest' }).click();
  const card = panel.getByRole('article', { name: /^Low-mid build-up \(250 Hz\)/ });
  await expect(card).toContainText('EQ · measured', { timeout: 30_000 });
  await expect(card).toContainText('(processed)');
  await expect(panel.getByRole('article', { name: /^Low end changed by your settings/ })).toContainText('observation');
  const cuts = params => params.eq.left.filter(b => b.enabled && b.frequency === 250 && b.gain < 0 && b.q === 1).length;
  await card.getByRole('button', { name: 'Preview (B)' }).click();
  await expect.poll(async () => cuts(await lastChainParams(page))).toBe(1);
  const previewed = await lastChainParams(page);
  expect(previewed.eq.left[0].gain).toBe(7); // the user's boosts are kept in B
  expect(previewed.eq.left[1].gain).toBe(8.5);
  await card.getByRole('button', { name: 'Current (A)' }).click();
  await expect.poll(() => lastChainParams(page)).toEqual(before);
  await card.getByRole('button', { name: 'Apply suggestion' }).click();
  await expect(card).toContainText('applied');
  await expect.poll(async () => cuts(await lastChainParams(page))).toBe(1);
  await panel.getByRole('button', { name: 'Undo', exact: true }).click(); // one step restores everything
  await expect.poll(() => lastChainParams(page)).toEqual(before);
  await expect(card).toContainText('out of date'); // the applied suggestion no longer matches the chain
});

test('LAS-174: a settings change after measuring marks the result out of date', async ({ page }) => {
  test.setTimeout(120_000);
  await openPanel(page, FLAT);
  const panel = await suggestionsPanel(page);
  await panel.getByRole('button', { name: 'Measure and suggest' }).click();
  await expect(panel.getByRole('article', { name: /^Tonal balance/ })).toBeVisible({ timeout: 30_000 });
  await boostBass(page);
  await expect(panel.getByText('The measurements below were made for earlier settings or another project.')).toBeVisible();
  await panel.getByRole('button', { name: 'Measure again' }).click();
  await expect(panel.getByRole('article', { name: /^Low end changed by your settings/ })).toBeVisible({ timeout: 30_000 });
});

test('LAS-174: the Suggestions result stays reachable at 761x450', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 761, height: 450 });
  await openPanel(page, FLAT);
  await expect(page.getByRole('button', { name: 'Import WAV', exact: true })).toBeInViewport({ ratio: 1 });
  const panel = await suggestionsPanel(page);
  await panel.getByRole('button', { name: 'Measure and suggest' }).click();
  const none = panel.getByRole('article', { name: /^Tonal balance/ });
  await none.scrollIntoViewIfNeeded();
  await expect(none).toBeVisible({ timeout: 30_000 });
  await expect(none).toContainText('No evidence-based EQ change suggested for the measured signal.');
  const box = await none.boundingBox();
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(761);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
