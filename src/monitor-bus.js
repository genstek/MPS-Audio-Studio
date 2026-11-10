// Monitor bus (LAS-68): the last stage before the speakers, shared by single-track playback and the
// stem session. Every output stage (LAS-28: processed/original/reference paths after the A/B
// switch and loudness matching) feeds it:
//   output stage(s) → master gain (Master Level) ─→ speakers
//                                      ├→ splitter → left / right level analysers (LAS-67 meters)
//                                      └→ spectrum analyser (LAS-67 player spectrum)
// Master Level is a monitor volume: it changes what you hear and what the output meters show, and
// nothing else. Exports render from the chain settings alone, so a WAV is never louder or quieter
// because of this fader. The same gain applies to both channels and to every A/B path, so the
// comparison relationship is kept. Changes ramp over RAMP_SECONDS, so moving the fader does not click.
export const MASTER_MIN_DB = -60; // the lowest finite step; below it the fader mutes (−∞ dB)
export const MASTER_MAX_DB = 0; // unity; positive gain needs a headroom decision first (LAS-68)
export const MASTER_RAMP_SECONDS = 0.03;
export const LEVEL_WINDOW_SECONDS = 0.05; // target RMS integration time, independent of sample rate (LAS-167)
export const LEVEL_WINDOW = 2048; // samples at 44.1/48 kHz; see levelWindowFor for other rates
// Power-of-two analyser size nearest to LEVEL_WINDOW_SECONDS, so the RMS window is 43–46 ms from
// 44.1 kHz to 192 kHz instead of shrinking to 21 ms at 96 kHz.
export const levelWindowFor = sampleRate => {
  const rate = Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : 44100;
  return Math.min(32768, Math.max(256, 2 ** Math.round(Math.log2(rate * LEVEL_WINDOW_SECONDS))));
};

export const masterGain = db => (db === -Infinity ? 0 : 10 ** (db / 20));

// Clamps a requested level to the supported range: −∞ (mute) or MASTER_MIN_DB…MASTER_MAX_DB.
export function clampMasterDb(db) {
  if (db === -Infinity || (typeof db === 'number' && db < MASTER_MIN_DB)) return -Infinity;
  if (typeof db !== 'number' || Number.isNaN(db)) return MASTER_MAX_DB;
  return Math.min(MASTER_MAX_DB, db);
}

const toDb = value => (value > 0 ? 20 * Math.log10(value) : null);

export function createMonitorBus(context, levelDb = 0) {
  // Two channels in speaker order: a mono output stage is copied to both sides.
  const master = new GainNode(context, { gain: masterGain(clampMasterDb(levelDb)), channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' });
  const splitter = new ChannelSplitterNode(context, { numberOfOutputs: 2 });
  const windowSize = levelWindowFor(context.sampleRate);
  const left = new AnalyserNode(context, { fftSize: windowSize, smoothingTimeConstant: 0 });
  const right = new AnalyserNode(context, { fftSize: windowSize, smoothingTimeConstant: 0 });
  const spectrum = new AnalyserNode(context, { fftSize: 4096, smoothingTimeConstant: 0.75, minDecibels: -110, maxDecibels: 0 });
  master.connect(context.destination);
  master.connect(splitter);
  splitter.connect(left, 0);
  splitter.connect(right, 1);
  master.connect(spectrum);
  const data = new Float32Array(windowSize);

  function read(analyser) {
    analyser.getFloatTimeDomainData(data);
    let peak = 0, sum = 0;
    for (const v of data) {
      const a = Math.abs(v);
      if (a > peak) peak = a;
      sum += v * v;
    }
    // Clipping: a sample at or beyond digital full scale reached the speakers.
    return { peak, rms: Math.sqrt(sum / data.length), peakDb: toDb(peak), rmsDb: toDb(Math.sqrt(sum / data.length)), clipped: peak >= 1 };
  }

  return {
    input: master,
    spectrum,
    // Ramps to the new level (dB, or −Infinity for mute) without a step.
    setLevel(db) {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(masterGain(clampMasterDb(db)), now + MASTER_RAMP_SECONDS);
    },
    // Sample peak and RMS of the last LEVEL_WINDOW samples per channel, after Master Level.
    levels: () => ({ left: read(left), right: read(right) }),
    dispose() {
      for (const node of [master, splitter, left, right, spectrum]) node.disconnect();
    },
  };
}
