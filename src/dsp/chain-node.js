import { validateChain } from './chain-params.js';
import workletUrl from './chain.worklet.js?worker&url';

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
  const ready = new Promise((resolve, reject) => {
    node.onprocessorerror = () => reject(new Error('The processing chain could not start.'));
    node.port.onmessage = ({ data }) => {
      if (data.type === 'ready') resolve(data);
      else if (data.type === 'meters') onMeters(data);
      else if (pending.has(data.id)) {
        const { resolve: done, reject } = pending.get(data.id);
        pending.delete(data.id);
        if (data.type === 'applied') done(data.warnings);
        else reject(new Error(data.message));
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
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        node.port.postMessage({ type: 'params', id, params: next });
      });
    },
    onMeters(listener) { onMeters = listener; },
    // Clears all states (no stale reverb tail after unload or replacement, LAS-64).
    reset() { node.port.postMessage({ type: 'reset' }); },
  };
}
