// LAS-71 measurement: import, play, loudness matching and WAV export of large valid WAV files in a
// real browser, with the time of each step and the peak resident memory of the browser processes.
// Usage: node scripts/large-file-check.js <app-url> <output.json> [executablePath]
// The app must already be served (npm run dev). Files are written to a temporary folder and removed.
// Results describe this machine only; they are not a guarantee for other hardware or browsers.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir, totalmem } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { writeWavOfSize } from '../tests/fixtures/large-wav.js';

const [appUrl = 'http://127.0.0.1:5173', output = 'large-file-check.json', executablePath] = process.argv.slice(2);
const SIZES = [
  { label: 'above the old 100 MiB limit', bytes: 126_000_044 },
  { label: 'exactly the 250 MiB limit', bytes: 262_144_000 },
];

// Resident memory (MiB) of every process of the launched browser (the root and its children).
function browserRssMiB(rootPid) {
  const table = execFileSync('ps', ['-eo', 'pid=,ppid=,rss='], { encoding: 'utf8' }).trim().split('\n').map(line => line.trim().split(/\s+/).map(Number));
  const family = new Set([rootPid]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const [pid, ppid] of table) if (family.has(ppid) && !family.has(pid)) { family.add(pid); grew = true; }
  }
  family.delete(rootPid);
  return table.filter(([pid]) => family.has(pid)).reduce((sum, [, , rss]) => sum + rss, 0) / 1024;
}

const folder = mkdtempSync(join(tmpdir(), 'mps-las71-measure-'));
const browser = await chromium.launch(executablePath ? { executablePath } : {});
// The browser runs as children of this Node process; their memory is summed without Node's own.
const rootPid = process.pid;
const browserVersion = browser.version();
const results = [];
try {
  for (const { label, bytes } of SIZES) {
    const path = join(folder, `large-${bytes}.wav`);
    writeWavOfSize(path, bytes);
    const page = await browser.newPage();
    await page.goto(appUrl);
    let peak = 0;
    const sampler = setInterval(() => { peak = Math.max(peak, browserRssMiB(rootPid)); }, 200);
    const time = async step => { const start = Date.now(); await step(); return (Date.now() - start) / 1000; };
    const status = page.getByRole('region', { name: 'Transport', exact: true }).getByRole('status');
    const entry = { label, bytes, mib: Number((bytes / 1048576).toFixed(2)) };
    try {
      entry.importSeconds = await time(async () => {
        await page.getByLabel('Import WAV').setInputFiles(path);
        await status.filter({ hasText: /^Ready$/ }).waitFor({ timeout: 300_000 });
      });
      entry.decoded = await page.locator('.track-info').textContent();
      entry.playStartSeconds = await time(async () => {
        await page.getByRole('button', { name: 'Play' }).click();
        await status.filter({ hasText: /^Playing$/ }).waitFor();
      });
      // Main-thread responsiveness while playing and while the loudness match renders in a worker:
      // the longest gap between animation frames over 3 seconds.
      entry.longestFrameGapMs = await page.evaluate(() => new Promise(resolve => {
        let last = performance.now(), worst = 0;
        const end = last + 3000;
        const tick = now => { worst = Math.max(worst, now - last); last = now; if (now < end) requestAnimationFrame(tick); else resolve(Math.round(worst)); };
        requestAnimationFrame(tick);
      }));
      entry.positionWhilePlaying = await page.getByRole('timer', { name: 'Playback position' }).textContent();
      await page.getByRole('button', { name: 'Stop' }).click();
      entry.loudnessMatchSeconds = await time(() => page.getByText(/Processed is .* dB|Both versions are equally loud/).waitFor({ timeout: 600_000 }));
      entry.exportSeconds = await time(async () => {
        await page.getByRole('button', { name: 'Export WAV' }).click();
        await page.getByRole('dialog', { name: 'Export processed WAV' }).getByRole('button', { name: 'Export', exact: true }).click();
        await page.getByText('Export ready.').waitFor({ timeout: 900_000 });
      });
      entry.exportLength = await page.getByRole('row', { name: /^Length/ }).textContent();
      entry.errors = await page.getByRole('alert').allTextContents();
      entry.outcome = entry.errors.length ? 'FAIL' : 'PASS';
    } catch (failure) {
      entry.outcome = 'FAIL';
      entry.failure = failure.message.split('\n')[0];
    } finally {
      clearInterval(sampler);
      entry.peakBrowserRssMiB = Math.round(peak);
      results.push(entry);
      await page.close();
      rmSync(path, { force: true });
    }
    console.log(JSON.stringify(entry));
  }
} finally {
  await browser.close();
  rmSync(folder, { recursive: true, force: true });
}
const report = {
  issue: 'LAS-71',
  machine: { cpus: cpus().length, cpu: cpus()[0]?.model, memoryGiB: Number((totalmem() / 2 ** 30).toFixed(1)), platform: `${process.platform} ${process.arch}`, node: process.version },
  browser: browserVersion,
  appUrl,
  note: 'Headless browser, no audio device output. Times include the default loudness matching render running in parallel with the export.',
  results,
};
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
