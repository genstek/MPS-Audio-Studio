import { createChainNode } from './dsp/chain-node.js';

// Playback output (LAS-28): every source feeds two paths that always run, so switching between
// them keeps the playback position.
//   processed: source → mastering chain (AudioWorklet) → processed gain ┐
//   original:  source → delay (= chain latency) → original gain ─────────┴→ analyser → speakers
//   reference: reference source (comparison, LAS-31) → reference gain ─┘   (no processing)
// "speakers" is the destination passed in: the engine's monitor bus with Master Level (LAS-68).
// The delay keeps the original aligned with the processed sound. Only one path is audible at a
// time; switching ramps the gains over RAMP_SECONDS. Loudness matching turns the louder path
// down while comparing (never up, so nothing clips).
export const RAMP_SECONDS = 0.02;

// destination: where the stage's output goes; the engine passes its monitor bus (LAS-68).
export async function createOutputStage(context, channelCount, params, destination = context.destination) {
  const chain = await createChainNode(context, params, channelCount);
  const delay = new DelayNode(context, { maxDelayTime: 1, delayTime: chain.latency / context.sampleRate, channelCount, channelCountMode: 'explicit' });
  const processed = new GainNode(context, { gain: 1 });
  const original = new GainNode(context, { gain: 0 });
  const reference = new GainNode(context, { gain: 0 });
  const analyser = new AnalyserNode(context, { fftSize: 4096, smoothingTimeConstant: 0.75, minDecibels: -110, maxDecibels: 0 });
  chain.node.connect(processed);
  delay.connect(original);
  processed.connect(analyser);
  original.connect(analyser);
  reference.connect(analyser);
  analyser.connect(destination);

  const rampTo = (param, value) => {
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + RAMP_SECONDS);
  };

  return {
    channelCount,
    latency: chain.latency,
    inputs: [chain.node, delay],
    referenceInput: reference,
    analyser,
    setParams: next => chain.setParams(next),
    onMeters: listener => chain.onMeters(listener),
    // listening: 'processed' | 'original' | 'reference'; match: { processedDb, originalDb,
    // referenceDb } gains in dB (≤ 0).
    setListening(listening, match) {
      rampTo(processed.gain, listening === 'processed' ? 10 ** (match.processedDb / 20) : 0);
      rampTo(original.gain, listening === 'original' ? 10 ** (match.originalDb / 20) : 0);
      rampTo(reference.gain, listening === 'reference' ? 10 ** ((match.referenceDb ?? 0) / 20) : 0);
    },
    dispose() {
      for (const node of [chain.node, delay, processed, original, reference, analyser]) node.disconnect();
      chain.onMeters(() => {});
    },
  };
}
