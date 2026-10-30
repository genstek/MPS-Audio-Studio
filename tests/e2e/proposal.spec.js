import { test, expect } from '@playwright/test';
import { analyze } from '../../src/dsp/analysis.js';
import { renderChain } from '../../src/dsp/chain.js';
import { decodeWav } from '../../src/dsp/wav-decode.js';
import { encodeWav } from '../../src/dsp/wav-encode.js';
import { renderSegment } from '../../src/dsp/segment-render.js';
import { atStrength, proposeChain } from '../../src/proposal.js';
import { FIXTURES } from '../fixtures/dsp-fixtures.js';
import { concat } from '../fixtures/signals.js';
import { PRESETS } from '../harness/presets.js';
import { installChainProbe, lastChainParams, paramsMessageCount } from './helpers/chain-probe.js';

// LAS-32 workflow. Proves that the proposal shown in the browser is the one computed from the same
// samples in Node, that previewing and rejecting leave the settings alone, and that applying is one
// undo step. Whether a proposal sounds better is a listening judgement these checks cannot make.
const RATE = 44100;
const SECTION = { start: 2, end: 10 };
const loop = FIXTURES.programme(RATE).map(channel => Float32Array.from(concat(channel, channel, channel))); // 12 s
const wavOf = channels => Buffer.from(encodeWav(channels, RATE, { bitDepth: 16 }).bytes);
const MIX = wavOf(loop.map(channel => channel.map(v => v * 0.5)));
const REFERENCE = wavOf(renderChain(PRESETS.master, loop, RATE).channels);
const decoded = wav => { const audio = decodeWav(wav.buffer.slice(wav.byteOffset, wav.byteOffset + wav.byteLength)); return audio.samples; };

// The same proposal, computed here from the same file bytes.
function expectedProposal() {
  const mix = decoded(MIX);
  const renderSection = params => {
    const rendered = renderSegment(params, mix, RATE, SECTION);
    return { report: analyze(rendered.channels, RATE), meters: rendered.meters };
  };
  return proposeChain({ reference: analyze(decoded(REFERENCE), RATE, SECTION), original: analyze(mix, RATE, SECTION), sampleRate: RATE, renderSection });
}
const settingsOf = params => ({
  eq: params.eq.left.filter(band => band.enabled).map(({ frequency, gain }) => [frequency, gain]),
  compressor: params.compressor.enabled ? [params.compressor.threshold, params.compressor.ratio] : null,
  inputGain: params.limiter.inputGain,
});

test('LAS-32: propose, preview at a strength, check, reject, apply and undo', async ({ page }, testInfo) => {
  test.setTimeout(180_000);
  await installChainProbe(page);
  await page.goto('/');
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  await page.getByLabel('Import WAV').setInputFiles({ name: 'my-mix.wav', mimeType: 'audio/wav', buffer: MIX });
  await expect(transport.getByRole('status')).toHaveText('Ready');
  // The user's own settings before comparing: +2 dB limiter input gain.
  await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: 'Edit limiter' }).click();
  const limiter = page.getByRole('dialog', { name: 'Limiter' });
  await limiter.getByRole('spinbutton', { name: 'Input gain (dB)' }).fill('2');
  await limiter.getByRole('spinbutton', { name: 'Input gain (dB)' }).press('Enter');
  await limiter.getByRole('button', { name: 'Close Limiter' }).click();
  await expect.poll(async () => (await lastChainParams(page))?.limiter.inputGain).toBe(2);
  const before = await lastChainParams(page);

  await page.getByRole('button', { name: 'Compare with a reference' }).click();
  const dialog = page.getByRole('dialog', { name: 'Compare with a reference' });
  await dialog.getByLabel('Choose reference WAV').setInputFiles({ name: 'reference.wav', mimeType: 'audio/wav', buffer: REFERENCE });
  for (const [label, value] of [['Reference start (s)', '2'], ['Reference end (s)', '10'], ['Mix start (s)', '2'], ['Mix end (s)', '10']]) await dialog.getByLabel(label).fill(value);
  await dialog.getByRole('button', { name: 'Measure and compare' }).click();
  await expect(dialog.getByRole('status')).toHaveText('Compared with reference.wav.', { timeout: 30_000 });
  const messagesBefore = await paramsMessageCount(page);

  const panel = dialog.getByRole('region', { name: 'Proposal from this comparison' });
  await panel.getByRole('button', { name: 'Propose settings' }).click();
  await expect(panel.getByRole('heading', { name: /^EQ/ })).toBeVisible({ timeout: 90_000 });
  const expected = expectedProposal();
  // Every module is shown with its status, reasons, values, range and uncertainty, as computed in Node.
  for (const module of expected.modules) {
    const card = panel.getByRole('article', { name: new RegExp(`^${module.module} `) });
    await expect(card).toContainText(module.status);
    for (const text of [...module.reasons, ...module.values, module.range, ...module.uncertainty]) await expect(card).toContainText(text);
  }
  await expect(panel).toContainText('It does not recover how the reference was mastered.');
  await expect(panel.getByRole('table')).toContainText('Numerical check at 100 %');
  expect(await paramsMessageCount(page)).toBe(messagesBefore); // proposing changes nothing
  for (const [width, height] of [[360, 780], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${width}px: no horizontal page scroll`).toBe(true);
    await panel.getByRole('article', { name: /^EQ / }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath(`proposal-${width}x${height}.png`) });
  }
  await page.setViewportSize({ width: 1280, height: 720 });

  // Preview at 50 %: the chain plays the scaled proposal; the settings themselves are unchanged.
  await panel.getByLabel('Proposal strength').fill('50');
  await expect(panel.locator('output')).toHaveText('50 %');
  await panel.getByRole('button', { name: 'Preview proposal' }).click();
  await expect(panel.getByRole('button', { name: 'Preview proposal' })).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => settingsOf(await lastChainParams(page))).toEqual(settingsOf(atStrength(expected.params, 0.5)));
  await panel.getByRole('button', { name: 'Check at this strength' }).click();
  await expect(panel.getByRole('table')).toContainText('Numerical check at 50 %', { timeout: 30_000 });

  // Reject: the previous settings play again.
  await panel.getByRole('button', { name: 'Reject proposal' }).click();
  await expect(panel).toContainText('Proposal rejected; your settings are unchanged.');
  await expect.poll(() => lastChainParams(page)).toEqual(before);

  // Apply at 100 %, then Undo in the mixer restores the complete previous chain.
  await panel.getByRole('button', { name: 'Propose settings' }).click();
  await expect(panel.getByRole('button', { name: 'Apply proposal' })).toBeVisible({ timeout: 90_000 });
  await panel.getByRole('button', { name: 'Apply proposal' }).click();
  await expect(panel).toContainText('Applied at 100 %. Undo in the mixer restores your previous settings');
  await expect.poll(async () => settingsOf(await lastChainParams(page))).toEqual(settingsOf(expected.params));
  await dialog.getByRole('button', { name: 'Close comparison' }).click();
  await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => lastChainParams(page)).toEqual(before);
});
