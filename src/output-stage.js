import { createChainNode } from './dsp/chain-node.js';

// Playback output (LAS-28): every source feeds two paths that always run, so switching between
// them keeps the playback position.
//   processed: source → mastering chain (AudioWorklet) → processed gain ┐
//   original:  source → delay (= chain latency) → original gain ─────────┴→ analyser → speakers
// The delay keeps the original aligned with the processed sound. Only one path is audible at a
// time; switching ramps the two gains over RAMP_SECONDS. Loudness matching turns the louder path
// down while comparing (never up, so nothing clips).
export const RAMP_SECONDS = 0.02;

export async function createOutputStage(context, channelCount, params) {
  const chain = await createChainNode(context, params, channelCount);
  const delay = new DelayNode(context, { maxDelayTime: 1, delayTime: chain.latency / context.sampleRate, channelCount, channelCountMode: 'explicit' });
  const processed = new GainNode(context, { gain: 1 });
  const original = new GainNode(context, { gain: 0 });
  const analyser = new AnalyserNode(context, { fftSize: 4096, smoothingTimeConstant: 0.75, minDecibels: -110, maxDecibels: 0 });
  chain.node.connect(processed);
  delay.connect(original);
  processed.connect(analyser);
  original.connect(analyser);
  analyser.connect(context.destination);

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
    analyser,
    setParams: next => chain.setParams(next),
    onMeters: listener => chain.onMeters(listener),
    // listening: 'processed' | 'original'; match: { processedDb, originalDb } gains in dB (≤ 0).
    setListening(listening, match) {
      rampTo(processed.gain, listening === 'processed' ? 10 ** (match.processedDb / 20) : 0);
      rampTo(original.gain, listening === 'original' ? 10 ** (match.originalDb / 20) : 0);
    },
    dispose() {
      for (const node of [chain.node, delay, processed, original, analyser]) node.disconnect();
      chain.onMeters(() => {});
    },
  };
}
