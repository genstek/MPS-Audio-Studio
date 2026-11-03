import { defineConfig, devices } from '@playwright/test';

// Installed Google Chrome by default. Set PLAYWRIGHT_EXECUTABLE_PATH to run another
// Chromium build instead (for example on Linux machines without Chrome).
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
const browser = executablePath ? { launchOptions: { executablePath } } : { channel: 'chrome' };

// Tests use their own account server on 8788 with a fresh data folder (ADR-003); the app you
// open by hand uses 8787. The app on 5173 forwards /api to the test server.
export const TEST_API_URL = 'http://127.0.0.1:8788';

export default defineConfig({
  testDir: './tests/e2e',
  reporter: [['list'], ['html', { open: 'never' }]],
  // Refuses to test a server on port 5173 that serves a different checkout or another API.
  globalSetup: './tests/e2e/global-setup.js',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], ...browser } }],
  webServer: [
    {
      command: 'node --disable-warning=ExperimentalWarning server/index.js',
      url: `${TEST_API_URL}/api/health`,
      reuseExistingServer: false,
      env: {
        MPS_PORT: '8788', MPS_DATA_DIR: '.data/e2e', MPS_RESET_DATA: '1', MPS_DEV_ENDPOINTS: '1',
        MPS_APP_URL: 'http://127.0.0.1:5173', MPS_LIMIT_SCALE: '20', MPS_TEST_RECIPIENT: '1',
        MPS_LOG_FILE: '.data/e2e/server.log',
      },
    },
    // Starts the app from this folder, or reuses a running one after global setup has
    // confirmed that it serves this same folder and forwards /api to the test server.
    {
      command: 'npm run dev -- --port 5173 --strictPort',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: true,
      env: { MPS_API_URL: TEST_API_URL },
    },
  ],
});
