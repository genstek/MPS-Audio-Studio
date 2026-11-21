import { ChainParamsError, validateChain } from './dsp/chain-params.js';
import { StemWidthError, validateStemWidth } from './dsp/stem-width.js';

// Project files (LAS-60 / LAS-69): versioned JSON, schema mps-project v1.
//
// Media policy: a project file is a MANIFEST. It stores every setting (chain with Space, stem
// strips and their chains, the Original/Processed choice, editor window layout) and the identity of
// each audio file — name, size in bytes, SHA-256, and decoded duration/rate/channels — but never the
// audio itself. A browser cannot reopen arbitrary local paths later, so opening a project asks the
// user to choose each file again (relink); a file whose SHA-256 differs is refused, so a project is
// never silently completed with the wrong audio. Nothing is uploaded.
//
// Not stored (by design): Master Level (a listening preference of this browser, LAS-68), the playback
// position, analysis and comparison results, proposals in progress, undo history.
export const PROJECT_SCHEMA = 'mps-project';
export const PROJECT_VERSION = 1;
export const PROJECT_FILE_LIMIT = 5 * 1024 * 1024; // project files hold settings only
export const PROJECT_EXTENSION = '.mps-project.json';
const WINDOWS = ['eq', 'dynamics', 'limiter', 'space'];

export class ProjectFileError extends Error {}

const SHA = /^[0-9a-f]{64}$/;
const isNumber = v => typeof v === 'number' && Number.isFinite(v);

// A project name as typed: trimmed, without control characters, at most 100 characters.
export function cleanProjectName(value) {
  return [...String(value ?? '')].filter(ch => ch >= ' ' && ch !== '\u007f').join('').trim().slice(0, 100);
}
export const fileNameFor = name => `${(cleanProjectName(name) || 'Untitled project').replace(/[\\/:*?"<>|]+/g, '-')}${PROJECT_EXTENSION}`;

function media(entry, where) {
  if (!entry || typeof entry !== 'object') throw new ProjectFileError(`${where} is missing.`);
  if (typeof entry.name !== 'string' || !entry.name) throw new ProjectFileError(`${where} has no file name.`);
  if (!isNumber(entry.size) || entry.size < 0) throw new ProjectFileError(`${where} has no valid size.`);
  if (typeof entry.sha256 !== 'string' || !SHA.test(entry.sha256)) throw new ProjectFileError(`${where} has no valid SHA-256 checksum.`);
  return { name: entry.name.slice(0, 200), size: entry.size, sha256: entry.sha256, duration: isNumber(entry.duration) ? entry.duration : null, sampleRate: isNumber(entry.sampleRate) ? entry.sampleRate : null, channels: isNumber(entry.channels) ? entry.channels : null };
}

function stem(entry, i) {
  const base = media(entry, `Stem ${i + 1}`);
  for (const key of ['offset', 'gainDb', 'pan']) if (!isNumber(entry[key])) throw new ProjectFileError(`Stem ${i + 1}: ${key} must be a number.`);
  if (entry.offset < 0 || entry.offset > 600 || entry.gainDb < -24 || entry.gainDb > 12 || entry.pan < -1 || entry.pan > 1) throw new ProjectFileError(`Stem ${i + 1} has an offset, gain or pan outside the supported range.`);
  return { ...base, offset: entry.offset, gainDb: entry.gainDb, pan: entry.pan, mute: Boolean(entry.mute), solo: Boolean(entry.solo), chainLabel: String(entry.chainLabel ?? 'from project'), chain: validateChain(entry.chain), width: validateStemWidth(entry.width) };
}

function windows(layout) {
  const out = {};
  for (const name of WINDOWS) {
    const w = layout?.[name];
    if (!w) continue;
    if (!isNumber(w.x) || !isNumber(w.y)) throw new ProjectFileError(`The ${name} window position is invalid.`);
    out[name] = { open: Boolean(w.open), x: Math.round(w.x), y: Math.round(w.y) };
  }
  return out;
}

// Validates a parsed project and returns a clean copy. Throws ProjectFileError with a reason.
export function validateProject(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new ProjectFileError('The file is not an MPS project.');
  if (input.schema !== PROJECT_SCHEMA) throw new ProjectFileError('The file is not an MPS project.');
  if (!Number.isInteger(input.version) || input.version < 1) throw new ProjectFileError('The project has no valid version.');
  if (input.version > PROJECT_VERSION) throw new ProjectFileError(`This project was saved by a newer studio (${PROJECT_SCHEMA} v${input.version}); update the studio to open it.`);
  const project = input.project;
  if (!project || typeof project.id !== 'string' || !project.id) throw new ProjectFileError('The project has no identity.');
  const name = cleanProjectName(project.name);
  if (!name) throw new ProjectFileError('The project has no name.');
  try {
    return {
      schema: PROJECT_SCHEMA,
      version: PROJECT_VERSION,
      project: { id: project.id.slice(0, 64), name, createdAt: String(project.createdAt ?? ''), savedAt: String(project.savedAt ?? '') },
      media: {
        policy: 'manifest',
        track: input.media?.track ? media(input.media.track, 'The track') : null,
        stems: Array.isArray(input.media?.stems) ? input.media.stems.map(stem) : [],
      },
      chain: validateChain(input.chain),
      player: { listening: input.player?.listening === 'original' ? 'original' : 'processed' },
      layout: { windows: windows(input.layout?.windows) },
    };
  } catch (failure) {
    if (failure instanceof StemWidthError) throw new ProjectFileError(`The project's stem width settings are invalid: ${failure.message}`);
    if (failure instanceof ChainParamsError) throw new ProjectFileError(`The project's settings are invalid: ${failure.message}`);
    throw failure;
  }
}

export function serializeProject(project) {
  return `${JSON.stringify(validateProject(project), null, 2)}\n`;
}

export function parseProject(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new ProjectFileError('The file is not valid JSON.');
  }
  return validateProject(parsed);
}

// Identity of a loaded audio file for "Unsaved changes", without hashing it on every change: a
// token per File object, or the saved SHA-256 once a relink has verified the file against a project.
// Replacing the track with another file therefore counts as a change even when the name and size
// are the same.
const identities = new WeakMap();
let nextIdentity = 0;
export function mediaIdentity(file) {
  if (!identities.has(file)) identities.set(file, `file-${++nextIdentity}`);
  return identities.get(file);
}
export function adoptMediaIdentity(file, sha256) {
  identities.set(file, `sha256-${sha256}`);
}
export const savedMediaIdentity = sha256 => `sha256-${sha256}`;

// The part of a project that "Unsaved changes" compares (no save time, no checksums: those are only
// computed when saving). Two states with the same key need no save.
export function projectKey({ project, track, stems, chain, listening, windowLayout }) {
  return JSON.stringify({
    id: project?.id ?? null, name: project?.name ?? null,
    track: track ? [track.name, track.size, track.identity ?? null] : null,
    stems: (stems ?? []).map(s => [s.name, s.sha256, s.offset, s.gainDb, s.pan, s.mute, s.solo, s.chainLabel, s.params, s.width ?? null]),
    chain, listening,
    windows: Object.fromEntries(Object.entries(windowLayout ?? {}).map(([k, w]) => [k, [Boolean(w.open), w.position?.x ?? null, w.position?.y ?? null]])),
  });
}

// SHA-256 of a File/Blob as hex (Web Crypto; the bytes stay on this device).
export async function sha256Hex(file) {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', await file.arrayBuffer()));
  return Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
}
