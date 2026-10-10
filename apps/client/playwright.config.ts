import { defineConfig, devices } from '@playwright/test';
import { DEV_PORTS } from './dev-ports.js';

const isCi = Boolean(process.env['CI']);
const PREVIEW_URL = `http://localhost:${DEV_PORTS.CLIENT_PREVIEW}`;
/** A cold production build plus server start can take a while on CI machines. */
const WEB_SERVER_TIMEOUT_MS = 180_000;

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
    command: 'pnpm run build && pnpm run preview',
    url: PREVIEW_URL,
    reuseExistingServer: !isCi,
    timeout: WEB_SERVER_TIMEOUT_MS,
  },
});
