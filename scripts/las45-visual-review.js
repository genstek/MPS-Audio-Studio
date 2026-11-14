// LAS-45 visual review captures. Loads an original synthetic signal as the track plus three
// synthetic stems, runs Analyze, plays, and saves the first screen (the viewport, not a tall page)
// of layouts A-D next to the approved concept image. It proves composition only, not audio fidelity.
// Usage: node scripts/las45-visual-review.js [baseURL] [outDir]   (app must be running)
import { chromium } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const base = process.argv[2] ?? 'http://127.0.0.1:5173';
const out = process.argv[3] ?? 'docs/screenshots/LAS-45/visual-review';
const refs = 'docs/design/approved-references';
const sizes = (process.env.LAS45_SIZES ?? '1672x941,1920x1080').split(',').map(s => s.split('x').map(Number));
const layouts = (process.env.LAS45_LAYOUTS ?? 'a,b,c,d').split(',');

// Deterministic synthetic programme: a few sine partials plus filtered pseudo-random noise.
function synthWav({ seconds, seed, base: f0 }) {
  const rate = 44100, frames = rate * seconds, bytes = Buffer.alloc(44 + frames * 4);
  bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(2, 22); bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 4, 28); bytes.writeUInt16LE(4, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(frames * 4, 40);
  let state = seed, low = 0;
  const noise = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 2 ** 31 - 1; };
  for (let i = 0; i < frames; i++) {
    const t = i / rate;
    low += (noise() - low) * 0.08;
    const tone = [1, 2, 3, 5, 8, 13].reduce((sum, h, k) => sum + Math.sin(2 * Math.PI * f0 * h * t) / (k + 1.5), 0);
    const left = 0.16 * tone + 0.25 * low, right = 0.16 * Math.sin(2 * Math.PI * f0 * 1.5 * t) + 0.13 * tone + 0.22 * low;
    bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, left)) * 30000), 44 + i * 4);
    bytes.writeInt16LE(Math.round(Math.max(-1, Math.min(1, right)) * 30000), 46 + i * 4);
  }
  return bytes;
}
const wav = (name, seconds, seed, f0) => ({ name, mimeType: 'audio/wav', buffer: synthWav({ seconds, seed, base: f0 }) });

mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {});
const report = [];
for (const [width, height] of sizes) {
  for (const id of layouts) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(base);
    await page.getByLabel('Import WAV').setInputFiles(wav('synthetic-programme.wav', 20, 7, 110));
    await page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status').filter({ hasText: 'Ready' }).waitFor();
    if (!process.env.LAS45_NO_STEMS) {
      await page.getByRole('button', { name: 'Stems…' }).click();
      const stems = page.getByRole('dialog', { name: 'Stem session' });
      await stems.getByLabel('Add stem WAVs').setInputFiles([wav('Synthetic-1.wav', 4, 3, 82), wav('Synthetic-2.wav', 4, 5, 164), wav('Synthetic-3.wav', 4, 9, 330)]);
      await stems.getByRole('status').filter({ hasText: /^3 stem/ }).waitFor();
      await stems.getByRole('slider', { name: 'Gain (dB)' }).first().fill('-6');
      await stems.getByRole('button', { name: 'Close stems' }).click();
    }
    if (!process.env.LAS45_NO_ANALYZE) {
      await page.getByRole('button', { name: 'Analyze' }).click();
      const dialog = page.getByRole('dialog', { name: 'Track analysis' });
      await dialog.getByRole('status').filter({ hasText: 'Analysis complete.' }).waitFor({ timeout: 60000 });
      await dialog.getByRole('button', { name: 'Close analysis' }).click();
    }
    await page.getByRole('combobox', { name: 'Studio Layout' }).selectOption(id);
    await page.getByRole('region', { name: 'Transport', exact: true }).getByRole('button', { name: 'Play', exact: true }).click();
    await page.waitForTimeout(1500);
    const metrics = await page.evaluate(() => ({ scrollHeight: document.documentElement.scrollHeight, scrollWidth: document.documentElement.scrollWidth, innerHeight, innerWidth }));
    report.push({ layout: id, viewport: `${width}x${height}`, ...metrics });
    const shot = path.join(out, `app-${id}-${width}x${height}-viewport.png`);
    await page.screenshot({ path: shot });
    await page.close();
    // Side by side: approved concept (left) and the app (right), each at half width.
    const compare = await browser.newPage({ viewport: { width, height: Math.round((width / 2) * (height / width)) + 26 } });
    const uri = file => `data:image/png;base64,${readFileSync(file).toString('base64')}`;
    await compare.setContent(`<body style="margin:0;background:#000;color:#ddd;font:12px sans-serif"><div style="display:grid;grid-template-columns:1fr 1fr">
      <div style="padding:5px 8px">Approved concept ${id.toUpperCase()} (design target, 1672×941)</div><div style="padding:5px 8px">App, first screen at ${width}×${height} (synthetic audio)</div>
      <img style="width:100%;display:block" src="${uri(path.join(refs, `MPS-UI2-Concept-${id.toUpperCase()}.png`))}"><img style="width:100%;display:block" src="${uri(shot)}"></div></body>`);
    await compare.screenshot({ path: path.join(out, `compare-${id}-${width}x${height}.png`), fullPage: true });
    await compare.close();
  }
}
await browser.close();
console.table(report);
