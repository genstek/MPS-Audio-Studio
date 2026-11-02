import { describe, expect, test } from 'vitest';
import { defaultChain, serializeChain, validateChain } from '../../src/dsp/chain-params.js';
import { PROJECT_FILE_LIMIT, ProjectFileError, cleanProjectName, fileNameFor, parseProject, projectKey, serializeProject, sha256Hex } from '../../src/project.js';

// LAS-60/69: project files are versioned manifests: settings plus media identity, never audio.
const SHA = 'a'.repeat(64);
function sample() {
  const chain = validateChain({ ...defaultChain(), space: { enabled: true, mix: 25, preDelay: 15, decay: 1.2, damping: 30 } });
  return {
    schema: 'mps-project', version: 1,
    project: { id: 'p-1', name: 'Album master', createdAt: '2026-11-02T10:00:00.000Z', savedAt: '2026-11-02T11:00:00.000Z' },
    media: {
      policy: 'manifest',
      track: { name: 'mix.wav', size: 1234, sha256: SHA, duration: 12.5, sampleRate: 48000, channels: 2 },
      stems: [{ name: 'bass.wav', size: 99, sha256: 'b'.repeat(64), duration: 3, sampleRate: 44100, channels: 1, offset: 0.25, gainDb: -3, pan: -0.5, mute: false, solo: true, chainLabel: 'copy of master settings', chain }],
    },
    chain,
    player: { listening: 'original' },
    layout: { windows: { eq: { open: true, x: 120, y: 200 }, space: { open: false, x: 40, y: 80 } } },
  };
}

describe('LAS-69 project files', () => {
  test('save → open round trip keeps every value; the text is stable', () => {
    const text = serializeProject(sample());
    expect(serializeProject(parseProject(text))).toBe(text);
    expect(parseProject(text)).toEqual(sample());
    expect(JSON.parse(text).media.policy).toBe('manifest');
    expect(text).not.toMatch(/"(data|audio|samples)"/); // no audio inside
  });

  test('older chain settings inside a project are migrated (Space off); newer, corrupt and foreign files are refused', () => {
    const old = sample();
    const { space, ...v1 } = { ...JSON.parse(serializeChain(defaultChain())), version: 1, order: ['eq', 'compressor', 'limiter'] }; // eslint-disable-line no-unused-vars
    old.chain = v1;
    expect(parseProject(JSON.stringify(old)).chain.space.enabled).toBe(false);
    const refuse = (value, message) => expect(() => parseProject(typeof value === 'string' ? value : JSON.stringify(value))).toThrow(message);
    refuse('{not json', 'not valid JSON');
    refuse({ ...sample(), schema: 'mps-chain' }, 'not an MPS project');
    refuse({ ...sample(), version: 2 }, 'newer studio');
    refuse({ ...sample(), project: { id: 'x', name: '   ' } }, 'no name');
    refuse({ ...sample(), media: { track: { ...sample().media.track, sha256: 'xyz' } } }, 'SHA-256');
    refuse({ ...sample(), chain: { ...sample().chain, limiter: { ...sample().chain.limiter, ceiling: 3 } } }, "The project's settings are invalid");
    refuse({ ...sample(), layout: { windows: { eq: { open: true, x: 'left', y: 0 } } } }, 'window position');
    expect(() => parseProject('{}')).toThrow(ProjectFileError);
    expect(PROJECT_FILE_LIMIT).toBe(5 * 1024 * 1024);
  });

  test('names are cleaned for display and file names', () => {
    expect(cleanProjectName('  Album\u0007 master  ')).toBe('Album master');
    expect(cleanProjectName('\t ')).toBe('');
    expect(fileNameFor('Live / mix: v2?')).toBe('Live - mix- v2-.mps-project.json');
    expect(fileNameFor('')).toBe('Untitled project.mps-project.json');
  });

  test('the "unsaved changes" key changes with settings, media, listening and layout, not with time', () => {
    const base = { project: { id: 'p', name: 'A' }, track: { name: 't.wav', size: 1 }, stems: [], chain: defaultChain(), listening: 'processed', windowLayout: { eq: { open: true, position: { x: 1, y: 2 } } } };
    const key = projectKey(base);
    expect(projectKey({ ...base })).toBe(key);
    expect(projectKey({ ...base, listening: 'original' })).not.toBe(key);
    expect(projectKey({ ...base, chain: { ...base.chain, limiter: { ...base.chain.limiter, ceiling: -2 } } })).not.toBe(key);
    expect(projectKey({ ...base, windowLayout: { eq: { open: true, position: { x: 9, y: 2 } } } })).not.toBe(key);
    expect(projectKey({ ...base, project: { id: 'p', name: 'B' } })).not.toBe(key);
  });

  test('SHA-256 of a file is computed locally (known vector)', async () => {
    expect(await sha256Hex(new Blob(['abc']))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});
