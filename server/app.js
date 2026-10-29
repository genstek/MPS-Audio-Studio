import { createServer } from 'node:http';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from './db.js';
import { HttpError, parseCookies, readJson, send } from './http.js';
import { SCRYPT_COST, hashPassword, normalizeEmail, randomToken, sha256, validPassword, verifyPassword } from './security.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
export const SESSION_IDLE_MS = 24 * HOUR;
export const SESSION_MAX_MS = 7 * 24 * HOUR;
export const VERIFY_TOKEN_MS = 24 * HOUR;
const OUTBOX_KEEP_MS = 24 * HOUR;
const AUDIT_KEEP_MS = 90 * 24 * HOUR;
const COOKIE = 'mps_session';

function loadSecret(dataDir) {
  const path = join(dataDir, 'server-secret');
  if (!existsSync(path)) writeFileSync(path, randomToken(32), { mode: 0o600 });
  chmodSync(path, 0o600);
  return readFileSync(path, 'utf8');
}

// Builds the account server. `now` and `scryptCost` can be replaced in tests.
export function createApp(config, { now = () => Date.now(), scryptCost = SCRYPT_COST, log = line => console.log(line) } = {}) {
  mkdirSync(config.dataDir, { recursive: true });
  const db = openDatabase(join(config.dataDir, 'studio.sqlite'));
  const secret = loadSecret(config.dataDir);
  // A password hash to compare against when the email is unknown, so both paths take as long.
  const decoy = hashPassword(randomToken(), scryptCost);
  const userHash = id => (id ? sha256(`${secret}:${id}`).slice(0, 16) : null);

  const audit = (event, userId = null, itemId = null) => db.prepare(
    'INSERT INTO audit (event, user_hash, item_id, created_at) VALUES (?, ?, ?, ?)',
  ).run(event, userHash(userId), itemId, now());

  function mail(to, subject, body) {
    db.prepare('INSERT INTO mail_outbox (to_email, subject, body, created_at) VALUES (?, ?, ?, ?)').run(to, subject, body, now());
  }

  function issueToken(userId, purpose, lifetime) {
    const token = randomToken();
    db.prepare('DELETE FROM email_tokens WHERE user_id = ? AND purpose = ?').run(userId, purpose);
    db.prepare('INSERT INTO email_tokens (token_hash, user_id, purpose, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(sha256(token), userId, purpose, now(), now() + lifetime);
    return token;
  }

  // Single use: the token row is deleted whether it was still valid or not.
  function consumeToken(token, purpose) {
    if (typeof token !== 'string' || token.length > 200) return null;
    const row = db.prepare('SELECT user_id, expires_at FROM email_tokens WHERE token_hash = ? AND purpose = ?').get(sha256(token), purpose);
    if (!row) return null;
    db.prepare('DELETE FROM email_tokens WHERE token_hash = ?').run(sha256(token));
    return row.expires_at > now() ? row.user_id : null;
  }

  function sessionCookie(token, maxAgeSeconds) {
    return `${COOKIE}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAgeSeconds}${config.cookieSecure ? '; Secure' : ''}`;
  }

  // The signed-in user, or null for anonymous, unknown, expired or revoked sessions.
  function currentUser(request) {
    const token = parseCookies(request.headers.cookie)[COOKIE];
    if (!token) return null;
    const tokenHash = sha256(token);
    const row = db.prepare(`SELECT s.user_id, s.last_seen_at, s.expires_at, u.email FROM sessions s
      JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`).get(tokenHash);
    if (!row) return null;
    const time = now();
    if (row.expires_at <= time || time - row.last_seen_at >= SESSION_IDLE_MS) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
      return null;
    }
    if (time - row.last_seen_at > MINUTE) db.prepare('UPDATE sessions SET last_seen_at = ? WHERE token_hash = ?').run(time, tokenHash);
    return { id: row.user_id, email: row.email, tokenHash };
  }

  function requireUser(request) {
    const user = currentUser(request);
    if (!user) throw new HttpError(401, 'unauthenticated');
    return user;
  }

  // Links in emails return to the app the request came from, when that origin is allowed.
  function appUrl(request) {
    const origin = request.headers.origin;
    return origin && config.allowedOrigins.includes(origin) ? origin : config.appUrl;
  }

  const routes = [];
  const route = (method, pattern, handler) => routes.push({ method, pattern, handler });

  route('GET', /^\/api\/health$/, () => ({ body: { ok: true } }));

  route('GET', /^\/api\/auth\/session$/, ({ request }) => {
    const user = currentUser(request);
    return { body: { user: user ? { email: user.email } : null } };
  });

  route('POST', /^\/api\/auth\/register$/, async ({ request }) => {
    const input = await readJson(request);
    const email = normalizeEmail(input.email);
    if (!email) throw new HttpError(400, 'invalid_email', 'Enter a valid email address.');
    if (!validPassword(input.password)) throw new HttpError(400, 'invalid_password', 'Use a password of 10 to 128 characters.');
    const existing = db.prepare('SELECT id, verified_at FROM users WHERE email = ?').get(email);
    const link = appUrl(request);
    if (existing?.verified_at) {
      mail(email, 'Someone tried to register with your email', 'An account with this email already exists. If this was you, sign in or reset your password. Otherwise you can ignore this message.');
    } else {
      let userId = existing?.id;
      if (!userId) {
        userId = randomToken(16);
        const { hash, salt } = await hashPassword(input.password, scryptCost);
        db.prepare('INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, email, hash, salt, now());
        audit('register', userId);
      }
      const token = issueToken(userId, 'verify', VERIFY_TOKEN_MS);
      mail(email, 'Verify your MPS Audio Studio email', `Open this link to verify your email: ${link}/?verify=${token}\nThe link works once and expires in 24 hours.`);
    }
    // The same answer for new, unverified and existing addresses: no account enumeration.
    return { status: 202, body: { message: 'If this email can be registered, a verification link is on its way.' } };
  });

  route('POST', /^\/api\/auth\/verify$/, async ({ request }) => {
    const { token } = await readJson(request);
    const userId = consumeToken(token, 'verify');
    if (!userId) throw new HttpError(400, 'invalid_token', 'This verification link is invalid or has expired. Request a new one.');
    db.prepare('UPDATE users SET verified_at = COALESCE(verified_at, ?) WHERE id = ?').run(now(), userId);
    audit('verify', userId);
    return { body: { verified: true } };
  });

  route('POST', /^\/api\/auth\/resend-verification$/, async ({ request }) => {
    const email = normalizeEmail((await readJson(request)).email);
    const user = email && db.prepare('SELECT id, verified_at FROM users WHERE email = ?').get(email);
    if (user && !user.verified_at) {
      const token = issueToken(user.id, 'verify', VERIFY_TOKEN_MS);
      mail(email, 'Verify your MPS Audio Studio email', `Open this link to verify your email: ${appUrl(request)}/?verify=${token}\nThe link works once and expires in 24 hours.`);
    }
    return { status: 202, body: { message: 'If this email is waiting for verification, a new link is on its way.' } };
  });

  route('POST', /^\/api\/auth\/login$/, async ({ request }) => {
    const input = await readJson(request);
    const email = normalizeEmail(input.email);
    const password = typeof input.password === 'string' ? input.password : '';
    const user = email && db.prepare('SELECT id, email, password_hash, password_salt, verified_at FROM users WHERE email = ?').get(email);
    const decoyHash = await decoy;
    const passwordOk = user
      ? await verifyPassword(password, user.password_hash, user.password_salt)
      : (await verifyPassword(password, decoyHash.hash, decoyHash.salt), false);
    if (!passwordOk) {
      audit('login_failed', user?.id);
      throw new HttpError(401, 'invalid_credentials', 'Email or password is incorrect.');
    }
    if (!user.verified_at) throw new HttpError(403, 'unverified', 'Verify your email first. We can send a new link.');
    const token = randomToken();
    const time = now();
    db.prepare('INSERT INTO sessions (token_hash, user_id, created_at, last_seen_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(sha256(token), user.id, time, time, time + SESSION_MAX_MS);
    audit('login', user.id);
    return { body: { user: { email: user.email } }, headers: { 'Set-Cookie': sessionCookie(token, SESSION_MAX_MS / 1000) } };
  });

  route('POST', /^\/api\/auth\/logout$/, ({ request }) => {
    const user = currentUser(request);
    if (user) {
      db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(user.tokenHash);
      audit('logout', user.id);
    }
    return { status: 204, headers: { 'Set-Cookie': sessionCookie('', 0) } };
  });

  if (config.devEndpoints) {
    route('GET', /^\/api\/dev\/outbox$/, ({ url }) => {
      const to = normalizeEmail(url.searchParams.get('to'));
      const messages = db.prepare('SELECT subject, body, created_at AS createdAt FROM mail_outbox WHERE to_email = ? ORDER BY id DESC').all(to ?? '');
      return { body: { messages } };
    });
  }

  // Protected-route probe used by tests and the UI: proves the session is accepted server-side.
  route('GET', /^\/api\/account$/, ({ request }) => ({ body: { email: requireUser(request).email } }));

  // State-changing requests must come from the studio itself (ADR-003 CSRF rule).
  function checkRequestOrigin(request) {
    if (request.method === 'GET' || request.method === 'HEAD') return;
    if (request.headers['x-mps-request'] !== '1') throw new HttpError(403, 'csrf', 'Request blocked.');
    const origin = request.headers.origin;
    if (origin && !config.allowedOrigins.includes(origin)) throw new HttpError(403, 'csrf', 'Request blocked.');
    if (request.headers['sec-fetch-site'] === 'cross-site') throw new HttpError(403, 'csrf', 'Request blocked.');
  }

  async function handle(request, response) {
    const started = now();
    const url = new URL(request.url, 'http://localhost');
    let status = 500;
    try {
      const match = routes.find(r => r.method === request.method && r.pattern.test(url.pathname));
      if (!match) throw new HttpError(404, 'not_found');
      checkRequestOrigin(request);
      const result = await match.handler({ request, response, url, params: url.pathname.match(match.pattern).slice(1) });
      if (result?.raw) {
        status = response.statusCode;
        return;
      }
      status = result.status ?? 200;
      send(response, status, result.body, result.headers);
    } catch (error) {
      if (error instanceof HttpError) {
        status = error.status;
        send(response, status, { error: error.code, message: error.message }, error.headers);
      } else {
        log(`error ${request.method} ${url.pathname}: ${error.name}`);
        send(response, 500, { error: 'server_error', message: 'Something went wrong. Try again.' });
      }
    } finally {
      // Method, path without query string, status and time only: no bodies, cookies or tokens.
      log(`${request.method} ${url.pathname} ${status} ${now() - started}ms`);
    }
  }

  function sweep() {
    const time = now();
    db.prepare('DELETE FROM sessions WHERE expires_at <= ? OR last_seen_at <= ?').run(time, time - SESSION_IDLE_MS);
    db.prepare('DELETE FROM email_tokens WHERE expires_at <= ?').run(time);
    db.prepare('DELETE FROM mail_outbox WHERE created_at <= ?').run(time - OUTBOX_KEEP_MS);
    db.prepare('DELETE FROM audit WHERE created_at <= ?').run(time - AUDIT_KEEP_MS);
  }

  const server = createServer((request, response) => { void handle(request, response); });
  return { server, db, sweep, routes: route };
}

// Starts the server and resolves with its base URL and a close function.
export async function startServer(config, options) {
  const app = createApp(config, options);
  await new Promise(resolve => app.server.listen(config.port, config.host, resolve));
  const { port } = app.server.address();
  const timer = setInterval(app.sweep, 10 * MINUTE);
  timer.unref();
  return {
    ...app,
    url: `http://${config.host}:${port}`,
    close: () => new Promise(resolve => {
      clearInterval(timer);
      app.server.closeAllConnections?.();
      app.server.close(() => { app.db.close(); resolve(); });
    }),
  };
}
