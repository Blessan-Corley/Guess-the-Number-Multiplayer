#!/usr/bin/env node

const fs = require('fs');
const { spawnSync } = require('child_process');

function createCommandProbe(overrides = {}) {
  return {
    k6: overrides.k6 || { available: false, command: 'k6' },
    docker: overrides.docker || { available: false, command: 'docker' },
  };
}

function detectCommand(command) {
  const checkCommand = process.platform === 'win32' ? 'where' : 'which';
  const result = spawnSync(checkCommand, [command], {
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });

  return {
    available: result.status === 0,
    command,
  };
}

function detectK6(options = {}) {
  const detectCommandImpl = options.detectCommandImpl || detectCommand;
  const existsSyncImpl = options.existsSyncImpl || fs.existsSync;
  const platform = options.platform || process.platform;
  const detected = detectCommandImpl('k6');

  if (detected.available) {
    return detected;
  }

  if (platform === 'win32') {
    const standardInstallPath = 'C:\\Program Files\\k6\\k6.exe';
    if (existsSyncImpl(standardInstallPath)) {
      return {
        available: true,
        command: standardInstallPath,
      };
    }
  }

  return detected;
}

function detectDocker() {
  const dockerBinary = detectCommand('docker');
  if (!dockerBinary.available) {
    return {
      available: false,
      command: 'docker',
      reason: 'missing',
    };
  }

  const dockerInfo = spawnSync('docker', ['info'], {
    stdio: 'ignore',
    shell: false,
  });

  if (dockerInfo.status === 0) {
    return {
      available: true,
      command: 'docker',
      reason: null,
    };
  }

  return {
    available: false,
    command: 'docker',
    reason: 'daemon_unreachable',
  };
}

function selectExecutionMode(probe) {
  if (probe.k6?.available) {
    return {
      type: 'local',
      command: probe.k6.command,
    };
  }

  if (probe.docker?.available) {
    return {
      type: 'docker',
      command: probe.docker.command,
    };
  }

  return {
    type: 'missing',
    command: null,
  };
}

function normalizeContainerPath(targetPath) {
  return targetPath.replace(/\\/g, '/');
}

function buildDockerArgs({ cwd, scriptPath, forwardedArgs = [] }) {
  return [
    'run',
    '--rm',
    '-i',
    '-v',
    `${cwd}:/work`,
    '-w',
    '/work',
    'grafana/k6',
    'run',
    `/work/${normalizeContainerPath(scriptPath)}`,
    ...forwardedArgs,
  ];
}

function formatMissingDependencyMessage(probe) {
  const lines = ['Unable to run the HTTP load test automatically.', ''];

  if (probe.docker?.reason === 'daemon_unreachable') {
    lines.push('Docker is installed but not running.');
    lines.push('Start Docker Desktop (or the Docker daemon) and retry.');
  } else {
    lines.push('k6 is not installed and Docker is not available.');
    lines.push('Install one of these and retry:');
    lines.push('  1. Install k6 locally and ensure it is on PATH');
    lines.push('  2. Install Docker Desktop so the wrapper can use grafana/k6 automatically');
  }

  lines.push('');
  lines.push('Then run:');
  lines.push('  npm run test:load:http');
  lines.push('');

  return lines.join('\n');
}

function printMissingDependencyMessage(probe) {
  process.stderr.write(formatMissingDependencyMessage(probe));
}

function runCommand(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
  });

  if (result.error) {
    throw result.error;
  }

  return typeof result.status === 'number' ? result.status : 1;
}

function main() {
  const scriptPath = process.argv[2] || 'scripts/load/k6/profile-leaderboard.js';
  const forwardedArgs = process.argv.slice(3);
  const cwd = process.cwd();

  const executionMode = selectExecutionMode(
    createCommandProbe({
      k6: detectK6(),
      docker: detectDocker(),
    })
  );

  if (executionMode.type === 'local') {
    process.exitCode = runCommand(executionMode.command, ['run', scriptPath, ...forwardedArgs]);
    return;
  }

  if (executionMode.type === 'docker') {
    process.exitCode = runCommand(
      executionMode.command,
      buildDockerArgs({ cwd, scriptPath, forwardedArgs })
    );
    return;
  }

  printMissingDependencyMessage(
    createCommandProbe({
      k6: detectK6(),
      docker: detectDocker(),
    })
  );
  process.exitCode = 1;
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}

module.exports = {
  createCommandProbe,
  detectK6,
  selectExecutionMode,
  buildDockerArgs,
  formatMissingDependencyMessage,
};
