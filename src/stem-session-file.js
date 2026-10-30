import { ChainParamsError, validateChain } from './dsp/chain-params.js';

// Stem session files (LAS-35): the settings of a stem session for recall, versioned JSON
// (schema mps-stem-session v1). Stems are identified by the SHA-256 of their files, so settings are
// applied only to the exact stems they were made for; the audio itself is never stored in the file.
export const STEM_SESSION_SCHEMA = 'mps-stem-session';
export const STEM_SESSION_VERSION = 1;

export class StemSessionFileError extends Error {}

const STRIP_FIELDS = ['offset', 'gainDb', 'pan'];

export function serializeStemSession(stems, master) {
  return `${JSON.stringify({
    schema: STEM_SESSION_SCHEMA,
    version: STEM_SESSION_VERSION,
    master: validateChain(master),
    stems: stems.map(s => ({ name: s.name, sha256: s.sha256, offset: s.offset, gainDb: s.gainDb, pan: s.pan, mute: s.mute, solo: s.solo, chainLabel: s.chainLabel, chain: validateChain(s.params) })),
  }, null, 2)}\n`;
}

export function parseStemSession(text) {
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new StemSessionFileError('The file is not valid JSON.'); }
  if (!parsed || parsed.schema !== STEM_SESSION_SCHEMA) throw new StemSessionFileError('The file is not an MPS stem session.');
  if (parsed.version > STEM_SESSION_VERSION) throw new StemSessionFileError(`This session was saved by a newer studio (${STEM_SESSION_SCHEMA} v${parsed.version}); update the studio to open it.`);
  if (parsed.version !== STEM_SESSION_VERSION || !Array.isArray(parsed.stems)) throw new StemSessionFileError('The stem session has no valid version or stem list.');
  try {
    const master = validateChain(parsed.master);
    const stems = parsed.stems.map((s, i) => {
      if (typeof s.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(s.sha256)) throw new StemSessionFileError(`Stem ${i + 1} has no valid checksum.`);
      for (const key of STRIP_FIELDS) if (typeof s[key] !== 'number' || !Number.isFinite(s[key])) throw new StemSessionFileError(`Stem ${i + 1}: ${key} must be a number.`);
      if (s.offset < 0 || s.offset > 600 || s.gainDb < -24 || s.gainDb > 12 || s.pan < -1 || s.pan > 1) throw new StemSessionFileError(`Stem ${i + 1} has an offset, gain or pan outside the supported range.`);
      return { name: String(s.name ?? `Stem ${i + 1}`), sha256: s.sha256, offset: s.offset, gainDb: s.gainDb, pan: s.pan, mute: Boolean(s.mute), solo: Boolean(s.solo), chainLabel: String(s.chainLabel ?? 'from session file'), chain: validateChain(s.chain) };
    });
    return { master, stems };
  } catch (failure) {
    if (failure instanceof ChainParamsError) throw new StemSessionFileError(`The session's settings are invalid: ${failure.message}`);
    throw failure;
  }
}

// Pairs saved stems with loaded ones by checksum: { matched: [{ loadedId, saved }], missing: [names] }.
export function matchStems(saved, loaded) {
  const matched = [];
  const missing = [];
  for (const entry of saved) {
    const stem = loaded.find(l => l.sha256 === entry.sha256);
    if (stem) matched.push({ loadedId: stem.id, saved: entry });
    else missing.push(entry.name);
  }
  return { matched, missing };
}
