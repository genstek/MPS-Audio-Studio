import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { createBridge, newToken } from './bridge.js';
import { designBand } from '../../../../src/dsp/eq-design.js';
import { biquadResponseDb } from '../../../../src/dsp/biquad.js';

// LAS-37 bridge prototype checks (run: node --test docs/delivery/LAS-37/prototype/). They exercise
// the bridge mechanics with stand-in plugins; they do not show that any VST3/AU plugin works.
const ORIGIN = 'http://127.0.0.1:5173';
const token = newToken();
let bridge, url;
before(async () => { bridge = createBridge({ token, origin: ORIGIN, timeoutMs: 800, maxBodyBytes: 2 * 1024 * 1024 }); url = await bridge.listen(); });
after(() => bridge.close());

const call = (path, { method = 'GET', body, headers = {}, auth = true } = {}) => fetch(`${url}${path}`, {
  method, body: body instanceof Uint8Array || typeof body === 'string' ? body : body === undefined ? undefined : JSON.stringify(body),
  headers: { ...(auth ? { Authorization: `Bearer ${token}` } : {}), ...headers },
});
const json = async response => ({ status: response.status, data: response.status === 204 ? null : await response.json() });
const tone = (frames, rate, freqs) => { const x = new Float32Array(frames); for (let n = 0; n < frames; n++) for (const [f, a] of freqs) x[n] += a * Math.sin(2 * Math.PI * f * n / rate); return x; };
const planar = channels => { const out = new Float32Array(channels.length * channels[0].length); channels.forEach((c, i) => out.set(c, i * c.length)); return new Uint8Array(out.buffer); };
async function processAudio(id, channels, rate = 44100) {
  const response = await call(`/v1/instances/${id}/process`, { method: 'POST', body: planar(channels), headers: { 'X-Sample-Rate': String(rate), 'X-Channels': String(channels.length), 'Content-Type': 'application/octet-stream' } });
  if (response.status !== 200) return { status: response.status, data: await response.json() };
  const data = new Float32Array(await response.arrayBuffer());
  const frames = data.length / channels.length;
  return { status: 200, channels: channels.map((_, c) => data.slice(c * frames, (c + 1) * frames)) };
}
// Level of one frequency by correlation with a reference sine and cosine.
const levelAt = (x, f, rate) => { let s = 0, c = 0; for (let n = 0; n < x.length; n++) { s += x[n] * Math.sin(2 * Math.PI * f * n / rate); c += x[n] * Math.cos(2 * Math.PI * f * n / rate); } return 20 * Math.log10(2 * Math.hypot(s, c) / x.length); };

test('requests without the pairing token or from another origin are refused; the studio preflight is answered', async () => {
  assert.equal((await call('/v1/plugins', { auth: false })).status, 401);
  assert.equal((await call('/v1/plugins', { auth: false, headers: { Authorization: `Bearer ${newToken()}` } })).status, 401);
  assert.equal((await call('/v1/plugins', { headers: { Origin: 'https://evil.example' } })).status, 403);
  const preflight = await call('/v1/plugins', { method: 'OPTIONS', auth: false, headers: { Origin: ORIGIN, 'Access-Control-Request-Private-Network': 'true' } });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(preflight.headers.get('access-control-allow-private-network'), 'true');
});

test('discovery lists plugins with their identity and parameters', async () => {
  const { status, data } = await json(await call('/v1/plugins'));
  assert.equal(status, 200);
  const eq = data.plugins.find(p => p.id === 'mps-standin-tilt-eq');
  assert.deepEqual({ vendor: eq.vendor, version: eq.version, format: eq.format }, { vendor: 'MPS prototype', version: '0.1.0', format: 'stand-in' });
  assert.deepEqual(Object.keys(eq.parameters), ['lowGainDb', 'highGainDb']);
});

test('processing through an isolated instance changes the audio measurably; bypass is exact; the input is untouched', async () => {
  const { data: created } = await json(await call('/v1/instances', { method: 'POST', body: { pluginId: 'mps-standin-tilt-eq' } }));
  const input = [tone(44100, 44100, [[100, 0.2], [10000, 0.2]]), tone(44100, 44100, [[100, 0.2], [10000, 0.2]])];
  const copy = input.map(c => Float32Array.from(c));
  assert.equal((await json(await call(`/v1/instances/${created.id}/parameters`, { method: 'PATCH', body: { highGainDb: 6 } }))).status, 200);
  const processed = await processAudio(created.id, input);
  assert.equal(processed.status, 200);
  // Expected change: the +6 dB high shelf's own transfer function at each test frequency.
  const shelf = designBand({ type: 'high-shelf', frequency: 6000, gain: 6, q: 0.707 }, 44100);
  for (const f of [100, 10000]) {
    const measured = levelAt(processed.channels[0], f, 44100) - levelAt(input[0], f, 44100);
    const expected = biquadResponseDb(shelf, f, 44100);
    assert.ok(Math.abs(measured - expected) < 0.05, `${f} Hz changed by ${measured.toFixed(2)} dB, expected ${expected.toFixed(2)} dB`);
  }
  await call(`/v1/instances/${created.id}/bypass`, { method: 'POST', body: { bypass: true } });
  const bypassed = await processAudio(created.id, input);
  assert.deepEqual(bypassed.channels, input);
  assert.deepEqual(input, copy);
  assert.equal((await json(await call(`/v1/instances/${created.id}/parameters`, { method: 'PATCH', body: { highGainDb: 40 } }))).status, 422);
  assert.equal((await json(await call(`/v1/instances/${created.id}/parameters`, { method: 'PATCH', body: { drive: 1 } }))).status, 422);
});

test('state saved from one instance restores identical processing in a new one; foreign state is refused', async () => {
  const first = (await json(await call('/v1/instances', { method: 'POST', body: { pluginId: 'mps-standin-tilt-eq' } }))).data;
  await call(`/v1/instances/${first.id}/parameters`, { method: 'PATCH', body: { lowGainDb: -4.5, highGainDb: 2 } });
  const state = (await json(await call(`/v1/instances/${first.id}/state`))).data;
  const input = [tone(22050, 44100, [[80, 0.3], [5000, 0.1]])];
  const a = await processAudio(first.id, input);
  const second = (await json(await call('/v1/instances', { method: 'POST', body: { pluginId: 'mps-standin-tilt-eq' } }))).data;
  assert.equal((await json(await call(`/v1/instances/${second.id}/state`, { method: 'PUT', body: state }))).status, 200);
  const b = await processAudio(second.id, input);
  assert.deepEqual(b.channels, a.channels);
  assert.equal((await json(await call(`/v1/instances/${second.id}/state`, { method: 'PUT', body: { ...state, pluginId: 'other' } }))).status, 409);
});

test('a crashing plugin loses only its own process; the bridge and other instances keep working', async () => {
  const eq = (await json(await call('/v1/instances', { method: 'POST', body: { pluginId: 'mps-standin-tilt-eq' } }))).data;
  const crash = (await json(await call('/v1/instances', { method: 'POST', body: { pluginId: 'mps-standin-crash' } }))).data;
  const input = [tone(4410, 44100, [[440, 0.2]])];
  const crashed = await processAudio(crash.id, input);
  assert.equal(crashed.status, 502);
  assert.equal(crashed.data.error, 'plugin_crashed');
  assert.equal(crashed.data.exit.code, 70);
  assert.equal((await json(await call(`/v1/instances/${crash.id}`))).data.status, 'crashed');
  assert.equal((await processAudio(crash.id, input)).status, 409); // must be reloaded
  assert.equal((await call('/v1/plugins')).status, 200);
  assert.equal((await processAudio(eq.id, input)).status, 200);
});

test('a hanging plugin is stopped after the timeout instead of blocking the bridge', async () => {
  const hang = (await json(await call('/v1/instances', { method: 'POST', body: { pluginId: 'mps-standin-hang' } }))).data;
  const started = Date.now();
  const result = await processAudio(hang.id, [tone(4410, 44100, [[440, 0.2]])]);
  assert.equal(result.status, 504);
  assert.equal(result.data.error, 'plugin_timeout');
  assert.ok(Date.now() - started < 3000);
  assert.equal((await json(await call(`/v1/instances/${hang.id}`))).data.status, 'timed out');
  assert.equal((await call('/v1/plugins')).status, 200);
});

test('oversized bodies, bad formats and unknown plugins or instances are refused clearly', async () => {
  const eq = (await json(await call('/v1/instances', { method: 'POST', body: { pluginId: 'mps-standin-tilt-eq' } }))).data;
  const big = await call(`/v1/instances/${eq.id}/process`, { method: 'POST', body: new Uint8Array(3 * 1024 * 1024), headers: { 'X-Sample-Rate': '44100', 'X-Channels': '2' } });
  assert.equal(big.status, 413);
  assert.equal((await processAudio(eq.id, [new Float32Array(10), new Float32Array(10), new Float32Array(10)])).status, 422);
  assert.equal((await json(await call('/v1/instances', { method: 'POST', body: { pluginId: 'not-installed' } }))).status, 404);
  assert.equal((await call('/v1/instances/ffffffffffffffff')).status, 404);
  assert.equal((await call(`/v1/instances/${eq.id}`, { method: 'DELETE' })).status, 204);
});
