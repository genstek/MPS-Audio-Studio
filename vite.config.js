import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

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

// Build provenance (LAS-58): short git SHA shown in the UI so an old native bundle is recognisable.
function gitSha() {
  try { return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return 'unknown'; }
}

export default defineConfig({ define: { __MPS_BUILD__: JSON.stringify(gitSha()) }, plugins: [react(), checkoutIdentity()], server: { proxy }, preview: { proxy } });
