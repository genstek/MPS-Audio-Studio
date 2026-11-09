import { createChainNode } from './dsp/chain-node.js';
import { diagnostics } from './diagnostics.js';

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
// LAS-166: a Match Loudness result arrives whenever a full-file measurement finishes (it can take
// 30–60 s on a long track, long after the last EQ edit). Moving the level on the 20 ms A/B ramp
// is heard as a click followed by a sudden level change that sounds like the EQ was lost, so a
// match-gain update glides over this longer time instead. Switching Original/Processed keeps
// the short ramp.
export const MATCH_RAMP_SECONDS = 0.6;

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

  const rampTo = (param, value, seconds = RAMP_SECONDS) => {
    const now = context.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  };
  diagnostics.record('output.created', { channels: channelCount });

  return {
    channelCount,
    latency: chain.latency,
    inputs: [chain.node, delay],
    referenceInput: reference,
    analyser,
    setParams: next => chain.setParams(next),
    // Clears the chain's tail (reverb, limiter delay) after a track is removed or replaced (LAS-64).
    reset: cause => chain.reset(cause),
    onMeters: listener => chain.onMeters(listener),
    // listening: 'processed' | 'original' | 'reference'; match: { processedDb, originalDb,
    // referenceDb } gains in dB (≤ 0).
    // seconds: ramp time; the default is the short A/B switch ramp, a match-gain update passes
    // MATCH_RAMP_SECONDS.
    setListening(listening, match, seconds = RAMP_SECONDS) {
      const targets = {
        processed: listening === 'processed' ? 10 ** (match.processedDb / 20) : 0,
        original: listening === 'original' ? 10 ** (match.originalDb / 20) : 0,
        reference: listening === 'reference' ? 10 ** ((match.referenceDb ?? 0) / 20) : 0,
      };
      diagnostics.record('output.listening', { listening, processedGain: targets.processed, originalGain: targets.original, referenceGain: targets.reference, rampSeconds: seconds, at: context.currentTime });
      rampTo(processed.gain, targets.processed, seconds);
      rampTo(original.gain, targets.original, seconds);
      rampTo(reference.gain, targets.reference, seconds);
    },
    dispose() {
      diagnostics.record('output.disposed');
      for (const node of [chain.node, delay, processed, original, reference, analyser]) node.disconnect();
      chain.onMeters(() => {});
    },
  };
}
