import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// LAS-169: metadata is baked into the same web assets that the native apps package.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));
function sourceCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return process.env.GITHUB_SHA || 'unknown';
  }
}
const buildInfo = {
  version,
  commit: sourceCommit(),
  builtAt: new Date().toISOString(),
  runNumber: process.env.GITHUB_RUN_NUMBER || null,
  runAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  runId: process.env.GITHUB_RUN_ID || null,
};

// The account server (ADR-003). Tests point this at their own server with MPS_API_URL.
const apiTarget = process.env.MPS_API_URL ?? 'http://127.0.0.1:8787';

// Dev and preview servers answer /__mps-checkout with the folder they serve and where /api goes,
// so tests can prove that a reused server on the test port belongs to this checkout (LAS-10).
function checkoutIdentity() {
  const handler = root => (request, response, next) => {
    if (request.url !== '/__mps-checkout') return next();
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ root, pid: process.pid, api: apiTarget }));
  };
  return {
    name: 'mps-checkout-identity',
    configureServer(server) { server.middlewares.use(handler(server.config.root)); },
    configurePreviewServer(server) { server.middlewares.use(handler(server.config.root)); },
  };
}

const proxy = { '/api': { target: apiTarget } };

export default defineConfig({
  plugins: [react(), checkoutIdentity()],
  define: { 'import.meta.env.VITE_MPS_BUILD_INFO': JSON.stringify(buildInfo) },
  server: { proxy },
  preview: { proxy },
});
