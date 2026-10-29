import { resolve } from 'node:path';

// Server settings come from environment variables; defaults suit local development (ADR-003).
export function configFromEnv(env = process.env) {
  const port = Number(env.MPS_PORT ?? 8787);
  return {
    host: env.MPS_HOST ?? '127.0.0.1',
    port,
    dataDir: resolve(env.MPS_DATA_DIR ?? '.data/dev'),
    resetData: env.MPS_RESET_DATA === '1',
    devEndpoints: env.MPS_DEV_ENDPOINTS === '1',
    cookieSecure: env.MPS_COOKIE_SECURE === '1',
    allowedOrigins: (env.MPS_ALLOWED_ORIGINS ?? [5173, 5174].flatMap(p => [`http://127.0.0.1:${p}`, `http://localhost:${p}`]).join(','))
      .split(',').map(origin => origin.trim()).filter(Boolean),
    appUrl: env.MPS_APP_URL ?? 'http://127.0.0.1:5174',
    limitScale: Number(env.MPS_LIMIT_SCALE ?? 1),
  };
}
