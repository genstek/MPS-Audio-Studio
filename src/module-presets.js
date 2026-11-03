import { ChainParamsError, validateChain } from './dsp/chain-params.js';

// Section presets (LAS-69): one processor's settings in a file (schema mps-module-preset v1), saved
// and loaded from that processor's editor. Loading changes only that module, as one undo step; the
// other modules, the project and the audio are untouched. Different from:
//   - a settings file / account preset (LAS-28/33): the whole chain,
//   - a project (LAS-69): the whole session,
//   - Export WAV: rendered audio.
export const MODULE_PRESET_SCHEMA = 'mps-module-preset';
export const MODULE_PRESET_VERSION = 1;
export const MODULE_PRESET_LIMIT = 1024 * 1024;
export const MODULES = { eq: 'EQ', compressor: 'Dynamics', space: 'Space', limiter: 'Limiter' };

export class ModulePresetError extends Error {}

export function serializeModulePreset(params, module) {
  if (!MODULES[module]) throw new ModulePresetError(`Unknown module ${module}.`);
  const valid = validateChain(params);
  return `${JSON.stringify({ schema: MODULE_PRESET_SCHEMA, version: MODULE_PRESET_VERSION, module, settings: valid[module] }, null, 2)}\n`;
}

export const modulePresetFileName = module => `${MODULES[module].toLowerCase()}-preset.mps-module.json`;

// Returns the chain with only `module` replaced by the file's settings. Refuses (with a reason, and
// without changing anything) another module's preset, other files and invalid or newer versions.
export function applyModulePreset(text, params, module) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ModulePresetError('The file is not valid JSON.');
  }
  if (parsed?.schema === 'mps-chain' || parsed?.schema === 'mps-preset') throw new ModulePresetError('This is a whole-chain settings file or preset; load it from Settings… (it changes every module).');
  if (parsed?.schema === 'mps-project') throw new ModulePresetError('This is a project file; open it with Project → Open project….');
  if (parsed?.schema !== MODULE_PRESET_SCHEMA) throw new ModulePresetError('The file is not an MPS section preset.');
  if (!Number.isInteger(parsed.version) || parsed.version < 1) throw new ModulePresetError('The preset has no valid version.');
  if (parsed.version > MODULE_PRESET_VERSION) throw new ModulePresetError(`This preset was saved by a newer studio (${MODULE_PRESET_SCHEMA} v${parsed.version}).`);
  if (parsed.module !== module) throw new ModulePresetError(`This preset is for ${MODULES[parsed.module] ?? 'another module'}; load it in the ${MODULES[parsed.module] ?? 'matching'} editor.`);
  try {
    return validateChain({ ...params, [module]: parsed.settings });
  } catch (failure) {
    if (failure instanceof ChainParamsError) throw new ModulePresetError(`The preset's settings are invalid: ${failure.message}`);
    throw failure;
  }
}
