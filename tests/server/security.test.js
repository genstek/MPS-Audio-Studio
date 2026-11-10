import { afterEach, expect, test } from 'vitest';
import { hashPassword } from '../../server/security.js';
import { client, latestMail, linkToken, startTestServer } from './helpers.js';

// LAS-25 finding: registration answered faster for addresses that already had an account (no
// password hashing on that path), so timing revealed which addresses exist. Every path now hashes.
// LAS-168: the check was flaky on shared runners (cold first request, noisy medians of 3) and it
// also hid a second asymmetry: the new-address path did five separately committed writes.
let server;
afterEach(async () => { await server?.stop(); server = undefined; });

const PASSWORD = 'correct horse battery';
const min = values => Math.min(...values);

// Scheduler noise only ever adds time, so the minimum of many samples is the stable estimate of
// the work a path must do. A path "leaks" when its floor is materially below the other's.
export function leaksByTiming(samples, reference, ratio = 0.6) {
  return min(samples) < min(reference) * ratio;
}

async function register(email) {
  server.clock.now += 60 * 60 * 1000; // a fresh hour: the per-address registration limit is 3/h
  const started = performance.now();
  const response = await client(server).request('/api/auth/register', { method: 'POST', body: { email, password: PASSWORD } });
  const ms = performance.now() - started;
  expect(response.status).toBe(202); // a 429 would be fast and silently skew the timing
  return { response, ms };
}

test('registration answers identically for new, unverified and verified addresses', async () => {
  server = await startTestServer({ limitScale: 100 });
  await register('verified@example.test');
  await client(server).request('/api/auth/verify', { method: 'POST', body: { token: linkToken(await latestMail(server, 'verified@example.test'), 'verify') } });
  await register('unverified@example.test');
  const answers = [];
  for (const email of ['brand-new@example.test', 'unverified@example.test', 'verified@example.test']) {
    const { response } = await register(email);
    answers.push({ status: response.status, body: response.data });
  }
  expect(answers[0].status).toBe(202);
  expect(answers[1]).toEqual(answers[0]);
  expect(answers[2]).toEqual(answers[0]);
});

test('registering an existing address takes about as long as registering a new one', async () => {
  // A realistic scrypt cost, so password hashing dominates the request time as in production.
  server = await startTestServer({ limitScale: 100 }, { scryptCost: 2 ** 14 });
  const existing = 'taken@example.test';
  await register(existing);
  await client(server).request('/api/auth/verify', { method: 'POST', body: { token: linkToken(await latestMail(server, existing), 'verify') } });
  await register('warmup@example.test'); // the first new-address request is cold (statements, thread pool)
  const fresh = [];
  const taken = [];
  for (let round = 0; round < 12; round++) { // interleaved, so drift hits both paths alike
    fresh.push((await register(`new${round}@example.test`)).ms);
    taken.push((await register(existing)).ms);
  }
  const detail = `existing min ${Math.round(min(taken))} ms vs new min ${Math.round(min(fresh))} ms`;
  expect(leaksByTiming(taken, fresh), detail).toBe(false);
  expect(leaksByTiming(fresh, taken), detail).toBe(false);
});

// Control: the detector must fail when the existing-address path skips hashing, as it did in LAS-25.
test('the timing check catches a path that skips password hashing', async () => {
  const measure = async work => { const started = performance.now(); await work(); return performance.now() - started; };
  const secure = async () => { await hashPassword(PASSWORD, 2 ** 14); };
  const vulnerable = async () => {};
  const fresh = [];
  const secureTaken = [];
  const vulnerableTaken = [];
  for (let round = 0; round < 12; round++) {
    fresh.push(await measure(secure));
    secureTaken.push(await measure(secure));
    vulnerableTaken.push(await measure(vulnerable));
  }
  expect(leaksByTiming(vulnerableTaken, fresh)).toBe(true);
  expect(leaksByTiming(secureTaken, fresh)).toBe(false);
});
