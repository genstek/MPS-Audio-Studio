import { chromium } from '/home/user/MPS-Audio-Studio-delivery/node_modules/@playwright/test/index.mjs';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
page.on('crash', () => ```
Result:
```
{"latency":83,"peakDb":-6.0000004906757844}
exit 0
```
e', m.type(), m.text()));
page.on('pageerror', e => console.log('pageerror', e.message));
await page.goto('http://127.0.0.1:5198/');
const result = await page.evaluate(async () => {
  const { createChainNode } = await import('/assets/chainnode.js');
  const rate = 48000, frames = 48000;
  const context = new OfflineAudioContext({ numberOfChannels: 2, length: frames + 1024, sampleRate: rate });
  const buffer = new AudioBuffer({ numberOfChannels: 2, length: frames, sampleRate: rate });
  const tone = Float32Array.from({ length: frames }, (_, n) => 0.9 * Math.sin(2 * Math.PI * 1000 * n / rate));
  buffer.copyToChannel(tone, 0); buffer.copyToChannel(tone, 1);
  const params = { schema: 'mps-chain', version: 1, order: ['eq', 'compressor', 'limiter'],
    eq: { enabled: true, mode: 'link', left: Array.from({ length: 24 }, () => ({ enabled: false, type: 'bell', frequency: 1000, gain: 0, q: 1 })), right: Array.from({ length: 24 }, () => ({ enabled: false, type: 'bell', frequency: 1000, gain: 0, q: 1 })) },
    compressor: { enabled: false, threshold: -18, ratio: 2, attack: 10, release: 150, knee: 6, makeup: 0, detector: 'peak' },
    limiter: { enabled: true, ceiling: -6, inputGain: 0, release: 100 } };
  const chain = await createChainNode(context, params, 2);
  const source = new AudioBufferSourceNode(context, { buffer });
  source.connect(chain.node).connect(context.destination);
  source.start();
  const out = (await context.startRendering()).getChannelData(0);
  let peak = 0; for (let n = chain.latency + 4800; n < frames; n++) peak = Math.max(peak, Math.abs(out[n]));
  return { latency: chain.latency, peakDb: 20 * Math.log10(peak) };
});
console.log(JSON.stringify(result));
await browser.close();
