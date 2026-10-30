// Observes what the page sends to the mastering chain and how the output stage's gains move
// (LAS-28). It records; it never changes the audio.
export async function installChainProbe(page) {
  await page.addInitScript(() => {
    const probe = { params: [], gains: [], analysers: [] };
    window.__chainProbe = probe;
    const { postMessage } = MessagePort.prototype;
    MessagePort.prototype.postMessage = function (data, ...rest) {
      if (data && data.type === 'params') probe.params.push(JSON.parse(JSON.stringify(data.params)));
      return postMessage.call(this, data, ...rest);
    };
    // The output stage creates the processed gain first, then the original gain.
    const PageAnalyserNode = window.AnalyserNode;
    window.AnalyserNode = class extends PageAnalyserNode {
      constructor(...args) {
        super(...args);
        probe.analysers.push(this);
      }
    };
    const PageGainNode = window.GainNode;
    window.GainNode = class extends PageGainNode {
      constructor(...args) {
        super(...args);
        probe.gains.push(this);
      }
    };
  });
}

// The last settings sent to the running chain.
export const lastChainParams = page => page.evaluate(() => window.__chainProbe.params.at(-1) ?? null);

// Current values of the processed and original path gains.
export const pathGains = page => page.evaluate(() => {
  const [processed, original] = window.__chainProbe.gains;
  return { processed: Number(processed.gain.value.toFixed(3)), original: Number(original.gain.value.toFixed(3)) };
});

// The frequency (Hz) of the strongest bin in the output stage's analyser — the one the EQ editor draws.
export const analyserPeakHz = page => page.evaluate(() => {
  const analyser = window.__chainProbe.analysers.at(-1);
  const data = new Float32Array(analyser.frequencyBinCount);
  analyser.getFloatFrequencyData(data);
  let best = 1;
  for (let k = 1; k < data.length; k++) if (data[k] > data[best]) best = k;
  return Math.round((best * analyser.context.sampleRate) / analyser.fftSize);
});

// LAS-31: all three output paths (the reference path is the stage's third gain) and how many
// settings messages the chain has received so far.
export const comparisonGains = page => page.evaluate(() => {
  const [processed, original, reference] = window.__chainProbe.gains;
  return { processed: Number(processed.gain.value.toFixed(3)), original: Number(original.gain.value.toFixed(3)), reference: Number(reference.gain.value.toFixed(3)) };
});
export const paramsMessageCount = page => page.evaluate(() => window.__chainProbe.params.length);
