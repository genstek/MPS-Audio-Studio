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
    // LAS-68: the monitor bus is created with the audio context, before any output stage: its
    // Master Level gain is the first GainNode and its left, right and spectrum analysers are the
    // first three analysers. The output stage then creates its processed gain, then the original
    // gain, then the reference gain, and its own analyser.
    // A speakers tap measures whatever is connected to the destination, independently of the app.
    const { connect } = AudioNode.prototype;
    const RawAnalyser = window.AnalyserNode; // the tap's own analysers are not counted below
    AudioNode.prototype.connect = function (target, ...rest) {
      if (target instanceof AudioDestinationNode && !this.__probeTapped) {
        this.__probeTapped = true;
        const context = this.context;
        if (!context.__speakersTap) {
          const splitter = new ChannelSplitterNode(context, { numberOfOutputs: 2 });
          const left = new RawAnalyser(context, { fftSize: 8192, smoothingTimeConstant: 0 });
          const right = new RawAnalyser(context, { fftSize: 8192, smoothingTimeConstant: 0 });
          connect.call(splitter, left, 0);
          connect.call(splitter, right, 1);
          context.__speakersTap = { splitter, left, right };
          probe.speakers = context.__speakersTap;
        }
        connect.call(this, context.__speakersTap.splitter);
      }
      return connect.call(this, target, ...rest);
    };
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
  const [, processed, original] = window.__chainProbe.gains;
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
  const [, processed, original, reference] = window.__chainProbe.gains;
  return { processed: Number(processed.gain.value.toFixed(3)), original: Number(original.gain.value.toFixed(3)), reference: Number(reference.gain.value.toFixed(3)) };
});
export const paramsMessageCount = page => page.evaluate(() => window.__chainProbe.params.length);

// LAS-68: the Master Level gain of the monitor bus (the first GainNode the page creates).
export const masterGainValue = page => page.evaluate(() => window.__chainProbe.gains[0].gain.value);

// LAS-68: RMS (dBFS, null when silent) of what reaches the speakers, per channel, measured by the
// probe's own tap on the destination over the last 8192 samples.
export const speakersRmsDb = page => page.evaluate(() => {
  const tap = window.__chainProbe.speakers;
  if (!tap) return null;
  const read = analyser => {
    const data = new Float32Array(analyser.fftSize);
    analyser.getFloatTimeDomainData(data);
    const rms = Math.sqrt(data.reduce((sum, v) => sum + v * v, 0) / data.length);
    return rms > 1e-7 ? Number((20 * Math.log10(rms)).toFixed(2)) : null;
  };
  return { left: read(tap.left), right: read(tap.right) };
});
