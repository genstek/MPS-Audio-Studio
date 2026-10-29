import { afterEach, expect, test, vi } from 'vitest';
import { createAudioEngine } from '../../src/audio-engine.js';

function setup() {
  const sources = [];
  const context = {
    currentTime: 0,
    state: 'running',
    destination: {},
    decodeAudioData: vi.fn().mockResolvedValue({ duration: 10, numberOfChannels: 1, sampleRate: 44100 }),
    resume: vi.fn().mockResolvedValue(),
    suspend: vi.fn().mockResolvedValue(),
    close: vi.fn().mockResolvedValue(),
    createBufferSource() {
      const source = { connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn() };
      sources.push(source);
      return source;
    },
  };
  vi.stubGlobal('AudioContext', vi.fn(function () { return context; }));
  const onEnded = vi.fn();
  const engine = createAudioEngine(onEnded);
  const file = { name: 'tone.wav', size: 44, arrayBuffer: async () => new TextEncoder().encode('RIFF0000WAVE').buffer };
  return { engine, context, sources, onEnded, file };
}

afterEach(() => vi.unstubAllGlobals());

test('pause preserves the offset, stop resets it, and dispose closes the context', async () => {
  const { engine, context, sources, file } = setup();
  await expect(engine.load(file)).resolves.toEqual({ duration: 10, channels: 1, sampleRate: 44100 });
  await engine.play();
  context.currentTime = 3;
  engine.pause();
  expect(sources[0].stop).toHaveBeenCalledOnce();
  expect(sources[0].disconnect).toHaveBeenCalledOnce();
  expect(sources[0].onended).toBeNull();
  await engine.play();
  expect(sources[1].start).toHaveBeenCalledWith(0, 3);
  engine.stop();
  await engine.play();
  expect(sources[2].start).toHaveBeenCalledWith(0, 0);
  engine.dispose();
  expect(sources[2].disconnect).toHaveBeenCalledOnce();
  expect(context.close).toHaveBeenCalledOnce();
});

test('decode failure preserves the previously loaded track', async () => {
  const { engine, context, sources, file } = setup();
  await engine.load(file);
  await engine.play();
  context.decodeAudioData.mockRejectedValueOnce(new Error('Decode failed'));
  await expect(engine.load(file)).rejects.toThrow('Unable to decode');
  expect(sources[0].stop).not.toHaveBeenCalled();
  engine.stop();
  await engine.play();
  expect(sources[1].buffer.duration).toBe(10);
  engine.dispose();
});

test('natural end disconnects the source and permits playback from the start', async () => {
  const { engine, sources, file, onEnded } = setup();
  await engine.load(file);
  await engine.play();
  sources[0].onended();
  expect(onEnded).toHaveBeenCalledOnce();
  expect(sources[0].disconnect).toHaveBeenCalledOnce();
  await engine.play();
  expect(sources[1].start).toHaveBeenCalledWith(0, 0);
  engine.dispose();
});

test('unsupported names, oversized files and invalid headers are rejected', async () => {
  const { engine, file, context } = setup();
  await expect(engine.load({ ...file, name: 'song.mp3' })).rejects.toThrow('Choose a WAV');
  await expect(engine.load({ ...file, size: 101 * 1024 * 1024 })).rejects.toThrow('100 MiB');
  await expect(engine.load({ ...file, arrayBuffer: async () => new ArrayBuffer(12) })).rejects.toThrow('not a valid WAV');
  expect(context.decodeAudioData).not.toHaveBeenCalled();
  engine.dispose();
});

// LAS-8: import lifecycle.
const decoded = (duration) => ({ duration, numberOfChannels: 1, sampleRate: 44100 });

test('a newer import wins over a slower earlier one', async () => {
  const { engine, context, sources, file } = setup();
  let finishFirst;
  context.decodeAudioData
    .mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
    .mockResolvedValueOnce(decoded(5));
  const first = engine.load(file);
  // Start the second import only once the first one is decoding.
  await vi.waitFor(() => expect(finishFirst).toBeTypeOf('function'));
  const second = engine.load({ ...file, name: 'second.wav' });
  await expect(second).resolves.toMatchObject({ duration: 5 });
  finishFirst(decoded(10));
  await expect(first).rejects.toMatchObject({ name: 'SupersededError' });
  await engine.play();
  expect(sources).toHaveLength(1);
  expect(sources[0].buffer.duration).toBe(5);
  engine.dispose();
});

test('disposing during an import discards it without creating an audio context', async () => {
  const { engine, file } = setup();
  let release;
  const pending = engine.load({ ...file, arrayBuffer: () => new Promise(resolve => { release = resolve; }) });
  engine.dispose();
  release(new TextEncoder().encode('RIFF0000WAVE').buffer);
  await expect(pending).rejects.toMatchObject({ name: 'SupersededError' });
  expect(AudioContext).not.toHaveBeenCalled();
});

test('replacing a playing track stops and disconnects its source before the next play', async () => {
  const { engine, sources, file } = setup();
  await engine.load(file);
  await engine.play();
  await engine.load({ ...file, name: 'next.wav' });
  expect(sources[0].stop).toHaveBeenCalledOnce();
  expect(sources[0].disconnect).toHaveBeenCalledOnce();
  expect(sources[0].onended).toBeNull();
  await engine.play();
  expect(sources).toHaveLength(2);
  expect(sources[1].start).toHaveBeenCalledWith(0, 0);
  engine.dispose();
});

test('100 MiB is the largest accepted file size', async () => {
  const { engine, file } = setup();
  const limit = 100 * 1024 * 1024;
  await expect(engine.load({ ...file, size: limit })).resolves.toMatchObject({ duration: 10 });
  await expect(engine.load({ ...file, size: limit + 1 })).rejects.toThrow('100 MiB');
  engine.dispose();
});

test('files without a RIFF/WAVE header are rejected before decoding; the extension is case-insensitive', async () => {
  const { engine, file, context } = setup();
  for (const header of ['RIFF0000AVI ', 'RIFX0000WAVE', 'RIF', '']) {
    const bytes = new TextEncoder().encode(header).buffer;
    await expect(engine.load({ ...file, arrayBuffer: async () => bytes }), header).rejects.toThrow('not a valid WAV');
  }
  expect(context.decodeAudioData).not.toHaveBeenCalled();
  await expect(engine.load({ ...file, name: 'TONE.WAV' })).resolves.toMatchObject({ duration: 10 });
  engine.dispose();
});

test('a failed first import leaves nothing to play', async () => {
  const { engine, context, sources, file } = setup();
  context.decodeAudioData.mockRejectedValueOnce(new Error('Decode failed'));
  await expect(engine.load(file)).rejects.toThrow('Unable to decode');
  await engine.play();
  expect(sources).toHaveLength(0);
  engine.dispose();
});

// LAS-9: elapsed position comes from the audio clock.
test('position follows the audio clock, freezes on pause and resets on stop and natural end', async () => {
  const { engine, context, sources, file } = setup();
  expect(engine.position()).toBe(0);
  await engine.load(file);
  context.currentTime = 2;
  await engine.play();
  context.currentTime = 3.5;
  expect(engine.position()).toBe(1.5);
  engine.pause();
  context.currentTime = 9;
  expect(engine.position()).toBe(1.5);
  await engine.play();
  expect(sources[1].start).toHaveBeenCalledWith(0, 1.5);
  context.currentTime = 10;
  expect(engine.position()).toBe(2.5);
  context.currentTime = 30;
  expect(engine.position()).toBe(10); // never past the decoded duration
  engine.stop();
  expect(engine.position()).toBe(0);
  await engine.play();
  context.currentTime = 31;
  sources[2].onended();
  expect(engine.position()).toBe(0);
  engine.dispose();
});

// LAS-11: one start at a time; pause, stop or a new track cancels a start that is still waiting.
function holdResume(context) {
  let release;
  context.resume.mockImplementationOnce(() => new Promise(resolve => { release = resolve; }));
  return () => release();
}

test('a second Play while the first is starting does not add a source', async () => {
  const { engine, context, sources, file } = setup();
  await engine.load(file);
  const release = holdResume(context);
  const first = engine.play();
  await expect(engine.play()).resolves.toBe(false);
  release();
  await expect(first).resolves.toBe(true);
  await expect(engine.play()).resolves.toBe(false); // already playing
  expect(sources).toHaveLength(1);
  engine.dispose();
});

test('stop, pause or a new track while the context resumes cancels the start', async () => {
  for (const cancel of ['stop', 'pause', 'load']) {
    const { engine, context, sources, file } = setup();
    await engine.load(file);
    const release = holdResume(context);
    const start = engine.play();
    if (cancel === 'load') await engine.load({ ...file, name: 'next.wav' });
    else engine[cancel]();
    release();
    await expect(start, cancel).resolves.toBe(false);
    expect(sources, cancel).toHaveLength(0);
    await expect(engine.play(), `${cancel}: Play works afterwards`).resolves.toBe(true);
    expect(sources[0].start, cancel).toHaveBeenCalledWith(0, 0);
    engine.dispose();
  }
});

test('a failed resume can be retried', async () => {
  const { engine, context, sources, file } = setup();
  await engine.load(file);
  context.resume.mockRejectedValueOnce(new Error('Not allowed'));
  await expect(engine.play()).rejects.toThrow('Not allowed');
  await expect(engine.play()).resolves.toBe(true);
  expect(sources).toHaveLength(1);
  engine.dispose();
});

// LAS-12: unload removes the track but keeps the engine usable.
test('unload stops playback, forgets the track and keeps the engine for the next import', async () => {
  const { engine, context, sources, file } = setup();
  await engine.load(file);
  await engine.play();
  context.currentTime = 4;
  engine.unload();
  expect(sources[0].stop).toHaveBeenCalledOnce();
  expect(sources[0].disconnect).toHaveBeenCalledOnce();
  expect(sources[0].onended).toBeNull();
  expect(engine.position()).toBe(0);
  await expect(engine.play()).resolves.toBe(false);
  expect(sources).toHaveLength(1);
  expect(context.suspend).toHaveBeenCalledOnce();
  expect(context.close).not.toHaveBeenCalled();
  await engine.load(file);
  await expect(engine.play()).resolves.toBe(true);
  expect(sources[1].start).toHaveBeenCalledWith(0, 0);
  engine.dispose();
});

test('unload cancels an import in progress and a start waiting for the context', async () => {
  const { engine, context, sources, file } = setup();
  let finishDecode;
  context.decodeAudioData.mockImplementationOnce(() => new Promise(resolve => { finishDecode = resolve; }));
  const pending = engine.load(file);
  await vi.waitFor(() => expect(finishDecode).toBeTypeOf('function'));
  engine.unload();
  finishDecode(decoded(10));
  await expect(pending).rejects.toMatchObject({ name: 'SupersededError' });
  await expect(engine.play()).resolves.toBe(false);

  await engine.load(file);
  const release = holdResume(context);
  const start = engine.play();
  engine.unload();
  release();
  await expect(start).resolves.toBe(false);
  expect(sources).toHaveLength(0);
  engine.dispose();
});
