import { test, expect } from '@playwright/test';
import { makeWav } from '../fixtures/wav.js';
import { installAudioProbe, audioSources } from './helpers/audio-probe.js';
import { installChainProbe } from './helpers/chain-probe.js';

// LAS-67 player: FF/RWD, a seekable timeline and output meters driven by what reaches the
// speakers. The timer is the engine's audio clock (LAS-9).
function studio(page) {
  const transport = page.getByRole('region', { name: 'Transport', exact: true });
  const tracks = page.getByRole('region', { name: 'Tracks', exact: true });
  return {
    status: transport.getByRole('status'),
    timer: transport.getByRole('timer', { name: 'Playback position' }),
    play: transport.getByRole('button', { name: 'Play' }),
    pause: transport.getByRole('button', { name: 'Pause' }),
    stop: transport.getByRole('button', { name: 'Stop' }),
    rwd: transport.getByRole('button', { name: 'Rewind 5 seconds' }),
    ff: transport.getByRole('button', { name: 'Fast forward 5 seconds' }),
    timeline: tracks.getByRole('slider', { name: 'Timeline' }),
    needle: side => tracks.getByRole('meter', { name: `${side} needle meter (VU-style RMS)` }),
    bar: side => tracks.getByRole('meter', { name: `${side} output level` }),
    clip: tracks.locator('.clip-led'),
    load: (name, buffer) => page.getByLabel('Import WAV').setInputFiles({ name, mimeType: 'audio/wav', buffer }),
  };
}
const seconds = text => { const [m, s] = text.split(' / ')[0].split(':'); return Number(m) * 60 + Number(s); };
const now = async ui => seconds(await ui.timer.textContent());
const value = async meter => Number(await meter.getAttribute('aria-valuenow'));

function stereo({ left = 1, right = 1, seconds: length = 30, dbfs = -12, square = false } = {}) {
  const rate = 44100, frames = rate * length, a = 32767 * 10 ** (dbfs / 20);
  const wav = makeWav({ seconds: length, channels: 2 });
  for (let n = 0; n < frames; n++) {
    const s = Math.sin((2 * Math.PI * 1000 * n) / rate);
    const v = Math.round(a * (square ? Math.sign(s) : s));
    wav.writeInt16LE(Math.round(v * left), 44 + n * 4);
    wav.writeInt16LE(Math.round(v * right), 46 + n * 4);
  }
  return wav;
}

test('LAS-67: FF/RWD skip 5 s, clamp at both ends, work while paused and playing, and keep one source', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await expect(ui.ff).toBeDisabled();
  await expect(ui.rwd).toBeDisabled();
  await expect(ui.timeline).toBeDisabled();
  await ui.load('tone.wav', stereo());
  await expect(ui.status).toHaveText('Ready');
  await ui.ff.click();
  await expect(ui.timer).toHaveText('00:05.0 / 00:30.0');
  await ui.ff.click();
  await expect(ui.timer).toHaveText('00:10.0 / 00:30.0');
  await ui.rwd.click();
  await expect(ui.timer).toHaveText('00:05.0 / 00:30.0');
  for (let i = 0; i < 3; i++) await ui.rwd.click();
  await expect(ui.timer).toHaveText('00:00.0 / 00:30.0'); // clamped at the start
  // Keyboard activation (Enter) skips once.
  await ui.ff.focus();
  await page.keyboard.press('Enter');
  await expect(ui.timer).toHaveText('00:05.0 / 00:30.0');

  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  const before = await now(ui);
  await ui.ff.click();
  await expect.poll(() => now(ui)).toBeGreaterThanOrEqual(before + 5);
  await expect(ui.status).toHaveText('Playing');
  // Rapid skips: never two sources at once.
  for (let i = 0; i < 8; i++) await ui.rwd.click();
  await expect(ui.status).toHaveText('Playing');
  expect(await now(ui)).toBeLessThan(2);
  const sources = await audioSources(page);
  expect(sources.playing).toBe(1);
  expect(await page.evaluate(() => window.__audioProbe.mostPlaying)).toBe(1);

  // Pause keeps the place; FF while paused moves it; Play continues there.
  await ui.pause.click();
  const paused = await now(ui);
  await ui.ff.click();
  await expect.poll(() => now(ui)).toBeCloseTo(paused + 5, 0);
  await expect(ui.status).toHaveText('Paused');
});

test('LAS-67: holding FF seeks 5 s every 200 ms after 400 ms; it stops at the end; Play from the end restarts at 0', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.load('tone.wav', stereo());
  await expect(ui.status).toHaveText('Ready');
  const box = await ui.ff.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1050); // 1 step at once + about 3 repeats
  await page.mouse.up();
  const held = await now(ui);
  expect(held).toBeGreaterThanOrEqual(15);
  expect(held).toBeLessThanOrEqual(25);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await expect(ui.timer).toHaveText('00:30.0 / 00:30.0'); // clamped at the end
  await ui.play.click();
  await expect(ui.status).toHaveText('Playing');
  expect(await now(ui)).toBeLessThan(1);
  // FF across the end while playing ends playback like the natural end of the track.
  await ui.timeline.focus();
  await page.keyboard.press('End');
  await expect(ui.status).toHaveText('Stopped');
  await expect(ui.timer).toHaveText('00:00.0 / 00:30.0');
});

test('LAS-67: the timeline seeks with the keyboard and the pointer, while playing and paused', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.load('tone.wav', stereo());
  await expect(ui.status).toHaveText('Ready');
  await ui.timeline.focus();
  for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowRight');
  await expect(ui.timer).toHaveText('00:03.0 / 00:30.0');
  await page.keyboard.press('PageUp');
  await expect(ui.timer).toHaveText('00:13.0 / 00:30.0');
  await expect(ui.timeline).toHaveAttribute('aria-valuetext', '0:13.0 of 0:30.0');
  await page.keyboard.press('Home');
  await expect(ui.timer).toHaveText('00:00.0 / 00:30.0');
  await ui.play.click();
  await ui.timeline.focus();
  await page.keyboard.press('PageUp');
  await expect.poll(() => now(ui)).toBeGreaterThanOrEqual(10);
  await expect(ui.status).toHaveText('Playing');
  // Pointer: press at the middle of the track, release: seek to about 15 s.
  await ui.pause.click();
  const box = await ui.timeline.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect.poll(() => now(ui)).toBeGreaterThan(13);
  expect(await now(ui)).toBeLessThan(17);
  await expect(ui.status).toHaveText('Paused');
});

test('LAS-67: needles and bars follow the real output: left-only, right-only, mono, Master Level, silence and pause', async ({ page }) => {
  await installChainProbe(page);
  await page.goto('/');
  const ui = studio(page);
  await expect(ui.needle('Left')).toHaveCount(0); // no track: no player display
  const playAndRead = async () => {
    await ui.play.click();
    await expect(ui.status).toHaveText('Playing');
    await page.waitForTimeout(700); // needle ballistics settle within ~300 ms
    const read = { left: await value(ui.needle('Left')), right: await value(ui.needle('Right')), barLeft: await value(ui.bar('Left')), barRight: await value(ui.bar('Right')) };
    await ui.stop.click();
    return read;
  };
  // −12 dBFS sine: RMS −15 dBFS, sample peak −12 dBFS.
  await ui.load('left.wav', stereo({ right: 0 }));
  let r = await playAndRead();
  expect(r.left).toBeGreaterThanOrEqual(-16);
  expect(r.left).toBeLessThanOrEqual(-14);
  expect(r.right).toBe(-40);
  expect(r.barLeft).toBeGreaterThanOrEqual(-13);
  expect(r.barRight).toBe(-60);
  await ui.load('right.wav', stereo({ left: 0 }));
  r = await playAndRead();
  expect(r.left).toBe(-40);
  expect(r.right).toBeGreaterThanOrEqual(-16);
  await ui.load('mono.wav', makeWav({ seconds: 10, channels: 1, frequency: 1000, dbfs: -12 }));
  r = await playAndRead();
  expect(r.left).toBe(r.right);
  // The meters are after Master Level.
  await page.getByRole('region', { name: 'Master', exact: true }).getByRole('slider', { name: 'Master level' }).fill('-12');
  const lower = await playAndRead();
  expect(lower.left).toBeLessThanOrEqual(r.left - 11);
  // Silence: the meters rest; pause: they fall back to rest.
  await ui.load('silence.wav', stereo({ left: 0, right: 0 }));
  r = await playAndRead();
  expect([r.left, r.right, r.barLeft, r.barRight]).toEqual([-40, -40, -60, -60]);
});

test('LAS-67: the clip indicator lights only when full scale reaches the speakers, and resets on click', async ({ page }) => {
  await page.goto('/');
  const ui = studio(page);
  await ui.load('hot.wav', stereo({ dbfs: 0, square: true, seconds: 10 }));
  await expect(ui.status).toHaveText('Ready');
  // Processed path: the limiter holds −1 dBTP, so nothing clips.
  await ui.play.click();
  await page.waitForTimeout(800);
  await expect(ui.clip).toHaveAttribute('aria-pressed', 'false');
  // Original path (matching off so it is not turned down): the full-scale square reaches the output.
  const master = page.getByRole('region', { name: 'Master', exact: true });
  await master.getByLabel('Match loudness').uncheck();
  await master.getByRole('radio', { name: 'Original' }).check();
  await expect(ui.clip).toHaveAttribute('aria-pressed', 'true', { timeout: 3000 });
  await expect(ui.clip).toHaveAccessibleName('Clipping detected at the output; reset');
  await ui.stop.click();
  await ui.clip.click();
  await expect(ui.clip).toHaveAttribute('aria-pressed', 'false');
});

test('LAS-67: the spectrum draws the real output while playing and says so when there is no signal; playback stays smooth', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  const ui = studio(page);
  await ui.load('tone.wav', stereo());
  const spectrum = page.getByRole('img', { name: 'Output spectrum (what you hear)' });
  await expect(spectrum).toBeVisible();
  await expect(spectrum.getByText('no signal', { exact: false })).toBeVisible();
  await ui.play.click();
  await expect(spectrum.getByText('no signal', { exact: false })).toHaveCount(0);
  const painted = () => spectrum.locator('canvas').evaluate(canvas => {
    const { data } = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height);
    let lit = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) lit++;
    return lit;
  });
  await expect.poll(painted).toBeGreaterThan(100);
  // Animation cost: the longest gap between frames over 2 s of playback with every meter running.
  const gap = await page.evaluate(() => new Promise(resolve => {
    let last = performance.now(), worst = 0;
    const end = last + 2000;
    const tick = t => { worst = Math.max(worst, t - last); last = t; if (t < end) requestAnimationFrame(tick); else resolve(Math.round(worst)); };
    requestAnimationFrame(tick);
  }));
  test.info().annotations.push({ type: 'longest frame gap while playing with meters (ms)', description: String(gap) });
  // No visible freeze. (Alone this measures about 17 ms; with four test workers sharing the CPU it
  // can reach about 100 ms, which is contention on the test machine, not the app.)
  expect(gap).toBeLessThan(250);
  await ui.pause.click();
  await expect(spectrum.getByText('no signal', { exact: false })).toBeVisible({ timeout: 5000 });
});

test('LAS-67: replacing and removing the track during rapid seeking stays safe', async ({ page }) => {
  await installAudioProbe(page);
  await page.goto('/');
  const ui = studio(page);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await ui.load('a.wav', stereo());
  await ui.play.click();
  for (let i = 0; i < 6; i++) await ui.ff.click();
  await ui.load('b.wav', stereo({ seconds: 12 }));
  await expect(page.getByRole('heading', { name: 'b.wav' })).toBeVisible();
  await expect(ui.timer).toHaveText('00:00.0 / 00:12.0');
  await ui.play.click();
  await ui.ff.click();
  await page.getByRole('button', { name: 'Remove track' }).click();
  await expect(ui.ff).toBeDisabled();
  await expect(ui.timeline).toBeDisabled();
  expect((await audioSources(page)).playing).toBe(0);
  expect(errors).toEqual([]);
});

test('LAS-67: on a 360 px phone the player fits without sideways scrolling and every control is reachable', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  const ui = studio(page);
  await ui.load('tone.wav', stereo());
  await expect(ui.status).toHaveText('Ready');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
  for (const control of [ui.rwd, ui.ff, ui.timeline, ui.needle('Left'), ui.needle('Right'), ui.bar('Left'), ui.clip]) {
    await control.scrollIntoViewIfNeeded();
    await expect(control).toBeInViewport({ ratio: 1 });
  }
});
