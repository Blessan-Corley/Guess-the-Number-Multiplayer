module.exports = {
  root: true,
  reportUnusedDisableDirectives: true,
  overrides: [
    {
      files: [
        'server.js',
        'src/**/*.js',
        'config/**/*.js',
        'scripts/**/*.js',
        'playwright.config.js',
        'jest.config.js',
      ],
      env: {
        node: true,
        es2021: true,
      },
      extends: ['eslint:recommended', 'prettier'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
      rules: {
        'no-console': 'off',
        'no-empty': ['error', { allowEmptyCatch: true }],
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['vite.config.js'],
      env: {
        node: true,
        es2021: true,
      },
      extends: ['eslint:recommended', 'prettier'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['public/js/**/*.js'],
      env: {
        browser: true,
        es2021: true,
      },
      extends: ['eslint:recommended', 'prettier'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
      globals: {
        AppActions: 'readonly',
        AppRules: 'readonly',
        AppState: 'readonly',
        AppStateSelectors: 'readonly',
        Game: 'readonly',
        GameRuntime: 'readonly',
        ProfileApi: 'readonly',
        ProfileView: 'readonly',
        SinglePlayerGame: 'readonly',
        UI: 'readonly',
        confetti: 'readonly',
        io: 'readonly',
        lucide: 'readonly',
        module: 'readonly',
        profileClient: 'readonly',
        require: 'readonly',
        singlePlayerGame: 'readonly',
        socketClient: 'readonly',
      },
      rules: {
        'no-console': 'off',
        'no-empty': ['error', { allowEmptyCatch: true }],
        'no-redeclare': 'off',
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      },
    },
    {
      // main.js is the Vite ES module entry point — override the script sourceType above
      files: ['public/js/main.js'],
      env: {
        browser: true,
        es2021: true,
      },
      extends: ['eslint:recommended', 'prettier'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      rules: {
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['tests/e2e/**/*.js'],
      env: {
        browser: true,
        node: true,
        es2021: true,
      },
      extends: ['eslint:recommended', 'prettier'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
      rules: {
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      },
    },
    {
      files: ['tests/**/*.js'],
      excludedFiles: ['tests/e2e/**/*.js'],
      env: {
        jest: true,
        node: true,
        es2021: true,
      },
      extends: ['eslint:recommended', 'prettier'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'script',
      },
      rules: {
        'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      },
    },
  ],
};
