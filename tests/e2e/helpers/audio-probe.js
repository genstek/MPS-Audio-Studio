// Counts the page's AudioBufferSourceNodes so a test can check that the engine leaves no
// extra source playing or connected. It observes the engine's nodes; it does not measure sound.
export async function installAudioProbe(page) {
  await page.addInitScript(() => {
    const probe = { started: 0, offsets: [], mostPlaying: 0, playing: new Set(), connected: new Set(), contexts: [] };
    window.__audioProbe = probe;
    // Remember every AudioContext the page creates, to read its state later.
    const PageAudioContext = window.AudioContext;
    window.AudioContext = class extends PageAudioContext {
      constructor(...args) {
        super(...args);
        probe.contexts.push(this);
      }
    };
    // Decoding can be held back on request, to act while an import is still in progress.
    const { decodeAudioData } = BaseAudioContext.prototype;
    BaseAudioContext.prototype.decodeAudioData = async function (...args) {
      const decoded = await decodeAudioData.apply(this, args);
      if (probe.decodeGate) await probe.decodeGate;
      return decoded;
    };
    const node = AudioBufferSourceNode.prototype;
    const { start, stop, connect, disconnect } = node;
    node.start = function (...args) {
      probe.started += 1;
      probe.offsets.push(args[1] ?? 0); // start(when, offset): where in the track it starts
      probe.playing.add(this);
      probe.mostPlaying = Math.max(probe.mostPlaying, probe.playing.size);
      this.addEventListener('ended', () => probe.playing.delete(this));
      return start.apply(this, args);
    };
    node.stop = function (...args) {
      probe.playing.delete(this);
      return stop.apply(this, args);
    };
    node.connect = function (...args) {
      probe.connected.add(this);
      return connect.apply(this, args);
    };
    node.disconnect = function (...args) {
      probe.connected.delete(this);
      return disconnect.apply(this, args);
    };
  });
}

// started: sources ever started; playing: started and not stopped or ended; connected: not disconnected.
export function audioSources(page) {
  return page.evaluate(() => {
    const probe = window.__audioProbe;
    return { started: probe.started, playing: probe.playing.size, connected: probe.connected.size };
  });
}

// The track offset, in seconds, passed to each start() call so far.
export function startOffsets(page) {
  return page.evaluate(() => window.__audioProbe.offsets);
}

// The largest number of sources that were playing at the same time.
export function mostPlayingAtOnce(page) {
  return page.evaluate(() => window.__audioProbe.mostPlaying);
}

// States of the AudioContexts the page created ('running', 'suspended' or 'closed').
export function contextStates(page) {
  return page.evaluate(() => window.__audioProbe.contexts.map(context => context.state));
}

// Imports started after holdDecoding() wait until releaseDecoding() before they finish.
export function holdDecoding(page) {
  return page.evaluate(() => {
    const probe = window.__audioProbe;
    probe.decodeGate = new Promise(resolve => { probe.releaseDecode = resolve; });
  });
}

export function releaseDecoding(page) {
  return page.evaluate(() => {
    const probe = window.__audioProbe;
    probe.decodeGate = null;
    probe.releaseDecode();
  });
}
