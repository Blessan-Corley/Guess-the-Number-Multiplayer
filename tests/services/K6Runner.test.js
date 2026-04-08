const path = require('path');

const {
  createCommandProbe,
  selectExecutionMode,
  buildDockerArgs,
  formatMissingDependencyMessage,
  detectK6,
} = require('../../scripts/load/run-k6');

describe('k6 load runner wrapper', () => {
  test('prefers a locally installed k6 binary when available', () => {
    const probe = createCommandProbe({
      k6: { available: true, command: 'k6' },
      docker: { available: true, command: 'docker' },
    });

    expect(selectExecutionMode(probe)).toEqual({
      type: 'local',
      command: 'k6',
    });
  });

  test('detectK6 falls back to the standard Windows install path when PATH is stale', () => {
    const probe = detectK6({
      detectCommandImpl: () => ({ available: false, command: 'k6' }),
      existsSyncImpl: (candidate) => candidate === 'C:\\Program Files\\k6\\k6.exe',
      platform: 'win32',
    });

    expect(probe).toEqual({
      available: true,
      command: 'C:\\Program Files\\k6\\k6.exe',
    });
  });

  test('falls back to docker when k6 is unavailable', () => {
    const probe = createCommandProbe({
      k6: { available: false, command: 'k6' },
      docker: { available: true, command: 'docker' },
    });

    expect(selectExecutionMode(probe)).toEqual({
      type: 'docker',
      command: 'docker',
    });
  });

  test('returns missing mode when neither k6 nor docker is available', () => {
    const probe = createCommandProbe({
      k6: { available: false, command: 'k6' },
      docker: { available: false, command: 'docker' },
    });

    expect(selectExecutionMode(probe)).toEqual({
      type: 'missing',
      command: null,
    });
  });

  test('missing dependency message explains when docker is installed but not usable', () => {
    const message = formatMissingDependencyMessage(
      createCommandProbe({
        k6: { available: false, command: 'k6', reason: 'missing' },
        docker: {
          available: false,
          command: 'docker',
          reason: 'daemon_unreachable',
        },
      })
    );

    expect(message).toContain('Docker is installed but not running');
    expect(message).toContain('Start Docker Desktop');
  });

  test('buildDockerArgs mounts the repo and runs the target script from /work', () => {
    const cwd = path.resolve('F:/My Projects/Number guesser muliplayer');
    const scriptPath = 'scripts/load/k6/profile-leaderboard.js';

    expect(buildDockerArgs({ cwd, scriptPath, forwardedArgs: ['--vus', '10'] })).toEqual([
      'run',
      '--rm',
      '-i',
      '-v',
      `${cwd}:/work`,
      '-w',
      '/work',
      'grafana/k6',
      'run',
      `/work/${scriptPath.replace(/\\/g, '/')}`,
      '--vus',
      '10',
    ]);
  });
});
