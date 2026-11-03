import { afterEach, expect, test } from 'vitest';
import { client, latestMail, linkToken, startTestServer } from './helpers.js';

// LAS-25 finding: registration answered faster for addresses that already had an account (no
// password hashing on that path), so timing revealed which addresses exist. Every path now hashes.
let server;
afterEach(async () => { await server?.stop(); });

const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
async function timeRegistration(email) {
  const started = performance.now();
  const response = await client(server).request('/api/auth/register', { method: 'POST', body: { email, password: 'correct horse battery' } });
  expect(response.status).toBe(202);
  return performance.now() - started;
}

test('registering an existing address takes about as long as registering a new one', async () => {
  // A realistic scrypt cost, so password hashing dominates the request time as in production.
  server = await startTestServer({ limitScale: 100 }, { scryptCost: 2 ** 14 });
  const existing = 'taken@example.test';
  await client(server).request('/api/auth/register', { method: 'POST', body: { email: existing, password: 'correct horse battery' } });
  await client(server).request('/api/auth/verify', { method: 'POST', body: { token: linkToken(await latestMail(server, existing), 'verify') } });
  server.clock.now += 60 * 60 * 1000; // a fresh hour for the per-address registration limit (3/h)
  const fresh = [];
  const taken = [];
  for (let round = 0; round < 3; round++) {
    fresh.push(await timeRegistration(`new${round}@example.test`));
    taken.push(await timeRegistration(existing));
  }
  expect(median(taken), `existing ${taken.map(Math.round)} ms vs new ${fresh.map(Math.round)} ms`).toBeGreaterThan(median(fresh) * 0.5);
});
