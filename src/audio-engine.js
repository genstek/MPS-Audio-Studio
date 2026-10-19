// One engine owns the audio context and the current source, outside React state.
export function createAudioEngine(onEnded) {
  let context;
  let buffer;
  let source;
  let offset = 0;
  let startedAt = 0;

  function disconnect() {
    if (!source) return;
    source.onended = null;
    source.stop();
    source.disconnect();
    source = null;
  }

  return {
    async load(file) {
      if (!/\.wav$/i.test(file.name)) throw new Error('Choose a WAV file.');
      if (file.size > 100 * 1024 * 1024) throw new Error('Choose a WAV smaller than 100 MiB.');
      const bytes = await file.arrayBuffer();
      const header = new TextDecoder().decode(bytes.slice(0, 12));
      if (header.slice(0, 4) !== 'RIFF' || header.slice(8, 12) !== 'WAVE') {
        throw new Error('This file is not a valid WAV. Choose another file.');
      }
      context ??= new AudioContext();
      let decoded;
      try {
        decoded = await context.decodeAudioData(bytes);
      } catch {
        throw new Error('Unable to decode this WAV. Try another WAV file.');
      }
      // Keep the previous track intact until replacement decoding succeeds.
      disconnect();
      buffer = decoded;
      offset = 0;
      return { duration: buffer.duration, channels: buffer.numberOfChannels, sampleRate: buffer.sampleRate };
    },
    async play() {
      if (!buffer || source) return;
      await context.resume();
      source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination);
      source.onended = () => {
        source.disconnect();
        source = null;
        offset = 0;
        onEnded();
      };
      startedAt = context.currentTime;
      source.start(0, offset);
    },
    pause() {
      if (!source) return;
      offset = Math.min(offset + context.currentTime - startedAt, buffer.duration);
      disconnect();
    },
    stop() {
      disconnect();
      offset = 0;
    },
    dispose() {
      disconnect();
      if (context && context.state !== 'closed') void context.close();
    },
  };
}
