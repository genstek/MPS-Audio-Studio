import { defaultChain } from './dsp/chain-params.js';
import { readWavHeader } from './dsp/wav-decode.js';
import { createOutputStage, MATCH_RAMP_SECONDS } from './output-stage.js';
import { diagnostics, eqSummary, fingerprint } from './diagnostics.js';
import { createStemSession } from './stem-session.js';
import { createChainNode } from './dsp/chain-node.js';
import { bypassChain } from './dsp/stem-render.js';
import { audioFileSizeProblem } from './file-limits.js';
import { clampMasterDb, createMonitorBus } from './monitor-bus.js';

// Reading or decoding a large file can fail for lack of memory (LAS-71). Both failures leave the
// current session unchanged, so the messages say what to try instead of reporting a dead end.
async function readFile(file) {
  try {
    return await file.arrayBuffer();
  } catch {
    throw new Error('The file could not be read. It may have been moved, or there was not enough memory for it; close other tabs or choose a smaller file. Nothing was changed.');
  }
}

function decodeFailure(failure) {
  const memory = failure?.name === 'RangeError' || /memory|allocat/i.test(failure?.message ?? '');
  return new Error(memory
    ? 'There was not enough memory to decode this WAV. Close other tabs or choose a shorter file. Nothing was changed.'
    : 'Unable to decode this WAV. Try another WAV file.');
}

// One engine owns the audio context, the current source and the output stage (mastering chain
// and original/processed switch, LAS-28), outside React state. createOutput can be replaced in
// unit tests.
export function createAudioEngine(onEnded, { createOutput = createOutputStage, createStemChain = createChainNode, createMonitor = createMonitorBus } = {}) {
  let context;
  // Monitor bus with Master Level (LAS-68), created together with the audio context so it exists
  // before any output stage; every stage plays into it. masterDb is kept for a context made later.
  let monitor = null;
  let masterDb = 0;
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
  // Reference comparison monitor (LAS-31): a looping mix section through the normal output paths
  // and a looping reference section on the unprocessed reference path. It replaces normal
  // playback while it runs; anything that touches the transport ends it.
  let comparison = null;
  let latestComparison = 0;
  // Stem session (LAS-34): its own stereo output stage (master chain and Processed/Original switch)
  // on the same audio context, built when the session first opens. Only one of single-track
  // playback and stem playback runs at a time.
  let stemOutput = null;
  let stemSession = null;
  const NO_MATCH = { processedDb: 0, originalDb: 0 };
  // Counts every chain settings message so diagnostics can tell which one the worklet applied last (LAS-166).
  let chainRevision = 0;
  // Playback timeline for diagnostics only; no side effects.
  const playbackPosition = () => (buffer && source ? Math.min(offset + context.currentTime - startedAt, buffer.duration) : offset);

  function ensureContext() {
    if (context) return;
    context = new AudioContext();
    monitor = createMonitor(context, masterDb);
  }

  function superseded() {
    const error = new Error('A newer import replaced this one.');
    error.name = 'SupersededError';
    return error;
  }

  function clearComparison() {
    if (!comparison) return;
    for (const loop of comparison.loops) {
      loop.stop();
      loop.disconnect();
    }
    comparison = null;
    output?.setListening(listening, match);
  }

  // Ends the comparison monitor and cancels one that is still starting.
  function endComparison() {
    latestComparison++;
    clearComparison();
  }

  function stopSource() {
    pendingStart = null;
    if (!source) return;
    source.onended = null;
    source.stop();
    source.disconnect();
    source = null;
  }

  function disconnect() {
    endComparison();
    stopSource();
  }

  // Starts the single source at `offset` on the running context (play and seek, LAS-9/LAS-67).
  function startSource() {
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
      const tooLarge = audioFileSizeProblem(file.size);
      if (tooLarge) throw new Error(tooLarge);
      const bytes = await readFile(file);
      if (load !== latestLoad) throw superseded();
      // Compare raw bytes: the four size bytes between the tags are a number, not text, and
      // decoding them as UTF-8 could merge them into fewer characters and shift 'WAVE'.
      const header = new Uint8Array(bytes, 0, Math.min(12, bytes.byteLength));
      const tag = (from, to) => String.fromCharCode(...header.subarray(from, to));
      if (tag(0, 4) !== 'RIFF' || tag(8, 12) !== 'WAVE') {
        throw new Error('This file is not a valid WAV. Choose another file.');
      }
      ensureContext();
      let decoded;
      try {
        decoded = await context.decodeAudioData(bytes);
      } catch (failure) {
        if (load !== latestLoad) throw superseded();
        throw decodeFailure(failure);
      }
      if (load !== latestLoad) throw superseded();
      // The chain is mono or stereo; files with more channels play as a stereo downmix.
      const channels = Math.min(2, decoded.numberOfChannels);
      let stage = output;
      if (!stage || stage.channelCount !== channels) {
        try {
          stage = await createOutput(context, channels, chainParams, monitor.input);
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
      output?.reset?.('track-replaced'); // the old track's reverb tail is not carried into the new one (LAS-64)
      buffer = decoded;
      offset = 0;
      if (stage !== output) {
        diagnostics.record('engine.output-replaced', { channels });
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
      endComparison();
      stemSession?.pause();
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
      // Play at the very end (after FF or a seek to the end) starts again from the beginning.
      if (offset >= buffer.duration) offset = 0;
      startSource();
      return true;
    },
    // Moves the playhead (LAS-67). While playing, the source restarts at the new place at once
    // (one source, same output paths); while paused or stopped the place is kept for the next Play.
    // The target is clamped to 0…duration; reaching the end while playing ends playback like the
    // natural end of the track. Returns the position used.
    seek(seconds) {
      if (!buffer) return 0;
      const target = Math.min(buffer.duration, Math.max(0, Number.isFinite(seconds) ? seconds : 0));
      endComparison();
      if (source) {
        stopSource();
        offset = target;
        startSource();
      } else {
        offset = target;
      }
      return target;
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
      output?.reset?.('track-removed'); // no stale reverb tail after removal (LAS-64)
      buffer = null;
      offset = 0;
      // Nothing is left to play, so the audio device may idle until the next Play resumes it.
      if (context && context.state === 'running') void context.suspend();
    },
    dispose() {
      latestLoad++;
      disconnect();
      stemSession?.dispose();
      stemSession = null;
      stemOutput?.dispose();
      stemOutput = null;
      output?.dispose();
      output = null;
      monitor?.dispose();
      monitor = null;
      meterListeners.clear();
      if (context && context.state !== 'closed') void context.close();
    },
    // Mastering chain settings (validated schema, LAS-27). Resolves with sample-rate warnings, or
    // rejects with the reason the settings were refused. Kept for the next output stage.
    async setChain(params) {
      chainParams = params;
      const revision = ++chainRevision;
      diagnostics.record('chain.set', { revision, fingerprint: fingerprint(params), ...eqSummary(params), position: playbackPosition() });
      if (stemOutput) await stemOutput.setParams(params);
      if (!output) return [];
      try {
        const warnings = await output.setParams(params);
        diagnostics.record('chain.applied', { revision, lastAppliedRevision: revision, stale: revision !== chainRevision });
        return warnings;
      } catch (failure) {
        diagnostics.count('refusals');
        diagnostics.record('chain.refused', { revision });
        throw failure;
      }
    },
    // A/B: 'processed' or 'original'. The same source keeps playing; only the audible path changes.
    listen(next) {
      diagnostics.record('monitor.listen', { listening: next, from: listening, position: playbackPosition() });
      listening = next;
      if (!comparison) output?.setListening(listening, match);
      stemOutput?.setListening(listening, NO_MATCH);
    },
    // Loudness matching gains in dB (each ≤ 0), or null for none.
    // LAS-166: an update glides over MATCH_RAMP_SECONDS (never the 20 ms A/B ramp) and a change
    // below 0.05 dB is not applied at all, so a late measurement cannot click or jump the level.
    setLoudnessMatch(next) {
      const target = next ?? { processedDb: 0, originalDb: 0 };
      const small = Math.abs(target.processedDb - match.processedDb) < 0.05 && Math.abs(target.originalDb - match.originalDb) < 0.05;
      diagnostics.record('match.apply', { processedDb: target.processedDb, originalDb: target.originalDb, skipped: small, listening, position: playbackPosition() });
      if (small) return;
      match = target;
      if (!comparison) output?.setListening(listening, match, MATCH_RAMP_SECONDS); // kept for after a comparison
    },
    // Starts the comparison monitor: referenceBytes (a WAV's ArrayBuffer, decoded here), the mix
    // and reference sections { start, end } in seconds, gains { processedDb, originalDb,
    // referenceDb } (each ≤ 0) and which one is audible. Each section loops on its own. Normal
    // playback stops; the chain settings are not touched.
    async startComparison({ referenceBytes, mixSection, referenceSection, gains, audible }) {
      if (!buffer) throw new Error('Import a track first.');
      const request = ++latestComparison;
      let reference;
      try {
        reference = await context.decodeAudioData(referenceBytes.slice(0));
      } catch {
        throw new Error('Unable to decode the reference for listening.');
      }
      if (request !== latestComparison || !buffer) return false;
      clearComparison();
      stopSource();
      offset = 0;
      await context.resume();
      if (request !== latestComparison) return false;
      const loop = (audio, section, destinations) => {
        const node = context.createBufferSource();
        node.buffer = audio;
        node.loop = true;
        node.loopStart = section.start;
        node.loopEnd = Math.min(section.end, audio.duration);
        for (const destination of destinations) node.connect(destination);
        return node;
      };
      const loops = [loop(buffer, mixSection, output.inputs), loop(reference, referenceSection, [output.referenceInput])];
      const when = context.currentTime + 0.05;
      loops[0].start(when, mixSection.start);
      loops[1].start(when, referenceSection.start);
      comparison = { loops, gains };
      output.setListening(audible, gains);
      return true;
    },
    // Which one the comparison monitor plays: 'processed' | 'original' | 'reference'; optionally
    // new matching gains (after the processed version was measured again, LAS-32).
    compareListen(audible, gains) {
      if (!comparison) return;
      if (gains) comparison.gains = gains;
      output.setListening(audible, comparison.gains);
    },
    stopComparison: endComparison,
    comparing: () => Boolean(comparison),
    // Opens (or returns) the stem session. onEnded runs when the last stem finishes.
    async openStems(onEnded = () => {}) {
      ensureContext();
      if (!stemOutput) {
        try {
          stemOutput = await createOutput(context, 2, chainParams, monitor.input);
        } catch {
          throw new Error('Audio processing could not start. Reload the page and try again.');
        }
        stemOutput.onMeters(meters => meterListeners.forEach(listener => listener(meters)));
        stemOutput.setListening(listening, NO_MATCH);
      }
      stemSession ??= createStemSession(context, stemOutput, { onEnded: () => stemSession.onEnded?.() });
      stemSession.onEnded = onEnded;
      return stemSession;
    },
    stemSession: () => stemSession,
    // Removes every stem (new or opened project, LAS-60/69); the stem output stage is kept.
    clearStems() {
      stemSession?.dispose();
      stemSession = null;
    },
    // Decodes a stem WAV at the playback rate and adds it; the file's own rate and channel count are
    // read from its header so the alignment policy can be explained.
    async addStem(file) {
      if (!stemSession) throw new Error('Open the stem session first.');
      if (!/\.wav$/i.test(file.name)) throw new Error('Choose a WAV file.');
      const tooLarge = audioFileSizeProblem(file.size);
      if (tooLarge) throw new Error(tooLarge);
      const bytes = await readFile(file);
      const header = readWavHeader(bytes.slice(0, 65536), file.size);
      const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      const sha256 = Array.from(digest, byte => byte.toString(16).padStart(2, '0')).join('');
      let decoded;
      try {
        decoded = await context.decodeAudioData(bytes);
      } catch (failure) {
        throw decodeFailure(failure);
      }
      // Each stem gets its own chain (LAS-35), sized to its channels so mono stems keep the mono pan
      // law; it starts bypassed.
      const params = bypassChain();
      let chain;
      try {
        chain = await createStemChain(context, params, Math.min(2, decoded.numberOfChannels));
      } catch {
        throw new Error('Audio processing could not start for this stem.');
      }
      return stemSession.add(decoded, { name: file.name, sampleRate: header.sampleRate, channels: header.channels, file, sha256, params }, chain);
    },
    // Starts the stems together; single-track playback and any comparison stop first.
    async playStems() {
      if (!stemSession) return false;
      endComparison();
      stopSource();
      offset = 0;
      await context.resume();
      return stemSession.play();
    },
    // Per-stem levels and the master level after the Processed/Original switch.
    stemLevels() {
      if (!stemSession) return { stems: [], master: null };
      const data = new Float32Array(stemOutput.analyser.fftSize);
      stemOutput.analyser.getFloatTimeDomainData(data);
      let peak = 0;
      for (const v of data) peak = Math.max(peak, Math.abs(v));
      return { stems: stemSession.levels(), master: { peakDb: peak > 0 ? 20 * Math.log10(peak) : null } };
    },
    onMeters(listener) {
      meterListeners.add(listener);
      return () => meterListeners.delete(listener);
    },
    // Master Level (LAS-68): a monitor volume in dB (−Infinity mutes), applied after the A/B paths
    // of the single track and the stems alike. It is not part of the chain settings and never
    // reaches an export. Kept for the next audio context.
    setMasterLevel(db) {
      masterDb = clampMasterDb(db);
      monitor?.setLevel(masterDb);
      return masterDb;
    },
    masterLevel: () => masterDb,
    // What reaches the speakers, after Master Level: per-channel peak/RMS and a spectrum analyser
    // (LAS-67 player meters). null before any audio context exists.
    outputLevels: () => monitor?.levels() ?? null,
    outputAnalyser: () => monitor?.spectrum ?? null,
    // The output stage's analyser (after A/B, before Master Level): the EQ editor's spectrum.
    analyser: () => output?.analyser ?? null,
    latency: () => output?.latency ?? 0,
    sampleRate: () => context?.sampleRate ?? null,
  };
}
