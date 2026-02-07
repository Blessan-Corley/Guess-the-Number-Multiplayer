const { defineConfig } = require('@playwright/test');

function parsePort(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveBaseURL() {
  const port = parsePort(process.env.E2E_PORT, 4173);
  const explicitBaseURL =
    process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE_URL || process.env.BASE_URL;

  if (!explicitBaseURL) {
    return `http://127.0.0.1:${port}`;
  }

  try {
    return new URL(explicitBaseURL).toString().replace(/\/$/, '');
  } catch {
    return `http://127.0.0.1:${port}`;
  }
}

function shouldReuseExistingServer() {
  if (typeof process.env.PLAYWRIGHT_REUSE_SERVER === 'string') {
    return process.env.PLAYWRIGHT_REUSE_SERVER !== 'false';
  }

  return !process.env.CI;
}

const baseURL = resolveBaseURL();
const parsedBaseURL = new URL(baseURL);
const baseOrigin = parsedBaseURL.origin;
const basePort = parsedBaseURL.port || (parsedBaseURL.protocol === 'https:' ? '443' : '80');

module.exports = defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  workers: 1,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer:
    process.env.PLAYWRIGHT_SKIP_WEBSERVER === 'true'
      ? undefined
      : {
          command: process.env.PLAYWRIGHT_WEB_SERVER_COMMAND || 'npm run start:e2e',
          url: baseOrigin,
          reuseExistingServer: shouldReuseExistingServer(),
          timeout: 120000,
          env: {
            ...process.env,
            E2E_PORT: basePort,
            E2E_BASE_URL: baseURL,
            APP_BASE_URL: baseURL,
            CORS_ORIGINS: process.env.CORS_ORIGINS || baseOrigin,
            SOCKET_CORS_ORIGINS: process.env.SOCKET_CORS_ORIGINS || baseOrigin,
          },
        },
});
