// Counts the page's AudioBufferSourceNodes so a test can check that the engine leaves no
// extra source playing or connected. It observes the engine's nodes; it does not measure sound.
export async function installAudioProbe(page) {
  await page.addInitScript(() => {
    const probe = { started: 0, offsets: [], playing: new Set(), connected: new Set() };
    window.__audioProbe = probe;
    const node = AudioBufferSourceNode.prototype;
    const { start, stop, connect, disconnect } = node;
    node.start = function (...args) {
      probe.started += 1;
      probe.offsets.push(args[1] ?? 0); // start(when, offset): where in the track it starts
      probe.playing.add(this);
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
