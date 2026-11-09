import { validateChain } from './chain-params.js';
import workletUrl from './chain.worklet.js?worker&url';
import { diagnostics } from '../diagnostics.js';

// Creates the chain as an AudioWorkletNode for real-time preview (LAS-27). Resolves when the
// processor is ready, with its latency in samples; rejects if the settings are invalid or the
// processor fails to start. setParams() resolves with the warnings of the applied settings or
// rejects with the reason they were refused.
export async function createChainNode(context, params, channelCount) {
  validateChain(params); // invalid settings fail here with a clear message, before any audio node
  await context.audioWorklet.addModule(workletUrl);
  const node = new AudioWorkletNode(context, 'mps-chain', {
    numberOfInputs: 1,
    numberOfOutputs: 1,
    outputChannelCount: [channelCount],
    channelCount,
    channelCountMode: 'explicit',
    channelInterpretation: 'speakers',
    processorOptions: { params, channelCount },
  });
  const pending = new Map();
  let nextId = 1;
  let onMeters = () => {};
  let settled = false;
  let lastResets = 0;
  let lastAckId = 0;
  const ready = new Promise((resolve, reject) => {
    node.onprocessorerror = () => {
      diagnostics.count('processorErrors');
      diagnostics.record('worklet.processorerror', { afterReady: settled });
      reject(new Error('The processing chain could not start.'));
    };
    node.port.onmessage = ({ data }) => {
      if (data.type === 'ready') { settled = true; resolve(data); }
      else if (data.type === 'meters') {
        // Cumulative internal-reset and non-finite-input counters from the audio thread (LAS-166).
        if (data.resets > lastResets) diagnostics.record('worklet.internal-reset', { resets: data.resets, nonFiniteInputs: data.nonFiniteInputs });
        lastResets = data.resets ?? lastResets;
        diagnostics.setCounter('resets', data.resets);
        diagnostics.setCounter('nonFiniteInputs', data.nonFiniteInputs);
        onMeters(data);
      } else if (data.type === 'reset-done') diagnostics.record('worklet.reset-done');
      else if (pending.has(data.id)) {
        const { resolve: done, reject } = pending.get(data.id);
        pending.delete(data.id);
        diagnostics.record(data.type === 'applied' ? 'worklet.ack' : 'worklet.refused', { id: data.id, lastAppliedId: data.type === 'applied' ? data.id : lastAckId });
        if (data.type === 'applied') { lastAckId = data.id; done(data.warnings); } else { diagnostics.count('refusals'); reject(new Error(data.message)); }
      }
    };
  });
  const { latency, warnings } = await ready;
  return {
    node,
    latency,
    warnings,
    setParams(next) {
      const id = nextId++;
      diagnostics.record('worklet.params-sent', { id, pending: pending.size });
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        node.port.postMessage({ type: 'params', id, params: next });
      });
    },
    onMeters(listener) { onMeters = listener; },
    // Clears all states (no stale reverb tail after unload or replacement, LAS-64).
    // cause: short label for diagnostics ('track-replaced', 'track-removed').
    reset(cause = 'unspecified') {
      diagnostics.record('chain.reset', { cause });
      node.port.postMessage({ type: 'reset' });
    },
  };
}
