import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { startServer } from '../../server/app.js';

export const ORIGIN = 'http://studio.test';

// A real server on a random port with its own data folder, a controllable clock and captured logs.
export async function startTestServer(overrides = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), 'mps-server-'));
  const clock = { now: Date.UTC(2026, 9, 29, 12) };
  const logs = [];
  const server = await startServer({
    host: '127.0.0.1', port: 0, dataDir, resetData: false, devEndpoints: true, cookieSecure: false,
    allowedOrigins: [ORIGIN], appUrl: ORIGIN, limitScale: 1, ...overrides,
  }, { now: () => clock.now, scryptCost: 1024, log: line => logs.push(line) });
  return {
    ...server, clock, logs, dataDir,
    async stop() {
      await server.close();
      rmSync(dataDir, { recursive: true, force: true });
    },
  };
}

// A browser-like client: keeps the session cookie and sends the studio's request header.
export function client(server, { origin = ORIGIN, studioHeader = true } = {}) {
  let cookie = '';
  return {
    get cookie() { return cookie; },
    set cookie(value) { cookie = value; },
    async request(path, { method = 'GET', body, headers = {} } = {}) {
      const response = await fetch(`${server.url}${path}`, {
        method,
        headers: {
          ...(cookie ? { Cookie: cookie } : {}),
          ...(method !== 'GET' && studioHeader ? { 'X-MPS-Request': '1' } : {}),
          ...(origin ? { Origin: origin } : {}),
          ...(body === undefined || Buffer.isBuffer(body) ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body),
      });
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const value = setCookie.split(';')[0];
        cookie = value.endsWith('=') ? '' : value;
      }
      const type = response.headers.get('content-type') ?? '';
      const data = type.includes('json') ? await response.json() : Buffer.from(await response.arrayBuffer());
      return { status: response.status, data, headers: response.headers };
    },
  };
}

export const latestMail = async (server, email) => (await client(server).request(`/api/dev/outbox?to=${encodeURIComponent(email)}`)).data.messages[0];
export const linkToken = (mail, name) => new URL(mail.body.match(/https?:\/\/\S+/)[0]).searchParams.get(name);

// Registers and verifies an account, then signs in; returns its signed-in client.
export async function signedInUser(server, email, password = 'correct horse battery') {
  const user = client(server);
  await user.request('/api/auth/register', { method: 'POST', body: { email, password } });
  const token = linkToken(await latestMail(server, email), 'verify');
  await user.request('/api/auth/verify', { method: 'POST', body: { token } });
  const login = await user.request('/api/auth/login', { method: 'POST', body: { email, password } });
  if (login.status !== 200) throw new Error(`login failed: ${login.status}`);
  return user;
}
