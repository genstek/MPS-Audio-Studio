import { createServer } from 'node:http';
import { fork } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { STAND_INS } from './plugins.js';

// LAS-37 prototype of a local plugin-host bridge for the web studio. It listens on 127.0.0.1 only,
// answers only requests that carry the pairing token (and, from a browser, the studio's origin),
// runs every plugin instance in its own process, and contains crashes and hangs. Audio crosses as
// planar little-endian float32 with X-Sample-Rate and X-Channels headers. Plugins here are stand-ins.
export const newToken = () => randomBytes(32).toString('base64url');
const HOST = fileURLToPath(new URL('./host.js', import.meta.url));

export function createBridge({ token, origin, timeoutMs = 10_000, maxBodyBytes = 64 * 1024 * 1024, plugins = STAND_INS }) {
  const instances = new Map();
  let nextRequest = 1;
  const expected = Buffer.from(`Bearer ${token}`);

  const send = (response, status, body, headers = {}) => {
    const isAudio = Buffer.isBuffer(body);
    response.writeHead(status, { 'Content-Type': isAudio ? 'application/octet-stream' : 'application/json', 'Cache-Control': 'no-store', ...headers });
    response.end(isAudio ? body : JSON.stringify(body));
  };
  const cors = request => (request.headers.origin === origin ? { 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {});
  const authorised = request => {
    const given = Buffer.from(request.headers.authorization ?? '');
    return given.length === expected.length && timingSafeEqual(given, expected);
  };
  // An oversized body is read and discarded (up to four times the limit) before the 413 answer,
  // so the client is still listening when the answer comes instead of seeing a reset connection.
  async function readBody(request) {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 4 * maxBodyBytes) { request.destroy(); break; }
      if (size <= maxBodyBytes) chunks.push(chunk);
    }
    if (size > maxBodyBytes) throw Object.assign(new Error('body_too_large'), { status: 413 });
    return Buffer.concat(chunks);
  }
  const identity = (id, p) => ({ id, name: p.name, vendor: p.vendor, version: p.version, format: p.format, parameters: p.parameters });

  function spawnHost(instance) {
    const child = fork(HOST, [], { serialization: 'advanced', stdio: ['ignore', 'ignore', 'ignore', 'ipc'], execArgv: ['--max-old-space-size=256'] });
    instance.child = child;
    instance.status = 'running';
    child.on('exit', (code, signal) => {
      if (instance.child !== child) return;
      instance.status = 'crashed';
      instance.exit = { code, signal };
      for (const pending of instance.pending.values()) pending.reject(Object.assign(new Error('plugin_crashed'), { status: 502 }));
      instance.pending.clear();
    });
    child.on('message', message => {
      const pending = instance.pending.get(message.id);
      if (!pending) return;
      instance.pending.delete(message.id);
      if (message.ok) pending.resolve(message.channels);
      else pending.reject(Object.assign(new Error(message.message), { status: 500 }));
    });
  }

  function runOnHost(instance, channels, sampleRate) {
    return new Promise((resolve, reject) => {
      const id = nextRequest++;
      const timer = setTimeout(() => {
        instance.pending.delete(id);
        instance.child.kill('SIGKILL'); // a hung plugin is stopped; the instance must be reloaded
        instance.status = 'timed out';
        reject(Object.assign(new Error('plugin_timeout'), { status: 504 }));
      }, timeoutMs);
      instance.pending.set(id, { resolve: v => { clearTimeout(timer); resolve(v); }, reject: e => { clearTimeout(timer); reject(e); } });
      instance.child.send({ id, pluginId: instance.pluginId, parameters: instance.parameters, channels, sampleRate });
    });
  }

  const routes = [
    ['GET', /^\/v1\/plugins$/, () => ({ body: { plugins: Object.entries(plugins).map(([id, p]) => identity(id, p)) } })],
    ['POST', /^\/v1\/instances$/, async ({ request }) => {
      const { pluginId } = JSON.parse((await readBody(request)).toString() || '{}');
      const plugin = plugins[pluginId];
      if (!plugin) return { status: 404, body: { error: 'plugin_not_found', message: `No plugin ${pluginId} is available.` } };
      const id = randomBytes(8).toString('hex');
      const parameters = Object.fromEntries(Object.entries(plugin.parameters).map(([k, v]) => [k, v.default]));
      const instance = { id, pluginId, parameters, bypass: false, pending: new Map() };
      spawnHost(instance);
      instances.set(id, instance);
      return { status: 201, body: { id, plugin: identity(pluginId, plugin) } };
    }],
    ['GET', /^\/v1\/instances\/(\w+)$/, ({ instance }) => ({ body: { id: instance.id, pluginId: instance.pluginId, status: instance.status, parameters: instance.parameters, bypass: instance.bypass } })],
    ['PATCH', /^\/v1\/instances\/(\w+)\/parameters$/, async ({ request, instance }) => {
      const changes = JSON.parse((await readBody(request)).toString() || '{}');
      const spec = plugins[instance.pluginId].parameters;
      for (const [name, value] of Object.entries(changes)) {
        if (!spec[name]) return { status: 422, body: { error: 'unknown_parameter', message: `${name} is not a parameter of this plugin.` } };
        if (typeof value !== 'number' || value < spec[name].min || value > spec[name].max) return { status: 422, body: { error: 'parameter_out_of_range', message: `${name} must be between ${spec[name].min} and ${spec[name].max}.` } };
      }
      Object.assign(instance.parameters, changes);
      return { body: { parameters: instance.parameters } };
    }],
    ['GET', /^\/v1\/instances\/(\w+)\/state$/, ({ instance }) => ({ body: { pluginId: instance.pluginId, version: plugins[instance.pluginId].version, parameters: instance.parameters, bypass: instance.bypass } })],
    ['PUT', /^\/v1\/instances\/(\w+)\/state$/, async ({ request, instance }) => {
      const state = JSON.parse((await readBody(request)).toString() || '{}');
      if (state.pluginId !== instance.pluginId || state.version !== plugins[instance.pluginId].version) return { status: 409, body: { error: 'state_mismatch', message: 'This state belongs to another plugin or version.' } };
      instance.parameters = { ...state.parameters };
      instance.bypass = Boolean(state.bypass);
      return { body: { restored: true } };
    }],
    ['POST', /^\/v1\/instances\/(\w+)\/bypass$/, async ({ request, instance }) => {
      instance.bypass = Boolean(JSON.parse((await readBody(request)).toString() || '{}').bypass);
      return { body: { bypass: instance.bypass } };
    }],
    ['POST', /^\/v1\/instances\/(\w+)\/process$/, async ({ request, instance }) => {
      const sampleRate = Number(request.headers['x-sample-rate']);
      const count = Number(request.headers['x-channels']);
      if (!(sampleRate >= 8000 && sampleRate <= 384000) || !(count === 1 || count === 2)) return { status: 422, body: { error: 'bad_audio_format', message: 'X-Sample-Rate (8–384 kHz) and X-Channels (1 or 2) are required.' } };
      if (instance.status !== 'running') return { status: 409, body: { error: 'instance_not_running', message: `The plugin instance is ${instance.status}; load it again.` } };
      const body = await readBody(request);
      const frames = body.length / 4 / count;
      if (!Number.isInteger(frames)) return { status: 422, body: { error: 'bad_audio_length' } };
      const data = new Float32Array(body.buffer.slice(body.byteOffset, body.byteOffset + body.length));
      const channels = Array.from({ length: count }, (_, c) => data.slice(c * frames, (c + 1) * frames));
      const output = instance.bypass ? channels : await runOnHost(instance, channels, sampleRate);
      const out = new Float32Array(frames * count);
      output.forEach((channel, c) => out.set(channel, c * frames));
      return { status: 200, body: Buffer.from(out.buffer) };
    }],
    ['DELETE', /^\/v1\/instances\/(\w+)$/, ({ instance }) => {
      instance.child?.kill('SIGKILL');
      instances.delete(instance.id);
      return { status: 204, body: {} };
    }],
  ];

  const server = createServer(async (request, response) => {
    const headers = cors(request);
    if (request.headers.origin && request.headers.origin !== origin) return send(response, 403, { error: 'origin_not_allowed' });
    if (request.method === 'OPTIONS') {
      // Preflight from the studio, including Chrome's Private Network Access request header.
      return send(response, 204, {}, { ...headers, 'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE', 'Access-Control-Allow-Headers': 'authorization, content-type, x-sample-rate, x-channels', ...(request.headers['access-control-request-private-network'] === 'true' ? { 'Access-Control-Allow-Private-Network': 'true' } : {}) });
    }
    if (!authorised(request)) return send(response, 401, { error: 'unauthorized' }, headers);
    const url = new URL(request.url, 'http://127.0.0.1');
    for (const [method, pattern, handler] of routes) {
      const match = request.method === method && url.pathname.match(pattern);
      if (!match) continue;
      const instance = match[1] ? instances.get(match[1]) : undefined;
      if (match[1] && !instance) return send(response, 404, { error: 'instance_not_found' }, headers);
      try {
        const { status = 200, body } = await handler({ request, instance });
        return send(response, status, body, headers);
      } catch (error) {
        return send(response, error.status ?? 500, { error: error.status ? error.message : 'internal_error', ...(error.status === 502 ? { exit: instance?.exit } : {}) }, headers);
      }
    }
    return send(response, 404, { error: 'not_found' }, headers);
  });

  return {
    listen: () => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(`http://127.0.0.1:${server.address().port}`))),
    close: () => new Promise(resolve => { for (const instance of instances.values()) instance.child?.kill('SIGKILL'); server.close(resolve); }),
  };
}
