import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev and preview servers answer /__mps-checkout with the folder they serve, so tests can
// prove that a reused server on the test port belongs to this checkout (LAS-10).
function checkoutIdentity() {
  const handler = root => (request, response, next) => {
    if (request.url !== '/__mps-checkout') return next();
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ root, pid: process.pid }));
  };
  return {
    name: 'mps-checkout-identity',
    configureServer(server) { server.middlewares.use(handler(server.config.root)); },
    configurePreviewServer(server) { server.middlewares.use(handler(server.config.root)); },
  };
}

export default defineConfig({ plugins: [react(), checkoutIdentity()] });
