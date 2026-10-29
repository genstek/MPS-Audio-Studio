import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

// Password hashing and random tokens (ADR-003).
export const SCRYPT_COST = 2 ** 15;
const SCRYPT_OPTIONS = { r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const KEY_LENGTH = 64;

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString('base64url');
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function derive(password, salt, cost) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, { ...SCRYPT_OPTIONS, N: cost }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

// Stored as "<cost>$<hex key>" so the cost can be raised later without breaking old hashes.
export async function hashPassword(password, cost = SCRYPT_COST) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, cost);
  return { hash: `${cost}$${key.toString('hex')}`, salt };
}

export async function verifyPassword(password, stored, salt) {
  const [cost, expectedHex] = stored.split('$');
  const expected = Buffer.from(expectedHex, 'hex');
  const actual = await derive(password, salt, Number(cost));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function normalizeEmail(value) {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function validPassword(value) {
  return typeof value === 'string' && value.length >= 10 && value.length <= 128 && value.trim().length > 0;
}
