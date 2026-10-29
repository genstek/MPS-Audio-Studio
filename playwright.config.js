import { defineConfig, devices } from '@playwright/test';

// Installed Google Chrome by default. Set PLAYWRIGHT_EXECUTABLE_PATH to run another
// Chromium build instead (for example on Linux machines without Chrome).
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const browser = executablePath ? { launchOptions: { executablePath } } : { channel: 'chrome' };

export default defineConfig({
  testDir: './tests/e2e',
  reporter: [['list'], ['html', { open: 'never' }]],
  // Refuses to test a server on port 5173 that serves a different checkout.
  globalSetup: './tests/e2e/global-setup.js',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...browser } }],
  // Starts the app from this folder, or reuses a running one after global setup has
  // confirmed that it serves this same folder.
  webServer: {
    command: 'npm run dev -- --port 5173 --strictPort',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: true,
  },
});
