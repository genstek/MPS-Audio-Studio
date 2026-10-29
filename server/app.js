import { createServer } from 'node:http';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { openDatabase } from './db.js';
import { HttpError, parseCookies, readJson, send } from './http.js';
import { LIMITS, createLimiter } from './limits.js';
import { libraryRoutes } from './library.js';
import { privacyRoutes } from './privacy.js';
import { SCRYPT_COST, hashPassword, normalizeEmail, randomToken, sha256, validPassword, verifyPassword } from './security.js';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
export const SESSION_IDLE_MS = 24 * HOUR;
export const SESSION_MAX_MS = 7 * 24 * HOUR;
export const VERIFY_TOKEN_MS = 24 * HOUR;
export const RESET_TOKEN_MS = 30 * MINUTE;
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
  const limiter = createLimiter({ now, scale: config.limitScale });

  // Throws 429 when any of the (rule, key) pairs is exhausted; `count` also records this request.
  function limit(request, checks, { count = true } = {}) {
    const keyed = checks.map(([rule, key]) => [rule, `${key}:${rule.perIp ? request.socket.remoteAddress : ''}`]);
    const wait = Math.max(...keyed.map(([rule, key]) => limiter.retryAfter(rule, key)));
    if (wait > 0) {
      const error = new HttpError(429, 'rate_limited', `Too many attempts. Try again in ${Math.ceil(wait / 60)} minute${wait > 60 ? 's' : ''}.`);
      error.headers = { 'Retry-After': String(wait) };
      throw error;
    }
    if (count) for (const [, key] of keyed) limiter.hit(key);
    return keyed;
  }
  limit.hit = key => limiter.hit(key);

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
    limit(request, [[LIMITS.registerPerIp, 'register'], [LIMITS.registerPerEmail, `register:${email}`]]);
    // Hash on every path, so registering an existing address takes as long as a new one and the
    // timing does not reveal which addresses have accounts (found in LAS-25).
    const { hash, salt } = await hashPassword(input.password, scryptCost);
    const existing = db.prepare('SELECT id, verified_at FROM users WHERE email = ?').get(email);
    const link = appUrl(request);
    if (existing?.verified_at) {
      mail(email, 'Someone tried to register with your email', 'An account with this email already exists. If this was you, sign in or reset your password. Otherwise you can ignore this message.');
    } else {
      let userId = existing?.id;
      if (!userId) {
        userId = randomToken(16);
        db.prepare('INSERT INTO users (id, email, password_hash, password_salt, created_at) VALUES (?, ?, ?, ?, ?)').run(userId, email, hash, salt, now());
        audit('register', userId);
      }
      const token = issueToken(userId, 'verify', VERIFY_TOKEN_MS);
      mail(email, 'Verify your MPS Audio Studio email', `Open this link to verify your email: ${link}/#verify=${token}\nThe link works once and expires in 24 hours.`);
    }
    // The same answer for new, unverified and existing addresses: no account enumeration.
    return { status: 202, body: { message: 'If this email can be registered, a verification link is on its way.' } };
  });

  route('POST', /^\/api\/auth\/verify$/, async ({ request }) => {
    const { token } = await readJson(request);
    limit(request, [[LIMITS.tokenPerIp, 'token']]);
    const userId = consumeToken(token, 'verify');
    if (!userId) throw new HttpError(400, 'invalid_token', 'This verification link is invalid or has expired. Request a new one.');
    db.prepare('UPDATE users SET verified_at = COALESCE(verified_at, ?) WHERE id = ?').run(now(), userId);
    audit('verify', userId);
    return { body: { verified: true } };
  });

  route('POST', /^\/api\/auth\/resend-verification$/, async ({ request }) => {
    const email = normalizeEmail((await readJson(request)).email);
    if (!email) throw new HttpError(400, 'invalid_email', 'Enter a valid email address.');
    limit(request, [[LIMITS.mailPerIp, 'mail'], [LIMITS.mailPerEmail, `mail:${email}`]]);
    const user = db.prepare('SELECT id, verified_at FROM users WHERE email = ?').get(email);
    if (user && !user.verified_at) {
      const token = issueToken(user.id, 'verify', VERIFY_TOKEN_MS);
      mail(email, 'Verify your MPS Audio Studio email', `Open this link to verify your email: ${appUrl(request)}/#verify=${token}\nThe link works once and expires in 24 hours.`);
    }
    return { status: 202, body: { message: 'If this email is waiting for verification, a new link is on its way.' } };
  });

  route('POST', /^\/api\/auth\/login$/, async ({ request }) => {
    const input = await readJson(request);
    const email = normalizeEmail(input.email);
    const password = typeof input.password === 'string' ? input.password : '';
    // Only failed attempts count; after five for one address that address waits 15 minutes.
    const failureKeys = limit(request, [[LIMITS.loginFailuresPerIp, 'login'], [LIMITS.loginFailuresPerEmail, `login:${email ?? 'invalid'}`]], { count: false });
    const user = email && db.prepare('SELECT id, email, password_hash, password_salt, verified_at FROM users WHERE email = ?').get(email);
    const decoyHash = await decoy;
    const passwordOk = user
      ? await verifyPassword(password, user.password_hash, user.password_salt)
      : (await verifyPassword(password, decoyHash.hash, decoyHash.salt), false);
    if (!passwordOk) {
      for (const [, key] of failureKeys) limiter.hit(key);
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

  route('POST', /^\/api\/auth\/recover$/, async ({ request }) => {
    const email = normalizeEmail((await readJson(request)).email);
    if (!email) throw new HttpError(400, 'invalid_email', 'Enter a valid email address.');
    limit(request, [[LIMITS.mailPerIp, 'mail'], [LIMITS.mailPerEmail, `mail:${email}`]]);
    const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (user) {
      const token = issueToken(user.id, 'reset', RESET_TOKEN_MS);
      mail(email, 'Reset your MPS Audio Studio password', `Open this link to choose a new password: ${appUrl(request)}/#reset=${token}\nThe link works once and expires in 30 minutes. If you did not ask for this, ignore this email.`);
      audit('recover_requested', user.id);
    }
    // The same answer whether or not the address has an account.
    return { status: 202, body: { message: 'If this email has an account, a reset link is on its way.' } };
  });

  route('POST', /^\/api\/auth\/reset$/, async ({ request }) => {
    const input = await readJson(request);
    // Check the new password first, so a typo does not use up the single-use link.
    if (!validPassword(input.password)) throw new HttpError(400, 'invalid_password', 'Use a password of 10 to 128 characters.');
    limit(request, [[LIMITS.tokenPerIp, 'token']]);
    const userId = consumeToken(input.token, 'reset');
    if (!userId) throw new HttpError(400, 'invalid_token', 'This reset link is invalid or has expired. Request a new one.');
    const { hash, salt } = await hashPassword(input.password, scryptCost);
    // Opening the emailed link proves the address, so a reset also verifies it.
    db.prepare('UPDATE users SET password_hash = ?, password_salt = ?, verified_at = COALESCE(verified_at, ?) WHERE id = ?').run(hash, salt, now(), userId);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
    const { email } = db.prepare('SELECT email FROM users WHERE id = ?').get(userId);
    mail(email, 'Your MPS Audio Studio password was changed', 'Your password was just changed and every signed-in session was signed out. If this was not you, reset your password again now.');
    audit('password_reset', userId);
    return { body: { message: 'Password changed. Sign in with your new password. You were signed out everywhere else.' } };
  });

  if (config.devEndpoints) {
    route('GET', /^\/api\/dev\/outbox$/, ({ url }) => {
      const to = normalizeEmail(url.searchParams.get('to'));
      const messages = db.prepare('SELECT subject, body, created_at AS createdAt FROM mail_outbox WHERE to_email = ? ORDER BY id DESC').all(to ?? '');
      return { body: { messages } };
    });
  }

  const library = libraryRoutes({ route, db, now, config, secret, requireUser, audit });
  privacyRoutes({ route, db, now, config, requireUser, audit, library, limit, clearSessionCookie: () => sessionCookie('', 0) });

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

  // An error answer to a request whose body was not read yet: read and discard the body first, so
  // the connection is not cut while a client or proxy is still sending (they would lose the
  // answer). Bodies beyond the upload limit are not read; that answer closes the connection.
  async function discardBody(request) {
    if (request.complete || request.destroyed) return true;
    const limit = config.maxUploadBytes ?? 100 * 1024 * 1024;
    let size = Number(request.headers['content-length'] ?? 0);
    if (size > limit) return false;
    size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > limit) return false;
    }
    return true;
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
      if (response.headersSent) {
        // A streamed response failed part-way (for example the client went away): just end it.
        log(`error after response started ${request.method} ${url.pathname}: ${error.code ?? error.name}`);
        status = response.statusCode;
        response.destroy();
      } else {
        const known = error instanceof HttpError;
        if (!known) log(`error ${request.method} ${url.pathname}: ${error.name}`);
        status = known ? error.status : 500;
        const drained = await discardBody(request).catch(() => false);
        send(response, status,
          known ? { error: error.code, message: error.message } : { error: 'server_error', message: 'Something went wrong. Try again.' },
          { ...(known ? error.headers : {}), ...(drained ? {} : { Connection: 'close' }) });
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
    limiter.prune();
  }

  const server = createServer((request, response) => { void handle(request, response); });
  return { server, db, sweep, routes: route, library };
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
