import { afterEach, expect, test, vi } from 'vitest';

// LAS-166 regression. Fake clock, fake context: a Match Loudness render that finishes 30–60 s into
// playback (and EQ edits for 3 minutes) must not bypass the EQ, switch Original/Processed, reset the
// chain or move the level on the 20 ms A/B ramp.
vi.mock('../../src/dsp/chain-node.js', () => ({ createChainNode: vi.fn() }));

const { createAudioEngine } = await import('../../src/audio-engine.js');
const { createOutputStage, MATCH_RAMP_SECONDS, RAMP_SECONDS } = await import('../../src/output-stage.js');
const { createChainNode } = await import('../../src/dsp/chain-node.js');
const { defaultChain } = await import('../../src/dsp/chain-params.js');
const { diagnostics } = await import('../../src/diagnostics.js');

afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); diagnostics.disable(); diagnostics.clear(); });

function fakeParam(context) {
  const param = { value: 0, ramps: [], cancelScheduledValues() {}, setValueAtTime() {}, linearRampToValueAtTime(value, end) { param.ramps.push({ value, seconds: end - context.currentTime }); param.value = value; } };
  return param;
}

function setup() {
  const context = {
    currentTime: 0, state: 'running', sampleRate: 48000, destination: {},
    decodeAudioData: async () => ({ duration: 240, numberOfChannels: 2, sampleRate: 48000 }),
    resume: async () => {}, suspend: async () => {}, close: async () => {},
    createBufferSource: () => ({ connect() {}, disconnect() {}, start() {}, stop() {} }),
  };
  vi.stubGlobal('AudioContext', function () { return context; });
  const gains = [];
  vi.stubGlobal('GainNode', function (ctx, { gain }) { const node = { gain: fakeParam(ctx), connect() {}, disconnect() {} }; node.gain.value = gain; gains.push(node); return node; });
  vi.stubGlobal('DelayNode', function () { return { connect() {}, disconnect() {} }; });
  vi.stubGlobal('AnalyserNode', function () { return { connect() {}, disconnect() {}, fftSize: 4096 }; });
  const chainCalls = { params: [], resets: [] };
  createChainNode.mockImplementation(async () => ({
    node: { connect() {}, disconnect() {} }, latency: 83,
    setParams: async next => { chainCalls.params.push(next); return []; },
    onMeters() {}, reset: cause => chainCalls.resets.push(cause),
  }));
  const engine = createAudioEngine(() => {}, { createOutput: createOutputStage, createMonitor: () => ({ input: {}, dispose() {}, setLevel() {} }) });
  const file = { name: 'long.wav', size: 44, arrayBuffer: async () => new TextEncoder().encode('RIFF0000WAVE').buffer };
  const [processed, original] = [() => gains[0].gain, () => gains[1].gain];
  return { engine, context, file, chainCalls, processed, original };
}

function editedChain(gain) {
  const params = defaultChain();
  params.eq.left[5] = { ...params.eq.left[5], enabled: true, gain };
  params.eq.right[5] = { ...params.eq.right[5], enabled: true, gain };
  return params;
}

for (const matchOn of [true, false]) {
  test(`EQ edits stay applied through 3 minutes of playback (Match Loudness ${matchOn ? 'ON, render ends at 45 s' : 'OFF'})`, async () => {
    diagnostics.enable();
    const { engine, context, file, chainCalls, processed, original } = setup();
    await engine.load(file);
    await engine.play();
    const sentBefore = processed().ramps.length;
    let last;
    for (let second = 0; second <= 180; second += 5) {
      context.currentTime = second;
      last = editedChain(1 + (second % 6));
      await engine.setChain(last);
      if (matchOn && second === 45) engine.setLoudnessMatch({ processedDb: -3.2, originalDb: 0 }); // the full-file render finally ends
    }
    // The last edit is what the chain holds; nothing replaced it, the chain was never reset.
    expect(chainCalls.params.at(-1)).toBe(last);
    expect(chainCalls.resets).toEqual([]);
    // Still listening to Processed: the Original path was never opened.
    expect(original().value).toBe(0);
    expect(processed().value).toBeCloseTo(matchOn ? 10 ** (-3.2 / 20) : 1, 6);
    const changes = processed().ramps.slice(sentBefore);
    if (matchOn) {
      // Exactly one level move, and it is a slow glide, never the 20 ms switch ramp.
      expect(changes).toHaveLength(1);
      expect(changes[0].seconds).toBeCloseTo(MATCH_RAMP_SECONDS, 6);
      expect(MATCH_RAMP_SECONDS).toBeGreaterThan(10 * RAMP_SECONDS);
    } else {
      expect(changes).toEqual([]);
    }
    const log = JSON.parse(diagnostics.export());
    expect(log.events.filter(e => e.type === 'chain.set')).toHaveLength(37);
    expect(log.events.some(e => e.type === 'monitor.listen')).toBe(false);
    expect(log.events.filter(e => e.type === 'chain.reset')).toEqual([]);
    expect(JSON.stringify(log)).not.toContain('long.wav');
  });
}

test('a Match Loudness change under 0.05 dB does not touch the gains at all', async () => {
  const { engine, file, processed } = setup();
  await engine.load(file);
  engine.setLoudnessMatch({ processedDb: -2, originalDb: 0 });
  const count = processed().ramps.length;
  engine.setLoudnessMatch({ processedDb: -2.01, originalDb: 0 });
  expect(processed().ramps).toHaveLength(count);
});

test('switching Original/Processed still uses the short ramp', async () => {
  const { engine, file, original } = setup();
  await engine.load(file);
  engine.listen('original');
  expect(original().ramps.at(-1).seconds).toBe(RAMP_SECONDS);
});

test('A/B and Undo-style settings changes keep the match gain on the right path', async () => {
  const { engine, file, processed, original } = setup();
  await engine.load(file);
  engine.setLoudnessMatch({ processedDb: -3, originalDb: 0 });
  await engine.setChain(editedChain(6));
  await engine.setChain(defaultChain()); // undo
  engine.listen('original');
  engine.listen('processed');
  expect(original().value).toBe(0);
  expect(processed().value).toBeCloseTo(10 ** (-3 / 20), 6);
});
