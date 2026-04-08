const { spawn } = require('node:child_process');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const { URL } = require('node:url');

const DEFAULT_SERVER_URL = 'http://127.0.0.1:3000/api/health';
const WAIT_TIMEOUT_MS = Number.parseInt(process.env.DEV_SERVER_WAIT_TIMEOUT_MS || '30000', 10);
const POLL_INTERVAL_MS = Number.parseInt(process.env.DEV_SERVER_WAIT_INTERVAL_MS || '500', 10);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveViteBinPath() {
  const vitePackageJson = require.resolve('vite/package.json');
  return path.join(path.dirname(vitePackageJson), 'bin', 'vite.js');
}

function buildViteLaunchSpec(options = {}) {
  return {
    command: options.nodeExecPath || process.execPath,
    args: [options.viteBinPath || resolveViteBinPath()],
    options: {
      stdio: 'inherit',
      shell: false,
    },
  };
}

function probeServer(url) {
  return new Promise((resolve) => {
    const client = url.protocol === 'https:' ? https : http;
    const request = client.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: 'GET',
        timeout: 2000,
      },
      (response) => {
        response.resume();
        resolve(response.statusCode && response.statusCode < 500);
      }
    );

    request.on('timeout', () => {
      request.destroy();
      resolve(false);
    });

    request.on('error', () => resolve(false));
    request.end();
  });
}

async function waitForServer(url) {
  const startedAt = Date.now();

  process.stdout.write(`Waiting for backend at ${url.origin} before starting Vite...\n`);

  while (Date.now() - startedAt < WAIT_TIMEOUT_MS) {
    if (await probeServer(url)) {
      process.stdout.write('Backend is ready. Starting Vite dev server.\n');
      return;
    }

    await wait(POLL_INTERVAL_MS);
  }

  throw new Error(`Timed out after ${WAIT_TIMEOUT_MS}ms waiting for backend at ${url.toString()}`);
}

async function main() {
  const healthcheckUrl = new URL(process.env.DEV_SERVER_HEALTHCHECK_URL || DEFAULT_SERVER_URL);
  await waitForServer(healthcheckUrl);

  const launchSpec = buildViteLaunchSpec();
  const viteProcess = spawn(launchSpec.command, launchSpec.args, launchSpec.options);

  viteProcess.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}

module.exports = {
  buildViteLaunchSpec,
  probeServer,
  resolveViteBinPath,
  waitForServer,
};
