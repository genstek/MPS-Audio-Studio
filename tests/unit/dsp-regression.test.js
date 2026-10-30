import { describe, expect, test } from 'vitest';
import { renderChain } from '../../src/dsp/chain.js';
import { FIXTURES, FIXTURE_SET_VERSION } from '../fixtures/dsp-fixtures.js';
import { PRESETS } from '../harness/presets.js';
import { checkRender } from '../harness/render-checks.js';
import { compareWithGolden, readGolden, runRegression, versions } from '../harness/regression.js';

// LAS-29. The full set (both rates) runs with `npm run dsp:regression`; here the 44.1 kHz half runs
// on every `npm run check`, compared with the versioned golden results.
describe('LAS-29 DSP regression against the golden results', () => {
  test('golden file matches the current fixture set, schema and analysis versions', () => {
    const golden = readGolden();
    expect(golden).toMatchObject(versions());
    expect(golden.fixtureSetVersion).toBe(FIXTURE_SET_VERSION);
    expect(golden.history.at(-1).reason).toBeTruthy();
  });

  test('every fixture × preset at 44.1 kHz passes the render checks and matches the golden results', () => {
    const run = runRegression({ rates: [44100] });
    expect(run.findings).toEqual([]);
    expect(compareWithGolden(run, readGolden())).toEqual([]);
    expect(Object.keys(run.renders)).toHaveLength(Object.keys(FIXTURES).length * Object.keys(PRESETS).length);
  }, 120_000);
});

describe('LAS-29 render checks catch deliberately broken renders', () => {
  const rate = 44100;
  const programme = FIXTURES.programme(rate);
  const processed = renderChain(PRESETS.master, programme, rate).channels;
  const expectations = { bypass: false, ceiling: -1, broadband: true, silentRight: false };
  const copy = channels => channels.map(channel => Float32Array.from(channel));

  test('the correct render has no findings', () => {
    expect(checkRender(programme, processed, rate, expectations)).toEqual([]);
  });

  test.each([
    ['NaN and Infinity', out => { out[0][1000] = NaN; out[1][2000] = Infinity; }, /non-finite samples/],
    ['a lost channel', out => out.splice(1, 1), /channel count changed: 2 → 1/],
    ['a shortened render', out => { out[0] = out[0].subarray(0, out[0].length - 10); }, /length of channel 1 changed/],
    ['uncompensated latency (83 samples late)', out => out.forEach((channel, c) => { const late = new Float32Array(channel.length); late.set(channel.subarray(0, channel.length - 83), 83); out[c] = late; }), /timing changed: channel 1 is shifted by 83 samples/],
    ['clipping', out => { out[0] = out[0].map(v => Math.max(-1, Math.min(1, v * 3))); }, /unintended clipping/],
    ['a true peak over the ceiling', out => { out[1] = out[1].map(v => v * 1.2); }, /over the -1 dBTP ceiling/],
  ])('%s is reported', (_name, damage, message) => {
    const broken = copy(processed);
    damage(broken);
    expect(checkRender(programme, broken, rate, expectations).join('\n')).toMatch(message);
  });

  test('swapped channels are reported for the left-only fixture', () => {
    const input = FIXTURES['left-only'](rate);
    const output = renderChain(PRESETS.master, input, rate).channels;
    expect(checkRender(input, output, rate, { ceiling: -1, silentRight: true })).toEqual([]);
    expect(checkRender(input, [output[1], output[0]], rate, { ceiling: -1, silentRight: true }).join('\n')).toMatch(/channel mapping changed/);
  });

  test('a bypass that is not an exact identity is reported', () => {
    const output = renderChain(PRESETS.bypass, programme, rate).channels;
    expect(checkRender(programme, output, rate, { bypass: true, ceiling: null })).toEqual([]);
    const nearly = output.map(channel => channel.map(v => v * 0.9999));
    expect(checkRender(programme, nearly, rate, { bypass: true, ceiling: null }).join('\n')).toMatch(/bypass changed channel 1/);
  });

  test('a processing regression is reported by the golden comparison', () => {
    const run = runRegression({ rates: [44100], fixtures: ['tone-1k-stereo'], presets: ['master'] });
    const golden = readGolden();
    const altered = structuredClone(golden);
    altered.renders['tone-1k-stereo@44100/master'].integratedLufs += 0.5;
    altered.renders['tone-1k-stereo@44100/master'].sha256 = '0'.repeat(64);
    const differences = compareWithGolden(run, altered).join('\n');
    expect(differences).toMatch(/integratedLufs/);
    expect(differences).toMatch(/rendered audio changed/);
  });
});
