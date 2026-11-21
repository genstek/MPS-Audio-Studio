import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';

// LAS-128. Signal checks (not a listening review): the live per-stem width graph is the same
// equation as the offline render's applyStemWidth(); with the stage off or the stem mono, the
// live strip is unchanged.
const RATE = 48000;

async function renderLive(page, { stems }) {
  return page.evaluate(async ({ stems, rate }) => {
    const { createStemSession } = await import('/src/stem-session.js');
    const { applyStemWidth } = await import('/src/dsp/stem-width.js');
    const seconds = 1;
    const context = new OfflineAudioContext({ numberOfChannels: 2, length: rate * seconds, sampleRate: rate });
    const session = createStemSession(context, { inputs: [context.destination] });
    const originals = [];
    const refused = [];
    for (const s of stems) {
      const data = s.channels.map(c => Float32Array.from({ length: rate }, (_, n) => c.reduce((sum, [f, a, p]) => sum + a * Math.sin(2 * Math.PI * f * n / rate + p), 0)));
      const buffer = new AudioBuffer({ numberOfChannels: data.length, length: rate, sampleRate: rate });
      data.forEach((d, c) => buffer.copyToChannel(d, c));
      const id = session.add(buffer, { name: s.name, sampleRate: rate, channels: data.length, params: null });
      if (s.width) session.setWidth(id, s.width);
      for (const bad of s.refuse ?? []) { try { session.setWidth(id, bad); refused.push('accepted'); } catch (e) { refused.push(e.message); } }
      originals.push({ data, settings: session.stems()[session.stems().length - 1].width, applies: session.stems()[session.stems().length - 1].widthApplies });
    }
    session.play();
    const live = await context.startRendering();
    const delay = Math.round(0.05 * rate);
    const offline = originals.map(o => applyStemWidth(o.data, o.settings, rate));
    const expected = [new Float32Array(rate), new Float32Array(rate)];
    for (const [i, channels] of offline.entries()) {
      // A mono stem is panned centre by the live strip (equal power); the offline reference applies the same law here.
      if (channels.length === 1) for (let c = 0; c < 2; c++) for (let n = 0; n < rate; n++) expected[c][n] += channels[0][n] * Math.SQRT1_2;
      else for (let c = 0; c < 2; c++) for (let n = 0; n < rate; n++) expected[c][n] += channels[c][n];
      void i;
    }
    let largest = 0, peak = 0;
    for (let c = 0; c < 2; c++) {
      const l = live.getChannelData(c);
      for (let n = rate * 0.3; n < rate - delay - 1; n++) { largest = Math.max(largest, Math.abs(l[n + delay] - expected[c][n])); peak = Math.max(peak, Math.abs(expected[c][n])); }
    }
    return { largest, peak, applies: originals.map(o => o.applies), refused };
  }, { stems, rate: RATE });
}

// Wide synth-like stereo stem with side content both above and below 150 Hz.
const padChannels = [[[60, 0.15, 0], [3000, 0.2, 0], [5200, 0.1, 0.4]], [[60, 0.15, Math.PI], [3000, 0.2, 1.1], [5200, 0.1, 2]]];

test('LAS-128: live per-stem width equals the offline equation (width 1.8, crossover 150 Hz)', async ({ page }) => {
  await page.goto('/');
  const result = await renderLive(page, { stems: [{ name: 'pad', channels: padChannels, width: { enabled: true, width: 1.8, crossoverHz: 150 } }] });
  test.info().annotations.push({ type: 'parity', description: `largest live/offline difference ${result.largest.toExponential(2)} (peak ${result.peak.toFixed(3)})` });
  expect(result.peak).toBeGreaterThan(0.1);
  expect(result.largest).toBeLessThan(1e-3);
});

test('LAS-128: narrowing to mono and a different crossover match the offline equation too', async ({ page }) => {
  await page.goto('/');
  for (const width of [{ enabled: true, width: 0, crossoverHz: 150 }, { enabled: true, width: 1.4, crossoverHz: 300 }]) {
    const result = await renderLive(page, { stems: [{ name: 'pad', channels: padChannels, width }] });
    expect(result.largest, JSON.stringify(width)).toBeLessThan(1e-3);
  }
});

test('LAS-128: stage off (default, or switched off with width kept) leaves the strip unchanged; mono stems get no branch; bad values are refused', async ({ page }) => {
  await page.goto('/');
  const off = await renderLive(page, { stems: [{ name: 'pad', channels: padChannels, width: { enabled: false, width: 2, crossoverHz: 150 } }] });
  expect(off.largest).toBeLessThan(1e-5); // expected = the untouched channels
  const def = await renderLive(page, { stems: [{ name: 'pad', channels: padChannels }] });
  expect(def.largest).toBeLessThan(1e-5);
  const mono = await renderLive(page, { stems: [{ name: 'bass', channels: [[[80, 0.3, 0]]], width: { enabled: true, width: 2, crossoverHz: 150 } }] });
  expect(mono.applies).toEqual([false]);
  expect(mono.largest).toBeLessThan(1e-5);
  const refused = await renderLive(page, { stems: [{ name: 'pad', channels: padChannels, refuse: [{ width: 3 }, { crossoverHz: 10 }] }] });
  expect(refused.refused).toEqual(['Width must be between 0 and 2.', 'The bass crossover must be between 60 and 400 Hz.']);
});

test('LAS-128: Stems dialog — width is off by default, switches on per stem, resets, and is unavailable for mono stems', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: 'Stems…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Stem session' });
  await dialog.getByLabel('Add stem WAVs').setInputFiles([
    { name: 'pad.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 1, channels: 2, sampleRate: RATE, frequency: 440, dbfs: -12 }) },
    { name: 'bass.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 1, channels: 1, sampleRate: RATE, frequency: 55, dbfs: -12 }) },
  ]);
  await expect(dialog.getByRole('status')).toHaveText('2 stems · 0:01.0');
  const pad = dialog.getByRole('listitem', { name: 'Stem pad.wav' });
  const bass = dialog.getByRole('listitem', { name: 'Stem bass.wav' });
  await expect(pad.getByRole('button', { name: 'Width on for pad.wav' })).toHaveAttribute('aria-pressed', 'false');
  await expect(pad.getByLabel('Width (%)')).toBeDisabled();
  await pad.getByRole('button', { name: 'Width on for pad.wav' }).click();
  await expect(pad.getByRole('button', { name: 'Width on for pad.wav' })).toHaveAttribute('aria-pressed', 'true');
  await pad.getByLabel('Width (%)').fill('150');
  await expect(pad.getByLabel('Width (%)')).toHaveAttribute('aria-valuetext', '150 %');
  await pad.getByLabel('Mono below (Hz)').fill('200');
  await expect(bass.getByRole('button', { name: 'Width on for bass.wav' })).toBeDisabled();
  await expect(bass).toContainText('Mono stem: no side signal');
  await pad.getByRole('button', { name: 'Reset width of pad.wav' }).click();
  await expect(pad.getByRole('button', { name: 'Width on for pad.wav' })).toHaveAttribute('aria-pressed', 'false');
  await expect(pad.getByLabel('Width (%)')).toHaveAttribute('aria-valuetext', '100 % (unchanged)');
  await expect(pad.getByLabel('Mono below (Hz)')).toHaveValue('150');
});
