/* global AudioWorkletProcessor, registerProcessor, sampleRate -- AudioWorkletGlobalScope */
import { createChain } from './chain.js';

// Real-time preview of the mastering chain (LAS-27). The same createChain() code renders exports
// offline, so preview and export share one implementation. Settings arrive as messages; meters
// (largest gain reduction since the last report) are posted about 30 times a second.
const METER_INTERVAL_SECONDS = 1 / 30;

class ChainProcessor extends AudioWorkletProcessor {
  constructor({ processorOptions }) {
    super();
    this.chain = createChain(processorOptions.params, sampleRate, processorOptions.channelCount);
    this.meterEvery = Math.round(METER_INTERVAL_SECONDS * sampleRate);
    this.sinceMeter = 0;
    this.compressorPeak = 0;
    this.limiterPeak = 0;
    this.port.onmessage = ({ data }) => {
      // LAS-64: clear every state (reverb tail, limiter delay) when the track is removed or replaced.
      if (data.type === 'reset') { this.chain.reset(); return; }
      if (data.type !== 'params') return;
      try {
        this.chain.setParams(data.params);
        this.port.postMessage({ type: 'applied', id: data.id, warnings: this.chain.warnings });
      } catch (error) {
        // Invalid settings are refused; the chain keeps running with the previous ones.
        this.port.postMessage({ type: 'refused', id: data.id, message: error.message });
      }
    };
    this.port.postMessage({ type: 'ready', latency: this.chain.latency, warnings: this.chain.warnings });
  }

  process(inputs, outputs) {
    const output = outputs[0];
    const frames = output[0].length;
    this.chain.process(inputs[0], output, frames);
    const { compressorGainReductionDb, limiterGainReductionDb } = this.chain.meters;
    this.compressorPeak = Math.max(this.compressorPeak, compressorGainReductionDb);
    this.limiterPeak = Math.max(this.limiterPeak, limiterGainReductionDb);
    this.sinceMeter += frames;
    if (this.sinceMeter >= this.meterEvery) {
      this.port.postMessage({ type: 'meters', compressorGainReductionDb: this.compressorPeak, limiterGainReductionDb: this.limiterPeak });
      this.sinceMeter = 0;
      this.compressorPeak = 0;
      this.limiterPeak = 0;
    }
    return true;
  }
}

registerProcessor('mps-chain', ChainProcessor);
