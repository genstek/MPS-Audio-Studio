import { expect, test } from 'vitest';
import { SPACE_PRESETS, defaultChain, editBand, serializeChain, validateChain } from '../../src/dsp/chain-params.js';
import { applyModulePreset, modulePresetFileName, serializeModulePreset } from '../../src/module-presets.js';

// LAS-69 section presets: one module per file; loading changes only that module.
test('a section preset round-trips its module and changes nothing else', () => {
  const source = validateChain({ ...defaultChain(), space: { enabled: true, ...SPACE_PRESETS.Hall }, compressor: { ...defaultChain().compressor, enabled: true, ratio: 4 } });
  const text = serializeModulePreset(source, 'space');
  expect(JSON.parse(text)).toEqual({ schema: 'mps-module-preset', version: 1, module: 'space', settings: source.space });
  let target = editBand(defaultChain(), 'left', 3, { enabled: true, gain: 4 });
  target = validateChain({ ...target, limiter: { ...target.limiter, ceiling: -2 } });
  const applied = applyModulePreset(text, target, 'space');
  expect(applied.space).toEqual(source.space);
  expect(applied.eq).toEqual(target.eq);
  expect(applied.limiter).toEqual(target.limiter);
  expect(applied.compressor).toEqual(target.compressor); // not the source's compressor
  expect(modulePresetFileName('compressor')).toBe('dynamics-preset.mps-module.json');
});

test('wrong module, whole-chain files, projects, invalid and newer presets are refused with a reason', () => {
  const p = defaultChain();
  const eqText = serializeModulePreset(p, 'eq');
  expect(() => applyModulePreset(eqText, p, 'limiter')).toThrow('This preset is for EQ; load it in the EQ editor.');
  expect(() => applyModulePreset(serializeChain(p), p, 'eq')).toThrow('whole-chain settings file');
  expect(() => applyModulePreset(JSON.stringify({ schema: 'mps-project' }), p, 'eq')).toThrow('project file');
  expect(() => applyModulePreset('{', p, 'eq')).toThrow('not valid JSON');
  const bad = JSON.parse(serializeModulePreset(p, 'limiter'));
  bad.settings.ceiling = 5;
  expect(() => applyModulePreset(JSON.stringify(bad), p, 'limiter')).toThrow("The preset's settings are invalid");
  expect(() => applyModulePreset(JSON.stringify({ ...bad, version: 2 }), p, 'limiter')).toThrow('newer studio');
});
