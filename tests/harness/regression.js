// The LAS-29 DSP regression run: every fixture at every rate through every preset, checked by
// render-checks.js and compared with the versioned golden results.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { renderChain, LIMITER_OVERSAMPLING } from '../../src/dsp/chain.js';
import { CHAIN_VERSION } from '../../src/dsp/chain-params.js';
import { ANALYSIS_VERSION } from '../../src/dsp/analysis.js';
import { BROADBAND, FIXTURES, FIXTURE_RATES, FIXTURE_SET_VERSION } from '../fixtures/dsp-fixtures.js';
import { PRESETS } from './presets.js';
import { checkRender, metrics } from './render-checks.js';

export const GOLDEN_PATH = new URL('../golden/dsp-golden.json', import.meta.url);
// Golden comparison tolerances. Renders are deterministic, so these only absorb last-digit
// differences between machines; any real processing change exceeds them (and changes the hash).
export const TOLERANCE = { db: 0.01, correlation: 0.0001 };

export const fixtureHash = channels => {
  const hash = createHash('sha256');
  for (const channel of channels) hash.update(new Uint8Array(channel.buffer, channel.byteOffset, channel.byteLength));
  return hash.digest('hex');
};

export function versions() {
  return { fixtureSetVersion: FIXTURE_SET_VERSION, chainSchemaVersion: CHAIN_VERSION, analysisVersion: ANALYSIS_VERSION, limiterOversampling: LIMITER_OVERSAMPLING };
}

export function runRegression({ rates = FIXTURE_RATES, fixtures = Object.keys(FIXTURES), presets = Object.keys(PRESETS), onRender } = {}) {
  const result = { fixtures: {}, renders: {}, findings: [] };
  for (const rate of rates) {
    for (const name of fixtures) {
      const input = FIXTURES[name](rate);
      result.fixtures[`${name}@${rate}`] = fixtureHash(input);
      for (const preset of presets) {
        const params = PRESETS[preset];
        const started = performance.now();
        const { channels } = renderChain(params, input, rate);
        const key = `${name}@${rate}/${preset}`;
        const findings = checkRender(input, channels, rate, {
          bypass: preset === 'bypass',
          ceiling: params.limiter.enabled ? params.limiter.ceiling : null,
          broadband: BROADBAND.has(name),
          // A stereo reverb spreads a one-sided source into both channels by design (LAS-64).
          silentRight: name === 'left-only' && preset !== 'space',
        });
        result.findings.push(...findings.map(text => `${key}: ${text}`));
        result.renders[key] = metrics(channels, rate);
        onRender?.(key, performance.now() - started);
      }
    }
  }
  return result;
}

export function readGolden() {
  return JSON.parse(readFileSync(GOLDEN_PATH, 'utf8'));
}

// Differences between a run and the golden file, as readable lines (empty = no regression).
export function compareWithGolden(run, golden) {
  const differences = [];
  const now = versions();
  for (const [key, value] of Object.entries(now)) if (golden[key] !== value) differences.push(`golden ${key} is ${golden[key]}, code is ${value}: regenerate the golden file with a reason`);
  for (const [key, hash] of Object.entries(run.fixtures)) {
    if (!golden.fixtures[key]) differences.push(`${key}: no golden fixture hash`);
    else if (golden.fixtures[key] !== hash) differences.push(`${key}: fixture generator output changed`);
  }
  for (const [key, current] of Object.entries(run.renders)) {
    const expected = golden.renders[key];
    if (!expected) { differences.push(`${key}: no golden result`); continue; }
    for (const field of ['frames', 'channels', 'clippedSamples', 'nonFinite']) {
      if (current[field] !== expected[field]) differences.push(`${key}: ${field} ${expected[field]} → ${current[field]}`);
    }
    for (const field of ['integratedLufs', 'truePeakDbtp', 'samplePeakDbfs']) {
      const a = expected[field], b = current[field];
      if ((a === null) !== (b === null) || (a !== null && Math.abs(a - b) > TOLERANCE.db)) differences.push(`${key}: ${field} ${a} → ${b}`);
    }
    current.rmsDbfs.forEach((b, c) => {
      const a = expected.rmsDbfs[c];
      if ((a === null) !== (b === null) || (a !== null && Math.abs(a - b) > TOLERANCE.db)) differences.push(`${key}: channel ${c + 1} RMS ${a} → ${b} dBFS`);
    });
    if ((expected.correlation === null) !== (current.correlation === null) || (expected.correlation !== null && Math.abs(expected.correlation - current.correlation) > TOLERANCE.correlation)) {
      differences.push(`${key}: correlation ${expected.correlation} → ${current.correlation}`);
    }
    if (current.sha256 !== expected.sha256) differences.push(`${key}: rendered audio changed (24-bit export hash differs)`);
  }
  return differences;
}
