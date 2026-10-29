import { test, expect } from '@playwright/test';

// LAS-27: preview (AudioWorklet in the browser's real audio engine) and export (renderChain) run
// the same chain code. Rendering a known signal both ways must give the same samples. This checks
// the shared implementation and the latency bookkeeping; the DSP itself is validated by unit tests.
async function renderBothWays(page, { channels, sampleRate, seconds, settings }) {
  return page.evaluate(async ({ channels, sampleRate, seconds, settings }) => {
    const { renderChain } = await import('/src/dsp/chain.js');
    const { createChainNode } = await import('/src/dsp/chain-node.js');
    const params = await import('/src/dsp/chain-params.js');
    const { noise, sine } = await import('/tests/fixtures/signals.js');
    let chainParams = params.defaultChain();
    if (settings === 'busy') {
      chainParams = params.setEqMode(chainParams, 'independent');
      chainParams = params.editBand(chainParams, 'left', 4, { enabled: true, type: 'bell', frequency: 250, gain: 4, q: 0.9 });
      chainParams = params.editBand(chainParams, 'right', 20, { enabled: true, type: 'high-shelf', frequency: 9000, gain: 3, q: 0.707 });
      chainParams = params.editBand(chainParams, 'left', 0, { enabled: true, type: 'high-pass', frequency: 30, gain: 0, q: 0.707 });
      chainParams = params.validateChain({ ...chainParams, compressor: { ...chainParams.compressor, enabled: true, threshold: -24, ratio: 3, makeup: 4, detector: 'rms' }, limiter: { ...chainParams.limiter, ceiling: -1, inputGain: 6 } });
    }
    const frames = Math.round(seconds * sampleRate);
    const input = [Float32Array.from(noise({ seconds, rate: sampleRate, amplitude: 0.6, seed: 5 })), Float32Array.from(sine({ frequency: 220, dbfs: -6, seconds, rate: sampleRate }))].slice(0, channels);
    const offline = renderChain(chainParams, input, sampleRate);

    const context = new OfflineAudioContext({ numberOfChannels: channels, length: frames + 2048, sampleRate });
    const buffer = new AudioBuffer({ numberOfChannels: channels, length: frames, sampleRate });
    input.forEach((channel, c) => buffer.copyToChannel(channel, c));
    const chain = await createChainNode(context, chainParams, channels);
    const source = new AudioBufferSourceNode(context, { buffer });
    source.connect(chain.node).connect(context.destination);
    source.start(0);
    const started = performance.now();
    const rendered = await context.startRendering();
    const renderMs = performance.now() - started;
    let largest = 0, peak = 0;
    for (let c = 0; c < channels; c++) {
      const preview = rendered.getChannelData(c);
      for (let n = 0; n < frames; n++) {
        largest = Math.max(largest, Math.abs(preview[n + chain.latency] - offline.channels[c][n]));
        peak = Math.max(peak, Math.abs(offline.channels[c][n]));
      }
    }
    return { latency: chain.latency, offlineLatency: offline.latency, largest, peak, renderMs, warnings: chain.warnings, limited: offline.meters.maxLimiterGainReductionDb };
  }, { channels, sampleRate, seconds, settings });
}

for (const [channels, sampleRate] of [[2, 48000], [2, 44100], [1, 96000]]) {
  test(`LAS-27: worklet preview equals the offline render (${channels === 2 ? 'stereo' : 'mono'}, ${sampleRate} Hz)`, async ({ page }, testInfo) => {
    await page.goto('/');
    const result = await renderBothWays(page, { channels, sampleRate, seconds: 2, settings: 'busy' });
    testInfo.annotations.push({ type: 'parity', description: `largest difference ${result.largest}, latency ${result.latency} samples, limiter up to ${result.limited.toFixed(2)} dB, 2 s rendered in ${Math.round(result.renderMs)} ms` });
    expect(result.latency).toBe(result.offlineLatency);
    expect(result.peak).toBeGreaterThan(0.1); // real audio came out
    expect(result.limited).toBeGreaterThan(0); // the limiter was working
    expect(result.largest).toBeLessThanOrEqual(1e-6);
  });
}

test('LAS-27: the worklet applies valid settings, refuses invalid ones and reports clamped bands', async ({ page }) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const { createChainNode } = await import('/src/dsp/chain-node.js');
    const params = await import('/src/dsp/chain-params.js');
    const context = new OfflineAudioContext({ numberOfChannels: 2, length: 32000, sampleRate: 32000 });
    const high = params.editBand(params.defaultChain(), 'left', 23, { enabled: true, frequency: 18000, gain: 2 });
    const chain = await createChainNode(context, high, 2);
    const bad = JSON.parse(JSON.stringify(high));
    bad.compressor.ratio = 99;
    const refused = await chain.setParams(bad).then(() => 'applied', error => error.message);
    const applied = await chain.setParams(params.defaultChain());
    const rejected = await createChainNode(context, bad, 2).then(() => 'created', error => error.message);
    return { initial: chain.warnings, refused, applied, rejected };
  });
  expect(result.initial).toEqual(['EQ linked band 24 at 18000 Hz is above 14400 Hz for 32000 Hz audio; it runs at 14400 Hz.']);
  expect(result.refused).toBe('Compressor ratio must be between 1 and 20; it is 99.');
  expect(result.applied).toEqual([]);
  expect(result.rejected).toBe('Compressor ratio must be between 1 and 20; it is 99.'); // no node, no hang
});
