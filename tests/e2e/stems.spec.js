import { test, expect } from '@playwright/test';

// LAS-34 timing and summing, measured on real Web Audio rendering: the stem session runs in an
// OfflineAudioContext (same nodes as live playback) and the test pauses, seeks and resumes at
// scheduled render times with suspend(). The rendered samples are then inspected directly.
test('LAS-34: stems stay sample-aligned through repeated pause, resume and seek; summing and pan law as documented', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createStemSession } = await import('/src/stem-session.js');
    const rate = 44100;
    const seconds = 6;
    const context = new OfflineAudioContext({ numberOfChannels: 2, length: rate * seconds, sampleRate: rate });
    const output = { inputs: [context.destination] };
    const session = createStemSession(context, output);
    // Two mono stems with clicks at the same session times (every 0.25 s); A panned left, B right.
    const clicks = (amplitude, length) => {
      const buffer = new AudioBuffer({ numberOfChannels: 1, length, sampleRate: rate });
      const data = buffer.getChannelData(0);
      for (let n = 0; n < length; n += rate / 4) data[n] = amplitude;
      return buffer;
    };
    const a = session.add(clicks(0.5, rate * 4), { name: 'A', sampleRate: rate, channels: 1 });
    const b = session.add(clicks(0.5, rate * 4), { name: 'B', sampleRate: rate, channels: 1 });
    session.setPan(a, -1);
    session.setPan(b, 1);
    const at = (time, action) => context.suspend(time).then(() => { action(); context.resume(); });
    session.play();
    at(0.8, () => session.pause());
    at(1.0, () => session.play());
    at(1.6, () => session.seek(2.5));
    at(2.2, () => session.pause());
    at(2.4, () => session.seek(0.5));
    at(2.6, () => session.play());
    const rendered = await context.startRendering();
    const peaks = channel => { const data = rendered.getChannelData(channel); const at = []; for (let n = 0; n < data.length; n++) if (Math.abs(data[n]) > 0.05) at.push(n); return at; };
    const largest = data => data.reduce((max, v) => Math.max(max, Math.abs(v)), 0);
    return { left: peaks(0), right: peaks(1), leftValue: largest(rendered.getChannelData(0)), stems: session.stems() };
  });
  // Every click of A (left) has its partner from B (right) at exactly the same sample.
  expect(result.left.length).toBeGreaterThan(15);
  expect(result.right).toEqual(result.left);
  // Inside each run the clicks are exactly 0.25 s apart (no drift); the only other gaps are the
  // three restarts (resume after pause, seek while playing, play after a seek).
  const gaps = result.left.slice(1).map((n, i) => n - result.left[i]);
  const restarts = gaps.filter(gap => gap !== 11025);
  expect(restarts.length).toBeGreaterThanOrEqual(1);
  expect(restarts.length).toBeLessThanOrEqual(3);
  // A hard-panned mono click keeps its full amplitude on its side (equal-power law at ±1).
  expect(result.leftValue).toBeCloseTo(0.5, 3);
});

test('LAS-34: gain, pan, mute, solo and offsets change only the intended stem; the sum is exact', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createStemSession } = await import('/src/stem-session.js');
    const rate = 44100;
    const render = async configure => {
      const context = new OfflineAudioContext({ numberOfChannels: 2, length: rate, sampleRate: rate });
      const session = createStemSession(context, { inputs: [context.destination] });
      // One click per stem at a different time: A mono at 0.1 s, B stereo (L 0.2, R 0.1) at 0.2 s,
      // C mono at 0.3 s (shorter than the others).
      const make = (channels, at, values, seconds = 0.5) => {
        const buffer = new AudioBuffer({ numberOfChannels: channels, length: Math.round(rate * seconds), sampleRate: rate });
        values.forEach((value, c) => { buffer.getChannelData(c)[Math.round(at * rate)] = value; });
        return buffer;
      };
      const ids = {
        A: session.add(make(1, 0.1, [0.5]), { name: 'A', sampleRate: rate, channels: 1 }),
        B: session.add(make(2, 0.2, [0.2, 0.1]), { name: 'B', sampleRate: rate, channels: 2 }),
        C: session.add(make(1, 0.3, [0.4], 0.35), { name: 'C', sampleRate: rate, channels: 1 }),
      };
      configure(session, ids);
      const duration = session.duration();
      session.play();
      const out = await context.startRendering();
      // Values at the three click times (plus the start lead) in both channels.
      const lead = 0.05;
      const pick = time => [0, 1].map(c => Number(out.getChannelData(c)[Math.round((lead + time) * rate)].toFixed(4)));
      return { A: pick(0.1), B: pick(0.2), C: pick(0.3), Cdelayed: pick(0.4), duration };
    };
    return {
      plain: await render(() => {}),
      edited: await render((s, id) => { s.setGain(id.A, -6); s.setPan(id.A, -1); s.setMute(id.B, true); }),
      solo: await render((s, id) => { s.setSolo(id.C, true); }),
      soloMuted: await render((s, id) => { s.setSolo(id.C, true); s.setMute(id.C, true); }),
      offset: await render((s, id) => { s.setOffset(id.C, 0.1); }),
    };
  });
  const r = Math.SQRT1_2; // equal-power pan law: a centred mono stem plays −3 dB in each channel
  expect(result.plain.A).toEqual([Number((0.5 * r).toFixed(4)), Number((0.5 * r).toFixed(4))]);
  expect(result.plain.B).toEqual([0.2, 0.1]); // a centred stereo stem is unchanged
  expect(result.plain.C).toEqual([Number((0.4 * r).toFixed(4)), Number((0.4 * r).toFixed(4))]);
  expect(result.plain.duration).toBeCloseTo(0.5, 5); // the session lasts as long as the longest stem
  // −6 dB and hard left on A only; B muted; C untouched.
  expect(result.edited.A[0]).toBeCloseTo(0.5 * 10 ** (-6 / 20), 3);
  expect(result.edited.A[1]).toBe(0);
  expect(result.edited.B).toEqual([0, 0]);
  expect(result.edited.C).toEqual(result.plain.C);
  // Solo C: only C sounds; muting a soloed stem silences it too.
  expect(result.solo.A).toEqual([0, 0]);
  expect(result.solo.B).toEqual([0, 0]);
  expect(result.solo.C).toEqual(result.plain.C);
  expect(result.soloMuted.C).toEqual([0, 0]);
  // A 0.1 s offset moves C's click by exactly 0.1 s and leaves the others in place.
  expect(result.offset.C).toEqual([0, 0]);
  expect(result.offset.Cdelayed).toEqual(result.plain.C);
  expect(result.offset.A).toEqual(result.plain.A);
});

// The dialog drives the real engine: stems load with their policy notes, play together through the
// master chain, and hand playback back to the single track without leaving sources behind.
test('LAS-34: the stem session loads, explains, plays, seeks and mixes; single-track playback is unaffected', async ({ page }, testInfo) => {
  const { makeWav } = await import('../fixtures/wav.js');
  const { installAudioProbe, audioSources } = await import('./helpers/audio-probe.js');
  await installAudioProbe(page);
  await page.goto('/');
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  await page.getByLabel('Import WAV').setInputFiles({ name: 'song.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 6, channels: 2, sampleRate: 44100, dbfs: -20 }) });
  await expect(transport.getByRole('status')).toHaveText('Ready');
  await transport.getByRole('button', { name: 'Play' }).click();
  await expect(transport.getByRole('status')).toHaveText('Playing');

  await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: 'Stems…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Stem session' });
  await expect(dialog.getByRole('status')).toHaveText('No stems yet.');
  await dialog.getByLabel('Add stem WAVs').setInputFiles([
    { name: 'drums.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 8, channels: 2, sampleRate: 44100, frequency: 110, dbfs: -12 }) },
    { name: 'bass.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 8, channels: 1, sampleRate: 48000, frequency: 55, dbfs: -12 }) },
    { name: 'vocal.wav', mimeType: 'audio/wav', buffer: makeWav({ seconds: 5, channels: 1, sampleRate: 44100, frequency: 880, dbfs: -18 }) },
  ]);
  await expect(dialog.getByRole('status')).toHaveText('3 stems · 0:08.0');
  const notes = dialog.getByRole('list', { name: 'Alignment notes' });
  await expect(notes).toContainText('bass.wav is 48,000 Hz; it plays resampled to 44,100 Hz by the browser.');
  await expect(notes).toContainText('The stems end at different times (5.00–8.00 s); the session lasts until the last one ends');

  await dialog.getByRole('button', { name: 'Play' }).click();
  await expect(transport.getByRole('status')).toHaveText('Stopped'); // the single track handed over
  await expect.poll(() => audioSources(page)).toMatchObject({ playing: 3 });
  const timer = dialog.getByRole('timer', { name: 'Stem position' });
  await expect(timer).not.toHaveText(/^0:00\.0 /);
  const vocal = dialog.getByRole('listitem', { name: 'Stem vocal.wav' });
  await expect.poll(async () => Number(await vocal.getByRole('meter').getAttribute('aria-valuenow'))).toBeGreaterThan(-40);
  await expect.poll(async () => Number(await dialog.getByRole('meter', { name: 'Master output level' }).getAttribute('aria-valuenow'))).toBeGreaterThan(-40);

  // Mute and solo change only their strips' audibility.
  await vocal.getByRole('button', { name: 'Mute' }).click();
  await expect(vocal.getByRole('button', { name: 'Mute' })).toHaveAttribute('aria-pressed', 'true');
  await expect(vocal).toHaveClass(/is-silent/);
  await expect.poll(async () => Number(await vocal.getByRole('meter').getAttribute('aria-valuenow'))).toBe(-60);
  const drums = dialog.getByRole('listitem', { name: 'Stem drums.wav' });
  await drums.getByRole('button', { name: 'Solo' }).click();
  await expect(dialog.getByRole('listitem', { name: 'Stem bass.wav' })).toHaveClass(/is-silent/);
  await expect(drums).not.toHaveClass(/is-silent/);
  await drums.getByRole('button', { name: 'Solo' }).click();
  await vocal.getByRole('button', { name: 'Mute' }).click();

  // Seek while playing restarts every stem together; pause keeps the position.
  await dialog.getByLabel('Position', { exact: true }).fill('6');
  await expect(timer).toHaveText(/^0:0[67]\.\d \/ 0:08\.0$/);
  await expect.poll(() => audioSources(page)).toMatchObject({ playing: 2 }); // the 5 s vocal has ended by 6 s
  await dialog.getByRole('button', { name: 'Pause' }).click();
  await expect.poll(() => audioSources(page)).toMatchObject({ playing: 0 });
  await page.setViewportSize({ width: 360, height: 780 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('stems-360x780.png') });
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.screenshot({ path: testInfo.outputPath('stems-1280x720.png') });

  // Closing pauses the stems; the single track plays again with exactly one source.
  await dialog.getByRole('button', { name: 'Close stems' }).click();
  await transport.getByRole('button', { name: 'Play' }).click();
  await expect(transport.getByRole('status')).toHaveText('Playing');
  await expect.poll(() => audioSources(page)).toMatchObject({ playing: 1 });
  await page.getByRole('region', { name: 'Mixer', exact: true }).getByRole('button', { name: 'Stems…' }).click();
  await dialog.getByRole('button', { name: 'Play' }).click();
  // The stems resume from the paused position (about 6 s), where the 5 s vocal has already ended.
  await expect(timer).toHaveText(/^0:0[67]\.\d \/ 0:08\.0$/);
  await expect.poll(() => audioSources(page)).toMatchObject({ playing: 2 });
  await expect(transport.getByRole('status')).toHaveText('Stopped');
  await dialog.getByRole('listitem', { name: 'Stem vocal.wav' }).getByRole('button', { name: 'Remove vocal.wav' }).click();
  await expect(dialog.getByRole('status')).toHaveText('2 stems · 0:08.0');
});
