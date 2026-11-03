import { renderChain } from '../../../../src/dsp/chain.js';
import { defaultChain, validateChain } from '../../../../src/dsp/chain-params.js';

// Stand-in "plugins" for the LAS-37 bridge prototype. They are NOT VST3/AU plugins: they exist so the
// bridge's isolation, control and failure handling can be exercised in this environment, where
// running third-party native plugin binaries is not permitted. A real host replaces this module.
const shelf = (type, frequency, gain) => ({ enabled: gain !== 0, type, frequency, gain, q: 0.707 });

export const STAND_INS = {
  'mps-standin-tilt-eq': {
    name: 'Stand-in tilt EQ (studio DSP, not a VST3)', vendor: 'MPS prototype', version: '0.1.0', format: 'stand-in',
    parameters: { lowGainDb: { min: -12, max: 12, default: 0 }, highGainDb: { min: -12, max: 12, default: 0 } },
  },
  'mps-standin-crash': {
    name: 'Stand-in that crashes while processing', vendor: 'MPS prototype', version: '0.1.0', format: 'stand-in', parameters: {},
  },
  'mps-standin-hang': {
    name: 'Stand-in that never returns', vendor: 'MPS prototype', version: '0.1.0', format: 'stand-in', parameters: {},
  },
};

// Processes planar channels (Float32Array[]) with the given parameters; runs inside the host process.
export function processStandIn(pluginId, parameters, channels, sampleRate) {
  if (pluginId === 'mps-standin-crash') process.exit(70); // simulates a plugin crash taking its process down
  if (pluginId === 'mps-standin-hang') { for (;;) { /* simulates a plugin that never returns */ } }
  const params = defaultChain();
  params.eq.left[0] = shelf('low-shelf', 150, parameters.lowGainDb);
  params.eq.left[1] = shelf('high-shelf', 6000, parameters.highGainDb);
  params.eq.right[0] = { ...params.eq.left[0] };
  params.eq.right[1] = { ...params.eq.left[1] };
  params.limiter = { ...params.limiter, enabled: false };
  return renderChain(validateChain(params), channels, sampleRate).channels;
}
