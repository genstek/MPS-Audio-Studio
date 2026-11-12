import { test, expect } from '@playwright/test';
import { analyze } from '../../src/dsp/analysis.js';
import { buildSuggestions } from '../../src/ai/suggestions.js';
import { defaultChain } from '../../src/dsp/chain-params.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { encodeWav } from '../../src/dsp/wav-encode.js';
import { installChainProbe, lastChainParams, pathGains } from './helpers/chain-probe.js';

// LAS-120 workflow through the real Suggestions buttons during playback. It proves which settings
// reach the running chain and how the processed path gain moves for a level-matched A/B, that
// Reject and Undo restore the previous settings, that Apply is one undo step, and that an applied
// cut is not suggested again. Whether a suggestion sounds better is a listening judgement these
// checks cannot make.
const RATE = 44100;
const SECONDS = 30;
const CENTRES = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
// Equal tones at the octave centres with 250 Hz 6 dB higher: exactly one suggestion, a 250 Hz cut.
const tones = Float32Array.from({ length: RATE * SECONDS }, (_, i) => CENTRES
  .reduce((sum, f) => sum + (f === 250 ? 0.1 : 0.05) * Math.sin(2 * Math.PI * f * i / RATE + f), 0));
const WAV = Buffer.from(encodeWav([tones, tones], RATE, { bitDepth: 16 }).bytes);
// The same suggestion, computed here from the same file bytes.
const expectedSuggestions = () => {
  const audio = decodeWav(WAV.buffer.slice(WAV.byteOffset, WAV.byteOffset + WAV.byteLength));
  return buildSuggestions(analyze(audio.samples, RATE), { chain: defaultChain(), sampleRate: RATE });
};
const cutsAt250 = params => params.eq.left.filter(b => b.enabled && b.frequency === 250 && b.gain < 0).map(b => b.gain);
const dbOf = (gain, reference) => 20 * Math.log10(gain / reference);

test('LAS-120: level-matched Preview (B) / Current (A), Reject, Apply, Undo, Redo and Measure again during playback', async ({ page }) => {
  test.setTimeout(150_000);
  await installChainProbe(page);
  await page.goto('/');
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const master = page.getByRole('region', { name: 'Master details', exact: true });
  await page.getByLabel('Import WAV').setInputFiles({ name: 'tones.wav', mimeType: 'audio/wav', buffer: WAV });
  await expect(transport.getByRole('status')).toHaveText('Ready');
  // The user's own settings before suggesting: +1 dB limiter input gain.
  await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: 'Edit limiter' }).click();
  const limiter = page.getByRole('dialog', { name: 'Limiter' });
  await limiter.getByRole('spinbutton', { name: 'Input gain (dB)' }).fill('1');
  await limiter.getByRole('spinbutton', { name: 'Input gain (dB)' }).press('Enter');
  await limiter.getByRole('button', { name: 'Close Limiter' }).click();
  await expect.poll(async () => (await lastChainParams(page))?.limiter.inputGain).toBe(1);
  // Match loudness (on by default) measures that change first; the A/B trim adds to the gain it leaves.
  await expect(master.locator('.loudness-match p')).toHaveText(/^Processed is 1\.0 dB louder/, { timeout: 30_000 });
  await page.getByRole('button', { name: 'Play', exact: true }).click();
  await expect(transport.getByRole('status')).toHaveText('Playing');
  let base;
  await expect.poll(async () => {
    const now = (await pathGains(page)).processed;
    const steady = now === base;
    base = now;
    return steady;
  }, { intervals: [250] }).toBe(true);
  expect(base).toBeGreaterThan(0);
  const before = await lastChainParams(page);
  const processedDb = async reference => dbOf((await pathGains(page)).processed, reference);

  await master.getByRole('button', { name: 'Open suggestions' }).click();
  const panel = page.getByRole('region', { name: 'Suggestions', exact: true });
  await panel.getByRole('button', { name: 'Measure and suggest' }).click();
  const card = panel.getByRole('article', { name: /^Low-mid build-up \(250 Hz\)/ });
  await expect(card).toContainText('EQ · measured', { timeout: 30_000 });
  await expect(panel.getByRole('article')).toHaveCount(1);
  const [expected] = expectedSuggestions();
  for (const text of expected.evidence) await expect(card).toContainText(text);
  await expect(card).toContainText('Bell 250 Hz, −3.0 dB, Q 1');
  expect(await lastChainParams(page)).toEqual(before); // suggesting changes nothing

  // B plays the cut. A cut makes B quieter, and B is never boosted: the processed gain is unchanged.
  await card.getByRole('button', { name: 'Preview (B)' }).click();
  await expect(card.getByRole('button', { name: 'Preview (B)' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => cutsAt250(await lastChainParams(page))).toEqual([-3]);
  const level = card.getByText(/^Level match: /);
  await expect(level).toHaveText(/^Level match: B is \d+\.\d dB quieter, so A plays \d+\.\d dB lower while comparing\.$/, { timeout: 30_000 });
  const quieter = Number((await level.textContent()).match(/B is (\d+\.\d) dB quieter/)[1]);
  expect(quieter).toBeGreaterThan(0);
  await expect.poll(async () => Math.abs(await processedDb(base))).toBeLessThan(0.01);
  await expect(transport.getByRole('status')).toHaveText('Playing');

  // A plays the committed settings, turned down by the measured difference (shown to 0.1 dB).
  await card.getByRole('button', { name: 'Current (A)' }).click();
  await expect(card.getByRole('button', { name: 'Current (A)' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(() => lastChainParams(page)).toEqual(before);
  await expect.poll(async () => Math.abs(await processedDb(base) + quieter)).toBeLessThanOrEqual(0.06);
  await expect(transport.getByRole('status')).toHaveText('Playing');

  // Match loudness and the A/B trim are separate: switching Match loudness off and on while
  // comparing keeps the trim on top of whatever Match loudness sets.
  const matchToggle = master.getByLabel('Match loudness', { exact: true });
  await matchToggle.uncheck();
  await expect.poll(async () => Math.abs(await processedDb(1) + quieter)).toBeLessThanOrEqual(0.06);
  await matchToggle.check();
  await expect.poll(async () => Math.abs(await processedDb(base) + quieter), { timeout: 30_000 }).toBeLessThanOrEqual(0.06);

  // Reject: settings unchanged and the trim is gone.
  await card.getByRole('button', { name: 'Reject' }).click();
  await expect(panel.getByRole('status')).toHaveText('Rejected “Low-mid build-up (250 Hz)”. Your settings are unchanged.');
  await expect(card).toContainText('rejected');
  await expect.poll(() => lastChainParams(page)).toEqual(before);
  await expect.poll(async () => Math.abs(await processedDb(base))).toBeLessThan(0.01);

  // Measure again, preview, then Apply while the level is still being measured: one undo step.
  await panel.getByRole('button', { name: 'Measure again' }).click();
  await expect(card).toContainText('EQ · measured', { timeout: 30_000 });
  await card.getByRole('button', { name: 'Preview (B)' }).click();
  await expect.poll(async () => cutsAt250(await lastChainParams(page))).toEqual([-3]);
  await card.getByRole('button', { name: 'Apply suggestion' }).click();
  await expect(panel.getByRole('status')).toHaveText('Applied “Low-mid build-up (250 Hz)” as one undo step. Undo restores your previous settings.');
  await expect(card).toContainText('applied');
  await expect.poll(async () => cutsAt250(await lastChainParams(page))).toEqual([-3]);
  const appliedParams = await lastChainParams(page);

  // Undo restores the previous settings and marks the applied suggestion out of date; Redo re-applies it.
  await panel.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => lastChainParams(page)).toEqual(before);
  await expect(card).toContainText('out of date');
  await expect(card).toContainText('Choose Measure again.');
  await panel.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(() => lastChainParams(page)).toEqual(appliedParams);
  await expect(card).toContainText('applied');

  // The measurement is of the original file, so the same excess is measured again: no second cut.
  await panel.getByRole('button', { name: 'Measure again' }).click();
  await expect(card).toContainText('Your EQ already cuts near 250 Hz (−3.0 dB at 250 Hz).', { timeout: 30_000 });
  await expect(card).toContainText('unavailable');
  await expect(card.getByRole('button', { name: 'Apply suggestion' })).toHaveCount(0);

  // After Undo, Measure again offers the suggestion again.
  await panel.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => lastChainParams(page)).toEqual(before);
  await panel.getByRole('button', { name: 'Measure again' }).click();
  await expect(card).toContainText('EQ · measured', { timeout: 30_000 });

  // Closing during a comparison ends it: the settings and the processed gain are back.
  await card.getByRole('button', { name: 'Preview (B)' }).click();
  await card.getByRole('button', { name: 'Current (A)' }).click();
  await expect.poll(async () => Math.abs(await processedDb(base) + quieter), { timeout: 30_000 }).toBeLessThanOrEqual(0.06);
  await master.getByRole('button', { name: 'Close suggestions' }).click();
  await expect.poll(() => lastChainParams(page)).toEqual(before);
  await expect.poll(async () => Math.abs(await processedDb(base))).toBeLessThan(0.01);
});
