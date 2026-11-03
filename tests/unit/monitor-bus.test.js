import { afterEach, expect, test, vi } from 'vitest';
import { MASTER_RAMP_SECONDS, clampMasterDb, createMonitorBus, masterGain } from '../../src/monitor-bus.js';

// LAS-68: the monitor bus applies Master Level after the A/B paths and measures what reaches the
// speakers. Web Audio nodes are stood in for; the gain law and the level readings are exact.
afterEach(() => vi.unstubAllGlobals());

function stub() {
  const made = [];
  const param = value => ({ value, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
  class Node { constructor(context, options = {}) { this.options = options; this.connections = []; made.push(this); } connect(target, output) { this.connections.push([target, output]); return target; } disconnect() { this.disconnected = true; } }
  vi.stubGlobal('GainNode', class extends Node { constructor(c, o) { super(c, o); this.gain = param(o.gain); } });
  vi.stubGlobal('ChannelSplitterNode', class extends Node {});
  vi.stubGlobal('AnalyserNode', class extends Node { getFloatTimeDomainData(target) { target.set(this.samples ?? new Float32Array(target.length)); } });
  return made;
}

test('gain law: 0 dB is unity, −6.02 dB halves, −∞ is silence; requests are clamped to mute…0 dB', () => {
  expect(masterGain(0)).toBe(1);
  expect(masterGain(-20 * Math.log10(2))).toBeCloseTo(0.5, 12);
  expect(masterGain(-Infinity)).toBe(0);
  expect(clampMasterDb(3)).toBe(0);
  expect(clampMasterDb(-60)).toBe(-60);
  expect(clampMasterDb(-60.5)).toBe(-Infinity);
  expect(clampMasterDb(Number.NaN)).toBe(0);
});

test('routing: master gain → speakers, → splitter → left/right analysers, → spectrum; mono is spread to both sides', () => {
  const made = stub();
  const context = { currentTime: 2, destination: { name: 'speakers' } };
  const bus = createMonitorBus(context, -6);
  const [master, splitter, left, right, spectrum] = made;
  expect(master.options).toMatchObject({ channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers' });
  expect(master.gain.value).toBeCloseTo(10 ** (-6 / 20), 12);
  expect(master.connections.map(([target]) => target)).toEqual([context.destination, splitter, spectrum]);
  expect(splitter.connections).toEqual([[left, 0], [right, 1]]);
  expect(bus.input).toBe(master);
  expect(bus.spectrum).toBe(spectrum);
  // A level change ramps from the current value; nothing jumps.
  bus.setLevel(-Infinity);
  expect(master.gain.cancelScheduledValues).toHaveBeenCalledWith(2);
  expect(master.gain.linearRampToValueAtTime).toHaveBeenCalledWith(0, 2 + MASTER_RAMP_SECONDS);
  bus.dispose();
  expect(made.every(node => node.disconnected)).toBe(true);
});

test('levels: sample peak, RMS and clipping per channel, after the master gain', () => {
  const made = stub();
  const bus = createMonitorBus({ currentTime: 0, destination: {} }, 0);
  const [, , left, right] = made;
  left.samples = Float32Array.from({ length: 2048 }, (_, n) => 0.5 * Math.sin((2 * Math.PI * n) / 64));
  right.samples = Float32Array.from({ length: 2048 }, (_, n) => (n === 100 ? 1 : 0));
  const { left: l, right: r } = bus.levels();
  expect(l.peak).toBeCloseTo(0.5, 6);
  expect(l.rms).toBeCloseTo(0.5 / Math.SQRT2, 6);
  expect(l.rmsDb).toBeCloseTo(20 * Math.log10(0.5 / Math.SQRT2), 5);
  expect(l.clipped).toBe(false);
  expect(r.clipped).toBe(true);
  right.samples = new Float32Array(2048);
  expect(bus.levels().right).toMatchObject({ peak: 0, peakDb: null, rmsDb: null, clipped: false });
});
