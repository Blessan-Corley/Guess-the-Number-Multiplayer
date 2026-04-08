describe('start-dev-client launcher', () => {
  test('buildViteLaunchSpec uses node plus the local vite bin', () => {
    const { buildViteLaunchSpec } = require('../../scripts/start-dev-client');

    expect(
      buildViteLaunchSpec({
        nodeExecPath: 'node',
        viteBinPath: '/repo/node_modules/vite/bin/vite.js',
      })
    ).toEqual({
      command: 'node',
      args: ['/repo/node_modules/vite/bin/vite.js'],
      options: {
        stdio: 'inherit',
        shell: false,
      },
    });
  });

  test('resolveViteBinPath derives the executable path from vite/package.json', () => {
    const path = require('node:path');
    const { resolveViteBinPath } = require('../../scripts/start-dev-client');

    expect(resolveViteBinPath()).toBe(
      path.join(path.dirname(require.resolve('vite/package.json')), 'bin', 'vite.js')
    );
  });
});
