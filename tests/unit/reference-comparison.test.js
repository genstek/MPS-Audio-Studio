import { describe, expect, test } from 'vitest';
import { analyze } from '../../src/dsp/analysis.js';
import { renderChain } from '../../src/dsp/chain.js';
import { defaultChain, validateChain } from '../../src/dsp/chain-params.js';
import { preRollSeconds, renderSegment } from '../../src/dsp/segment-render.js';
import { compareToReference, ComparisonError, matchLevels } from '../../src/reference-comparison.js';
import { FIXTURES } from '../fixtures/dsp-fixtures.js';
import { concat, noise, sine } from '../fixtures/signals.js';
import { PRESETS } from '../harness/presets.js';

const f32 = samples => Float32Array.from(samples);
const repeat = (channels, times) => channels.map(channel => f32(concat(...Array.from({ length: times }, () => channel))));
const gain = (channels, db) => channels.map(channel => channel.map(v => v * 10 ** (db / 20)));
// A one-pole low-pass (fc ≈ 1.3 kHz at 44.1 kHz) or its complement: duller or brighter versions.
const tilt = (channels, bright) => channels.map(channel => {
  let state = 0;
  return channel.map(v => { state += 0.17 * (v - state); return bright ? v - 0.8 * state : state; });
});
const PROGRAMME = repeat(FIXTURES.programme(44100), 4); // 16 s of the music-like LAS-29 programme

describe('section render (pre-roll)', () => {
  test('the pre-roll covers five of the slowest time constants and at least 3 s', () => {
    expect(preRollSeconds(defaultChain())).toBe(3);
    const slow = validateChain({ ...defaultChain(), compressor: { ...defaultChain().compressor, release: 2000 } });
    expect(preRollSeconds(slow)).toBe(10);
  });

  test('a rendered section measures as the same section of the whole-track render', () => {
    const segment = { start: 9, end: 15 };
    const whole = renderChain(PRESETS.master, PROGRAMME, 44100);
    const section = renderSegment(PRESETS.master, PROGRAMME, 44100, segment);
    expect(section.preRoll).toBe(3);
    const reference = whole.channels.map(channel => channel.subarray(9 * 44100, 15 * 44100));
    let largest = 0;
    for (let c = 0; c < 2; c++) for (let n = 0; n < reference[c].length; n++) largest = Math.max(largest, Math.abs(reference[c][n] - section.channels[c][n]));
    expect(largest).toBeLessThan(1e-4);
    const a = analyze(reference, 44100), b = analyze(section.channels, 44100);
    expect(Math.abs(a.loudness.integratedLufs - b.loudness.integratedLufs)).toBeLessThan(0.01);
    expect(Math.abs(a.peaks.truePeakDbtp - b.peaks.truePeakDbtp)).toBeLessThan(0.01);
  }, 30_000);

  test('with a slow compressor release the pre-roll is needed: without it the section measures differently', () => {
    const params = validateChain({ ...PRESETS.master, compressor: { ...PRESETS.master.compressor, release: 800, threshold: -30 } });
    expect(preRollSeconds(params)).toBe(4);
    const loud = [1, 2].map(seed => f32(noise({ seconds: 5, rate: 44100, amplitude: 0.9, seed })));
    const music = repeat(FIXTURES.programme(44100), 2);
    const audio = [0, 1].map(c => f32(concat(loud[c], music[c]))); // loud 0–5 s, music 5–13 s
    const cut = channels => channels.map(channel => channel.subarray(6 * 44100, 10 * 44100));
    const whole = cut(renderChain(params, audio, 44100).channels);
    const withPreRoll = renderSegment(params, audio, 44100, { start: 6, end: 10 }).channels;
    const alone = renderChain(params, cut(audio), 44100).channels; // no pre-roll
    const lufs = channels => analyze(channels, 44100).loudness.integratedLufs;
    expect(Math.abs(lufs(withPreRoll) - lufs(whole))).toBeLessThan(0.01);
    expect(Math.abs(lufs(alone) - lufs(whole))).toBeGreaterThan(0.1); // negative control
  }, 30_000);
});

describe('mix versus reference', () => {
  const reportOf = (channels, rate = 44100, segment) => analyze(channels, rate, segment);

  test('the same audio: every difference is zero and nothing large is interpreted', () => {
    const report = reportOf(PROGRAMME);
    const result = compareToReference(report, report, report);
    for (const row of result.rows) {
      expect(row.originalDifference === null || Math.abs(row.originalDifference) < 1e-9, row.measure).toBe(true);
      expect(row.processedDifference === null || Math.abs(row.processedDifference) < 1e-9, row.measure).toBe(true);
    }
    expect(result.rows.filter(row => row.group === 'Tonal balance').every(row => row.status === 'small')).toBe(true);
    expect(result.interpretations).toEqual([{ text: 'No large differences were measured; judge by ear with the level-matched monitor.', confidence: 'indicative' }]);
  });

  test('a louder mix shows a level difference with units, not a quality judgement, and tonal shape is unchanged', () => {
    const result = compareToReference(reportOf(PROGRAMME), reportOf(gain(PROGRAMME, 6)));
    const loudness = result.rows.find(row => row.measure === 'Integrated loudness');
    expect(loudness).toMatchObject({ unit: 'LUFS', differenceUnit: 'LU', explanation: 'Level difference (not a quality measure)', status: 'measured' });
    expect(loudness.originalDifference).toBeCloseTo(6, 1);
    expect(loudness.processedDifference).toBeNull();
    for (const row of result.rows.filter(row => row.group === 'Tonal balance')) expect(Math.abs(row.originalDifference)).toBeLessThan(0.01);
    expect(result.conditions.map(c => c.text)).toContain('Level differences are measurements, not quality scores; listening is level-matched.');
    expect(result.interpretations.map(i => i.text).join(' ')).not.toMatch(/better|worse|score/i);
  });

  test('a brighter and a duller mix: measured band differences and a cautious interpretation, kept apart', () => {
    const reference = reportOf(PROGRAMME);
    const bright = compareToReference(reference, reportOf(tilt(PROGRAMME, true)));
    const dull = compareToReference(reference, reportOf(tilt(PROGRAMME, false)));
    const band = (result, centre) => result.rows.find(row => row.centreHz === centre).originalDifference;
    expect(band(bright, 8000)).toBeGreaterThan(3);
    expect(band(dull, 8000)).toBeLessThan(-3);
    expect(bright.interpretations[0]).toEqual({ text: expect.stringMatching(/^The mix has more relative energy above 4 kHz .* it may sound brighter or harsher\.$/), confidence: 'indicative' });
    expect(dull.interpretations.some(i => /less relative energy above 4 kHz .* darker or duller/.test(i.text))).toBe(true);
    // The processed version is read on its own: here processing made the dull mix bright.
    const both = compareToReference(reference, reportOf(tilt(PROGRAMME, false)), reportOf(tilt(PROGRAMME, true)));
    expect(both.interpretations[0].text).toMatch(/^The mix has less relative energy above 4 kHz/);
    expect(both.interpretations[1].text).toMatch(/^The processed mix has more relative energy above 4 kHz \(\+\d+\.\d dB on average\)/);
    // Five full analyses of the programme: ~1.2 s alone; 5 s default is too tight under contention (LAS-125).
    // Local budget only; assertions unchanged.
  }, 30_000);

  test('sections of different length: compared, but flagged and interpretations marked uncertain', () => {
    const result = compareToReference(reportOf(PROGRAMME, 44100, { start: 0, end: 12 }), reportOf(tilt(PROGRAMME, true), 44100, { start: 0, end: 6 }));
    expect(result.conditions[0]).toEqual({ level: 'uncertain', text: 'The sections differ in length (6.0 s mix, 12.0 s reference); differences may reflect different musical content.' });
    expect(result.interpretations.every(i => i.confidence === 'uncertain')).toBe(true);
  });

  test('a short section is flagged as less reliable', () => {
    const result = compareToReference(reportOf(PROGRAMME, 44100, { start: 0, end: 3 }), reportOf(PROGRAMME, 44100, { start: 4, end: 7 }));
    expect(result.conditions[0].text).toBe('A section is shorter than 5 s; loudness range and spectrum are less reliable.');
  });

  test('mono against stereo: stereo measures are not compared, the rest is', () => {
    const mono = [PROGRAMME[0]];
    for (const [reference, mix, who] of [[mono, PROGRAMME, 'reference'], [PROGRAMME, mono, 'mix']]) {
      const result = compareToReference(reportOf(reference), reportOf(mix));
      expect(result.conditions).toContainEqual({ level: 'unsupported', text: `Stereo measures are not compared: the ${who} is mono.` });
      for (const row of result.rows.filter(row => row.group === 'Stereo')) {
        expect(row).toMatchObject({ status: 'not comparable', originalDifference: null });
      }
      expect(result.rows.find(row => row.measure === 'Integrated loudness').status).toBe('measured');
      expect(result.interpretations.join(' ')).not.toMatch(/wider|narrower/);
    }
  });

  test('silent or too-short sections are refused with a reason, never divided by zero', () => {
    const silent = [new Float32Array(44100 * 6), new Float32Array(44100 * 6)];
    const music = reportOf(PROGRAMME);
    expect(() => compareToReference(music, reportOf(silent))).toThrow(new ComparisonError('The mix section is silent; choose a section with music.'));
    expect(() => compareToReference(reportOf(silent), music)).toThrow('The reference section is silent; choose a section with music.');
    expect(() => compareToReference(music, reportOf(PROGRAMME, 44100, { start: 0, end: 0.2 }))).toThrow('The mix section is too short to measure.');
    expect(() => compareToReference(music, music, reportOf(silent))).toThrow('The processed mix section is silent; choose a section with music.');
  });

  test('a band with no energy is "not measurable", not a number', () => {
    const report = reportOf(PROGRAMME);
    const empty = structuredClone(report);
    empty.spectrum.bands.find(band => band.centreHz === 31.5).share = 0;
    const row = compareToReference(report, empty).rows.find(r => r.centreHz === 31.5);
    expect(row).toMatchObject({ original: null, originalDifference: null, status: 'not measurable' });
  });

  test('different sample rates compare only the shared octave bands, renormalised', () => {
    const at = rate => [f32(noise({ seconds: 8, rate, amplitude: 0.3, seed: 9 })), f32(noise({ seconds: 8, rate, amplitude: 0.3, seed: 10 }))];
    const result = compareToReference(reportOf(at(48000), 48000), reportOf(at(44100), 44100));
    expect(result.conditions).toContainEqual({ level: 'uncertain', text: 'Different sample rates (44100 Hz mix, 48000 Hz reference): only octave bands both can contain are compared.' });
    const bands = result.rows.filter(row => row.group === 'Tonal balance');
    expect(bands.map(row => row.centreHz)).toEqual([31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000]);
    // White noise at both rates: renormalising over the shared bands leaves only small differences.
    for (const row of bands) expect(Math.abs(row.originalDifference), row.measure).toBeLessThan(0.6);
  });

  test('section selection: comparing the matching section of a track gives no level difference', () => {
    const quiet = sine({ frequency: 440, dbfs: -30, seconds: 8, rate: 44100 });
    const loud = sine({ frequency: 440, dbfs: -12, seconds: 8, rate: 44100 });
    const track = [f32(concat(quiet, loud))];
    const reference = reportOf([f32(loud)]);
    const loudness = segment => compareToReference(reference, reportOf(track, 44100, segment)).rows.find(row => row.measure === 'Integrated loudness').originalDifference;
    expect(Math.abs(loudness({ start: 9, end: 15 }))).toBeLessThan(0.05);
    expect(loudness({ start: 1, end: 7 })).toBeCloseTo(-18, 0);
  });

  test('reports from different analysis versions are refused', () => {
    const report = reportOf(PROGRAMME);
    expect(() => compareToReference({ ...report, version: 'mps-analysis-0' }, report)).toThrow(/different analysis versions/);
  });

  test('matched-loudness gains turn the louder versions down to the quietest, never up', () => {
    expect(matchLevels({ processedDb: -10, originalDb: -14, referenceDb: -12 })).toEqual({ processedDb: -4, originalDb: 0, referenceDb: -2 });
    expect(matchLevels({ originalDb: -16, referenceDb: -9.5 })).toEqual({ originalDb: 0, referenceDb: -6.5 });
    expect(matchLevels({ processedDb: null, referenceDb: -9 })).toEqual({ processedDb: 0, referenceDb: 0 });
  });
});
