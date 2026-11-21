// Stem session (LAS-34): several stems played together through one output stage (the master chain
// and Processed/Original switch of LAS-28), each through its own channel strip:
//   source → [own chain, LAS-35] → trim (gain) → pan (equal-power StereoPannerNode) → mute/solo gate → meter ─→ bus → output stage
// A stem's own chain (optional; a chain node from createChainNode, sized to the stem's channels) has
// the same constant latency as every other chain, bypassed or not, so the strips stay aligned.
// Timing: every source of a play is started at one scheduled time on the context's clock with the
// same offset into the session, so stems cannot drift apart; pause, seek and resume stop every
// source and start new ones the same way. Alignment policy: each stem starts at session time
// `offset` (0 by default, set in samples of the playback rate); the session lasts as long as the
// longest stem; stems at another sample rate are resampled by the browser for playback.
import { DEFAULT_WIDTH, deltaGains, LR2_Q, validateStemWidth } from './dsp/stem-width.js';

export const START_LEAD_SECONDS = 0.05; // time for every source to be scheduled before the shared start
export const GATE_RAMP_SECONDS = 0.01;
export const MAX_STEMS = 16;

export class StemError extends Error {}

const dbToGain = db => 10 ** (db / 20);
const LR2_Q_DB = 20 * Math.log10(LR2_Q); // BiquadFilterNode lowpass/highpass Q is in dB

// trim → splitter → S = (L−R)/2 → D = direct·S + filtered·HP2(S) → L += D, R −= D → pan.
// Returns every node (for disconnecting) with the controllable ones named: high (= `direct`),
// low (= `filtered`) and filters (the one highpass).
function buildWidthBranch(context, trim, pan) {
  const splitter = new ChannelSplitterNode(context, { numberOfOutputs: 2 });
  const halfLeft = new GainNode(context, { gain: 0.5 });
  const halfRight = new GainNode(context, { gain: -0.5 });
  const side = new GainNode(context, { gain: 1 });
  const high = new GainNode(context, { gain: 0 });
  const filters = [new BiquadFilterNode(context, { type: 'highpass', frequency: DEFAULT_WIDTH.crossoverHz, Q: LR2_Q_DB })];
  const low = new GainNode(context, { gain: 0 });
  const delta = new GainNode(context, { gain: 1 });
  const negate = new GainNode(context, { gain: -1 });
  const merger = new ChannelMergerNode(context, { numberOfInputs: 2 });
  trim.connect(splitter);
  splitter.connect(halfLeft, 0);
  splitter.connect(halfRight, 1);
  halfLeft.connect(side);
  halfRight.connect(side);
  side.connect(high).connect(delta);
  side.connect(filters[0]).connect(low).connect(delta);
  delta.connect(merger, 0, 0);
  delta.connect(negate).connect(merger, 0, 1);
  merger.connect(pan);
  const nodes = [splitter, halfLeft, halfRight, side, high, ...filters, low, delta, negate, merger];
  return Object.assign(nodes, { high, low, filters });
}

export function createStemSession(context, output, { onEnded = () => {} } = {}) {
  const bus = new GainNode(context, { gain: 1, channelCount: 2, channelCountMode: 'explicit' });
  for (const input of output.inputs) bus.connect(input);
  const stems = [];
  let playing = null; // { sources, startedAt, from, remaining }
  let position = 0;
  let nextId = 1;

  const duration = () => stems.reduce((longest, stem) => Math.max(longest, stem.offset + stem.buffer.duration), 0);
  const anySolo = () => stems.some(stem => stem.solo);
  const audible = stem => !stem.mute && (!anySolo() || stem.solo);

  function updateGates() {
    const now = context.currentTime;
    for (const stem of stems) {
      const value = audible(stem) ? 1 : 0;
      stem.gate.gain.cancelScheduledValues(now);
      stem.gate.gain.setValueAtTime(stem.gate.gain.value, now);
      stem.gate.gain.linearRampToValueAtTime(value, now + GATE_RAMP_SECONDS);
    }
  }

  function currentPosition() {
    if (!playing) return position;
    return Math.min(duration(), Math.max(playing.from, playing.from + context.currentTime - playing.startedAt));
  }

  function stopSources() {
    if (!playing) return;
    for (const source of playing.sources) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    playing = null;
  }

  function startSources(from) {
    const startedAt = context.currentTime + START_LEAD_SECONDS;
    const sources = [];
    for (const stem of stems) {
      const local = from - stem.offset;
      if (local >= stem.buffer.duration) continue;
      const source = new AudioBufferSourceNode(context, { buffer: stem.buffer });
      source.connect(stem.chain ? stem.chain.node : stem.trim);
      // A stem that starts later in the session waits for its offset; one already running joins in.
      if (local < 0) source.start(startedAt - local, 0);
      else source.start(startedAt, local);
      sources.push(source);
    }
    const run = { sources, startedAt, from, remaining: sources.length };
    for (const source of sources) {
      source.onended = () => {
        run.remaining -= 1;
        if (run.remaining === 0 && playing === run) {
          playing = null;
          position = 0;
          onEnded();
        }
      };
    }
    playing = sources.length ? run : null;
    return sources.length > 0;
  }

  return {
    // Adds a decoded stem (an AudioBuffer at the playback rate). info: { name, sampleRate, channels,
    // file, sha256, params } as read from the file, so the policy can be explained and the stem
    // rendered and recalled; chain: its own chain node (LAS-35), or none.
    add(buffer, info, chain = null) {
      if (stems.length >= MAX_STEMS) throw new StemError(`A session holds up to ${MAX_STEMS} stems.`);
      const trim = new GainNode(context, { gain: 1, channelCount: 2, channelCountMode: 'clamped-max' });
      const pan = new StereoPannerNode(context, { pan: 0 });
      const gate = new GainNode(context, { gain: 1 });
      const meter = new AnalyserNode(context, { fftSize: 2048, smoothingTimeConstant: 0 });
      trim.connect(pan).connect(gate).connect(meter).connect(bus);
      if (chain) chain.node.connect(trim);
      // Per-stem width (LAS-128), off by default: a side branch that adds D to L and −D to R
      // (see src/dsp/stem-width.js). Off, both branch gains are 0, so D = 0 and the strip is
      // unchanged. Mono stems have no side signal and get no branch.
      const widthNodes = buffer.numberOfChannels === 1 ? [] : buildWidthBranch(context, trim, pan);
      const stem = {
        widthNodes, width: { ...DEFAULT_WIDTH },
        id: nextId++, name: info.name, fileSampleRate: info.sampleRate, fileChannels: info.channels, buffer,
        file: info.file ?? null, sha256: info.sha256 ?? null, params: info.params ?? null, chainLabel: 'bypass', chain,
        offset: 0, gainDb: 0, pan: 0, mute: false, solo: false, trim, panner: pan, gate, meter,
      };
      stems.push(stem);
      updateGates();
      return stem.id;
    },
    remove(id) {
      const index = stems.findIndex(stem => stem.id === id);
      if (index < 0) return;
      const wasPlaying = Boolean(playing);
      const at = currentPosition();
      stopSources();
      const [stem] = stems.splice(index, 1);
      for (const node of [stem.trim, stem.panner, stem.gate, stem.meter, stem.chain?.node, ...stem.widthNodes].filter(Boolean)) node.disconnect();
      position = Math.min(at, duration());
      updateGates();
      if (wasPlaying && stems.length) startSources(position);
    },
    stems: () => stems.map(({ id, name, fileSampleRate, fileChannels, buffer, offset, gainDb, pan, mute, solo, file, sha256, params, chainLabel, width }) => ({
      id, name, fileSampleRate, fileChannels, duration: buffer.duration, channels: buffer.numberOfChannels, offset, gainDb, pan, mute, solo, audible: audible({ mute, solo }),
      width: { ...width }, widthApplies: buffer.numberOfChannels !== 1,
      file, sha256, params, chainLabel,
    })),
    // Gives a stem its own chain settings (LAS-35), applied live by its chain node. Resolves with the
    // node's sample-rate warnings, or rejects with the reason the settings were refused.
    async setChain(id, params, label) {
      const stem = stems.find(s => s.id === id);
      if (!stem?.chain) throw new StemError('This stem has no chain.');
      const warnings = await stem.chain.setParams(params);
      stem.params = params;
      stem.chainLabel = label;
      return warnings;
    },
    duration,
    position: currentPosition,
    playing: () => Boolean(playing),
    // Starts every stem from the shared position. The caller resumes a live context first (the
    // engine does); an offline context renders on its own.
    play() {
      if (playing || !stems.length) return false;
      if (position >= duration()) position = 0;
      return startSources(position);
    },
    pause() {
      position = currentPosition();
      stopSources();
    },
    stop() {
      stopSources();
      position = 0;
    },
    // Moves the shared position; while playing, every stem restarts together from there.
    seek(seconds) {
      const target = Math.max(0, Math.min(duration(), seconds));
      if (playing) {
        stopSources();
        position = target;
        startSources(target);
      } else position = target;
    },
    setOffset(id, seconds) {
      const stem = stems.find(s => s.id === id);
      if (!stem || !(seconds >= 0 && seconds <= 600)) throw new StemError('An offset must be between 0 and 600 seconds.');
      const wasPlaying = Boolean(playing);
      const at = currentPosition();
      stopSources();
      // Offsets are whole samples of the playback rate, so alignment is exact.
      stem.offset = Math.round(seconds * context.sampleRate) / context.sampleRate;
      position = Math.min(at, duration());
      if (wasPlaying) startSources(position);
    },
    setGain(id, db) {
      const stem = stems.find(s => s.id === id);
      stem.gainDb = db;
      stem.trim.gain.setTargetAtTime(dbToGain(db), context.currentTime, GATE_RAMP_SECONDS / 3);
    },
    setPan(id, value) {
      const stem = stems.find(s => s.id === id);
      stem.pan = Math.max(-1, Math.min(1, value));
      stem.panner.pan.setTargetAtTime(stem.pan, context.currentTime, GATE_RAMP_SECONDS / 3);
    },
    // Per-stem width (LAS-128): { enabled, width 0–2, crossoverHz }. Refuses values outside the bounds
    // (StemWidthError) and leaves the stem as it was. Only this stem's branch changes; the settings
    // are kept when it is switched off (bypass), and mono stems keep them without effect.
    setWidth(id, settings) {
      const stem = stems.find(s => s.id === id);
      const next = validateStemWidth({ ...stem.width, ...settings });
      stem.width = next;
      if (!stem.widthNodes.length) return;
      const [direct, filtered] = deltaGains(next);
      const at = context.currentTime, tau = GATE_RAMP_SECONDS / 3;
      stem.widthNodes.high.gain.setTargetAtTime(next.enabled ? direct : 0, at, tau);
      stem.widthNodes.low.gain.setTargetAtTime(next.enabled ? filtered : 0, at, tau);
      for (const filter of stem.widthNodes.filters) filter.frequency.setValueAtTime(next.crossoverHz, at);
    },
    setMute(id, mute) { stems.find(s => s.id === id).mute = mute; updateGates(); },
    setSolo(id, solo) { stems.find(s => s.id === id).solo = solo; updateGates(); },
    // Peak and RMS (dBFS) of what each strip sends to the bus, from its own analyser.
    levels() {
      const data = new Float32Array(2048);
      return stems.map(stem => {
        stem.meter.getFloatTimeDomainData(data);
        let peak = 0, sum = 0;
        for (const v of data) { peak = Math.max(peak, Math.abs(v)); sum += v * v; }
        return { id: stem.id, peakDb: peak > 0 ? 20 * Math.log10(peak) : null, rmsDb: sum > 0 ? 10 * Math.log10(sum / data.length) : null };
      });
    },
    dispose() {
      stopSources();
      for (const stem of stems) for (const node of [stem.trim, stem.panner, stem.gate, stem.meter, stem.chain?.node, ...stem.widthNodes].filter(Boolean)) node.disconnect();
      stems.length = 0;
      bus.disconnect();
    },
  };
}
