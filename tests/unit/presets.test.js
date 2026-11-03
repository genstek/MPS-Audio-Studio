import { describe, expect, test } from 'vitest';
import { defaultChain, editBand, serializeChain, setEqMode, validateChain } from '../../src/dsp/chain-params.js';
import { atStrength } from '../../src/proposal.js';
import { composeChain, defaultPreferences, parsePresetFile, PRESET_VERSION, PresetError, serializePreset, validatePreferences } from '../../src/presets.js';

function customChain() {
  let chain = setEqMode(defaultChain(), 'independent');
  chain = editBand(chain, 'left', 0, { enabled: true, type: 'high-pass', frequency: 28, gain: 0, q: 0.707 });
  chain = editBand(chain, 'right', 12, { enabled: true, type: 'bell', frequency: 1800, gain: 2, q: 1.5 });
  return validateChain({ ...chain, compressor: { ...chain.compressor, enabled: true, ratio: 3 }, limiter: { ...chain.limiter, inputGain: 2 } });
}
// A settings file as LAS-28 wrote it (schema v1: no Space, three processors).
function legacyV1(chain) {
  const { space, ...rest } = JSON.parse(serializeChain(chain)); // eslint-disable-line no-unused-vars
  return { ...rest, version: 1, order: ['eq', 'compressor', 'limiter'] };
}
const preset = { name: 'Night drive', chain: customChain(), origin: 'proposal', analysisVersion: 'mps-analysis-1', proposalVersion: 'mps-proposal-1', strength: 80 };

describe('preset files', () => {
  test('save → load restores the complete preset, including independent L/R bands and the chain order', () => {
    const text = serializePreset(preset);
    expect(JSON.parse(text)).toMatchObject({ schema: 'mps-preset', version: 1 });
    expect(serializePreset(preset)).toBe(text); // stable text
    const { preset: loaded, migratedFrom } = parsePresetFile(text);
    expect(migratedFrom).toBeNull();
    expect(loaded).toEqual(preset);
    expect(loaded.chain.eq.mode).toBe('independent');
    expect(loaded.chain.order).toEqual(['eq', 'compressor', 'space', 'limiter']);
  });

  test('an LAS-28 settings file (mps-chain v1) is migrated into a preset, with Space off (LAS-64)', () => {
    const { preset: migrated, migratedFrom } = parsePresetFile(JSON.stringify(legacyV1(customChain())), 'club-master.json');
    expect(migratedFrom).toBe('mps-chain v1 settings file');
    expect(migrated).toEqual({ name: 'club-master', chain: customChain(), origin: 'import', analysisVersion: null, proposalVersion: null, strength: null });
    expect(migrated.chain.space.enabled).toBe(false);
  });

  test('a current settings file (mps-chain v2, with Space) becomes a preset unchanged', () => {
    const chain = { ...customChain(), space: { enabled: true, mix: 30, preDelay: 25, decay: 2.2, damping: 50 } };
    const { preset: migrated, migratedFrom } = parsePresetFile(serializeChain(chain), 'hall.json');
    expect(migratedFrom).toBe('mps-chain v2 settings file');
    expect(migrated.chain).toEqual(chain);
  });

  test('newer, unknown, broken and invalid files are refused with a reason', () => {
    const refused = text => { try { parsePresetFile(text); } catch (failure) { expect(failure).toBeInstanceOf(PresetError); return failure.message; } throw new Error('accepted'); };
    expect(refused(JSON.stringify({ ...JSON.parse(serializePreset(preset)), version: PRESET_VERSION + 1 }))).toBe('This preset was saved by a newer studio (mps-preset v2); update the studio to open it.');
    expect(refused('{"schema":"other"}')).toBe('The file is not an MPS preset or settings file.');
    expect(refused('[1,2]')).toBe('The file is not an MPS preset or settings file.');
    expect(refused('{not json')).toBe('The file is not valid JSON.');
    const broken = JSON.parse(serializePreset(preset));
    broken.chain.eq.left = broken.chain.eq.left.slice(0, 23);
    expect(refused(JSON.stringify(broken))).toMatch(/^The preset's settings are invalid: /);
    expect(refused(JSON.stringify({ ...JSON.parse(serializePreset(preset)), version: 0 }))).toBe('The preset has no valid version.');
    expect(refused(JSON.stringify({ ...JSON.parse(serializeChain(customChain())), version: 9 }))).toMatch(/^The preset's settings are invalid: .*newer/);
  });
});

describe('preferences', () => {
  test('validated against their bounds and version', () => {
    expect(validatePreferences({ ...defaultPreferences(), highShelfDb: 2.5 })).toEqual({ ...defaultPreferences(), highShelfDb: 2.5 });
    expect(() => validatePreferences({ ...defaultPreferences(), lowShelfDb: -5 })).toThrow('lowShelfDb must be between -4 and 4.');
    expect(() => validatePreferences({ ...defaultPreferences(), version: 2 })).toThrow('These preferences were saved by a newer studio.');
    expect(() => validatePreferences({ ...defaultPreferences(), schema: 'x' })).toThrow('Unknown preferences schema.');
  });

  test('reference targets and preference adjustments stay separate and either can be switched off', () => {
    let proposal = editBand(defaultChain(), 'left', 8, { enabled: true, type: 'bell', frequency: 8000, gain: 3, q: Math.SQRT2 });
    proposal = validateChain({ ...proposal, limiter: { ...proposal.limiter, inputGain: 4 } });
    const mine = { ...defaultPreferences(), lowShelfDb: -1.5, highShelfDb: 2 };
    const both = composeChain(proposal, mine, { strength: 50 });
    expect(both.eq.left[8].gain).toBe(1.5); // reference target at 50 %
    expect(both.limiter.inputGain).toBe(2);
    expect(both.eq.left[22]).toEqual({ enabled: true, type: 'low-shelf', frequency: 120, q: 0.707, gain: -1.5 }); // preference at full value
    expect(both.eq.right[23]).toEqual({ enabled: true, type: 'high-shelf', frequency: 8000, q: 0.707, gain: 2 });
    expect(composeChain(proposal, mine, { strength: 50, usePreferences: false })).toEqual(atStrength(proposal, 0.5));
    const preferencesOnly = composeChain(proposal, mine, { strength: 50, useReference: false });
    expect(preferencesOnly.eq.left.filter(band => band.enabled)).toHaveLength(2);
    expect(preferencesOnly.limiter).toEqual(defaultChain().limiter);
    expect(composeChain(proposal, defaultPreferences(), { strength: 100 })).toEqual(proposal); // neutral preferences change nothing
  });
});
