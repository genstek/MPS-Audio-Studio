const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

// Abuse limits (LAS-22). Per-email limits protect each account the same way whether or not it
// exists; per-IP limits slow down one client spraying many addresses. MPS_LIMIT_SCALE multiplies
// only the per-IP limits (tests run every browser from 127.0.0.1).
export const LIMITS = {
  loginFailuresPerEmail: { limit: 5, windowMs: 15 * MINUTE },
  loginFailuresPerIp: { limit: 50, windowMs: 15 * MINUTE, perIp: true },
  registerPerEmail: { limit: 3, windowMs: HOUR },
  registerPerIp: { limit: 10, windowMs: HOUR, perIp: true },
  mailPerEmail: { limit: 3, windowMs: HOUR },
  mailPerIp: { limit: 20, windowMs: HOUR, perIp: true },
  tokenPerIp: { limit: 30, windowMs: 15 * MINUTE, perIp: true },
};

// Sliding-window counters kept in memory: they reset when the server restarts (ADR-003).
export function createLimiter({ now, scale = 1 }) {
  const hits = new Map();
  const limitOf = rule => (rule.perIp ? rule.limit * scale : rule.limit);
  const recent = (key, windowMs) => (hits.get(key) ?? []).filter(time => time > now() - windowMs);
  return {
    // Seconds to wait before `key` may be used again under `rule`; 0 when allowed.
    retryAfter(rule, key) {
      const list = recent(key, rule.windowMs);
      hits.set(key, list);
      return list.length >= limitOf(rule) ? Math.max(1, Math.ceil((list[0] + rule.windowMs - now()) / 1000)) : 0;
    },
    hit(key) {
      hits.set(key, [...(hits.get(key) ?? []), now()]);
    },
    prune() {
      for (const [key, list] of hits) if (!list.some(time => time > now() - HOUR)) hits.delete(key);
    },
  };
}
