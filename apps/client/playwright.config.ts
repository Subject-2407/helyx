import { defineConfig, devices } from '@playwright/test';
import { DEV_PORTS } from './dev-ports.js';

const isCi = Boolean(process.env['CI']);
const PREVIEW_URL = `http://localhost:${String(DEV_PORTS.CLIENT_E2E)}`;
/** A cold production build plus server start can take a while on CI machines. */
const WEB_SERVER_TIMEOUT_MS = 180_000;

/**
 * The tests build into their own folder and serve it on their own port, never reusing a server
 * that is already running. A preview left over from an earlier run, or a second run rebuilding
 * the same folder, could otherwise serve a half-written build; now the port clash fails the run
 * up front instead.
 */
const E2E_OUT_DIR = 'dist-e2e';
const WEB_SERVER_COMMAND = [
  `pnpm exec vite build --outDir ${E2E_OUT_DIR}`,
  `pnpm exec vite preview --outDir ${E2E_OUT_DIR} --port ${String(DEV_PORTS.CLIENT_E2E)}`,
].join(' && ');

export default defineConfig({
  testDir: './e2e',
  retries: 1,
  forbidOnly: isCi,
  reporter: isCi ? 'github' : 'list',
  use: {
    baseURL: PREVIEW_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
  ],
  webServer: {
    command: WEB_SERVER_COMMAND,
    url: PREVIEW_URL,
    reuseExistingServer: false,
    timeout: WEB_SERVER_TIMEOUT_MS,
  },
});
