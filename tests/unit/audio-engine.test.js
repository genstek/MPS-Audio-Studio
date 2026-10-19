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
