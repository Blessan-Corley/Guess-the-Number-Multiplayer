const { URL } = require('node:url');

function parsePort(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function resolveBaseURL() {
  const explicitBaseURL =
    process.env.E2E_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || process.env.APP_BASE_URL;

  if (explicitBaseURL) {
    try {
      return new URL(explicitBaseURL).toString().replace(/\/$/, '');
    } catch {
      // Fall through to the port-based default.
    }
  }

  const port = parsePort(process.env.E2E_PORT || process.env.PORT, 4173);
  return `http://127.0.0.1:${port}`;
}

const baseURL = resolveBaseURL();
const url = new URL(baseURL);
const port = parsePort(
  url.port,
  parsePort(process.env.E2E_PORT || process.env.PORT, url.protocol === 'https:' ? 443 : 4173)
);

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.STORE_MODE = process.env.STORE_MODE || 'memory';
process.env.DATABASE_URL = process.env.DATABASE_URL || '';
process.env.UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL || '';
process.env.UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || '';
process.env.REDIS_URL = process.env.REDIS_URL || '';
process.env.TRUST_PROXY = process.env.TRUST_PROXY || 'false';
process.env.APP_VERSION = process.env.APP_VERSION || 'e2e';
process.env.COMMIT_SHA = process.env.COMMIT_SHA || 'e2e';
process.env.PORT = String(port);
process.env.E2E_PORT = process.env.PORT;
process.env.APP_BASE_URL = baseURL;
process.env.CORS_ORIGINS = process.env.CORS_ORIGINS || url.origin;
process.env.SOCKET_CORS_ORIGINS = process.env.SOCKET_CORS_ORIGINS || url.origin;

const GameServer = require('../server');

async function main() {
  const server = new GameServer();

  const shutdown = async (signal) => {
    try {
      await server.stop();
    } finally {
      process.exit(signal === 'SIGINT' || signal === 'SIGTERM' ? 0 : 1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });

  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  try {
    await server.listen(port);
  } catch (error) {
    console.error('Failed to start E2E server:', error);
    process.exit(1);
  }
}

void main();
