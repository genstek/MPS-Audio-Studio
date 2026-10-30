import { defaultChain } from './dsp/chain-params.js';
import { createOutputStage } from './output-stage.js';

// One engine owns the audio context, the current source and the output stage (mastering chain
// and original/processed switch, LAS-28), outside React state. createOutput can be replaced in
// unit tests.
export function createAudioEngine(onEnded, { createOutput = createOutputStage } = {}) {
  let context;
  let buffer;
  let source;
  // The output stage is built for the track's channel count and reused for every play.
  let output = null;
  let chainParams = defaultChain();
  let listening = 'processed';
  let match = { processedDb: 0, originalDb: 0 };
  const meterListeners = new Set();
  let offset = 0;
  let startedAt = 0;
  // Every import gets a number. Only the newest one may replace the track, so a slow
  // earlier import, or one still running when the engine is disposed, is discarded.
  let latestLoad = 0;
  // A start that is waiting for the audio context to resume. Only one may wait at a time, and
  // pause, stop, a new track or disposal cancels it, so repeated gestures never add a source.
  let pendingStart = null;

  function superseded() {
    const error = new Error('A newer import replaced this one.');
    error.name = 'SupersededError';
    return error;
  }

  function disconnect() {
    pendingStart = null;
    if (!source) return;
    source.onended = null;
    source.stop();
    source.disconnect();
    source = null;
  }

  // Seconds into the track, read from the audio clock while playing (LAS-9).
  function position() {
    if (!buffer) return 0;
    if (!source) return offset;
    return Math.min(offset + context.currentTime - startedAt, buffer.duration);
  }

  return {
    async load(file) {
      const load = ++latestLoad;
      if (!/\.wav$/i.test(file.name)) throw new Error('Choose a WAV file.');
      if (file.size > 100 * 1024 * 1024) throw new Error('Choose a WAV smaller than 100 MiB.');
      const bytes = await file.arrayBuffer();
      if (load !== latestLoad) throw superseded();
      // Compare raw bytes: the four size bytes between the tags are a number, not text, and
      // decoding them as UTF-8 could merge them into fewer characters and shift 'WAVE'.
      const header = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength));
      const tag = (from, to) => String.fromCharCode(...header.subarray(from, to));
      if (tag(0, 4) !== 'RIFF' || tag(8, 12) !== 'WAVE') {
        throw new Error('This file is not a valid WAV. Choose another file.');
      }
      context ??= new AudioContext();
      let decoded;
      try {
        decoded = await context.decodeAudioData(bytes);
      } catch {
        if (load !== latestLoad) throw superseded();
        throw new Error('Unable to decode this WAV. Try another WAV file.');
      }
      if (load !== latestLoad) throw superseded();
      // The chain is mono or stereo; files with more channels play as a stereo downmix.
      const channels = Math.min(2, decoded.numberOfChannels);
      let stage = output;
      if (!stage || stage.channelCount !== channels) {
        try {
          stage = await createOutput(context, channels, chainParams);
        } catch {
          if (load !== latestLoad) throw superseded();
          throw new Error('Audio processing could not start. Reload the page and try again.');
        }
        if (load !== latestLoad) {
          stage.dispose();
          throw superseded();
        }
      }
      // Keep the previous track intact until replacement decoding succeeds.
      disconnect();
      buffer = decoded;
      offset = 0;
      if (stage !== output) {
        output?.dispose();
        output = stage;
        output.onMeters(meters => meterListeners.forEach(listener => listener(meters)));
        output.setListening(listening, match);
      }
      return { duration: buffer.duration, channels: buffer.numberOfChannels, sampleRate: buffer.sampleRate };
    },
    // Resolves true when a source started, false when nothing started (no track, already
    // playing, another start pending, or cancelled while the context resumed).
    async play() {
      if (!buffer || source || pendingStart) return false;
      const start = {};
      pendingStart = start;
      try {
        await context.resume();
      } catch (error) {
        if (pendingStart === start) pendingStart = null;
        throw error;
      }
      if (pendingStart !== start) return false;
      pendingStart = null;
      source = context.createBufferSource();
      source.buffer = buffer;
      for (const input of output.inputs) source.connect(input);
      source.onended = () => {
        source.disconnect();
        source = null;
        offset = 0;
        onEnded();
      };
      startedAt = context.currentTime;
      source.start(0, offset);
      return true;
    },
    pause() {
      if (source) offset = position();
      disconnect();
    },
    position,
    stop() {
      disconnect();
      offset = 0;
    },
    // Removes the track but keeps the engine for the next import, unlike dispose() (LAS-12).
    unload() {
      latestLoad++; // an import still running cannot bring the removed audio back
      disconnect();
      buffer = null;
      offset = 0;
      // Nothing is left to play, so the audio device may idle until the next Play resumes it.
      if (context && context.state === 'running') void context.suspend();
    },
    dispose() {
      latestLoad++;
      disconnect();
      output?.dispose();
      output = null;
      meterListeners.clear();
      if (context && context.state !== 'closed') void context.close();
    },
    // Mastering chain settings (validated schema, LAS-27). Resolves with sample-rate warnings, or
    // rejects with the reason the settings were refused. Kept for the next output stage.
    async setChain(params) {
      chainParams = params;
      return output ? output.setParams(params) : [];
    },
    // A/B: 'processed' or 'original'. The same source keeps playing; only the audible path changes.
    listen(next) {
      listening = next;
      output?.setListening(listening, match);
    },
    // Loudness matching gains in dB (each ≤ 0), or null for none.
    setLoudnessMatch(next) {
      match = next ?? { processedDb: 0, originalDb: 0 };
      output?.setListening(listening, match);
    },
    onMeters(listener) {
      meterListeners.add(listener);
      return () => meterListeners.delete(listener);
    },
    analyser: () => output?.analyser ?? null,
    latency: () => output?.latency ?? 0,
    sampleRate: () => context?.sampleRate ?? null,
  };
}
