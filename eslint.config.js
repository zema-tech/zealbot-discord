// ESLint flat config — baseline pragmatica: errori veri, mai rumore.
// `npm run lint` deve passare verde; `npm run lint:fix` ripara il riparabile.
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    ignores: [
      'node_modules/**',
      'apps/**',
      'packages/**/dist/**',
      'data/**',
      'logs/**',
      'backups/**',
      'brain/**',
      '**/*.json',
    ],
  },
  {
    files: ['src/**/*.js', 'scripts/**/*.js', 'packages/commander/src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
      },
    },
    rules: {
      // `client` nei listener Discord è firma convenzionale (execute(..., client)):
      // resta anche quando il corpo non lo usa.
      'no-unused-vars': ['error', { argsIgnorePattern: '^(_|client$)', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'error',
      'no-redeclare': 'error',
      // Idiomi del repo: assegnazioni nei while (parser) e catch vuoti
      // intenzionali ("mai crashare"). Il resto resta severo.
      'no-cond-assign': ['error', 'except-parens'],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-catch': 'off',
      'no-control-regex': 'off',
      'no-constant-condition': ['error', { checkLoops: false }],
      'eqeqeq': ['error', 'smart'],
      'no-throw-literal': 'error',
      'no-eval': 'error',
      'no-implied-eval': 'error',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: 'commonjs',
      globals: {
        console: 'readonly',
        process: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-undef': 'error',
      'no-empty': ['error', { allowEmptyCatch: true }],
      'eqeqeq': ['error', 'smart'],
      'no-eval': 'error',
    },
  },
  {
    // Frontend vanilla: niente require, sì browser. Api è definita in js/api.js
    // e usata in js/app.js (cross-file): dichiarata come globale letta.
    files: ['src/dashboard/public/js/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: {
        window: 'readonly',
        document: 'readonly',
        location: 'readonly',
        navigator: 'readonly',
        localStorage: 'readonly',
        sessionStorage: 'readonly',
        alert: 'readonly',
        confirm: 'readonly',
        Chart: 'readonly',
        EventSource: 'readonly',
        CSS: 'readonly',
        Event: 'readonly',
      },
    },
    rules: {
      'no-undef': 'error',
      'no-unused-vars': ['error', { varsIgnorePattern: '^(Api)$', argsIgnorePattern: '^(_|client$)', caughtErrors: 'none' }],
    },
  },
  {
    files: ['scripts/smoke-test.js'],
    rules: {
      // Lo smoke test riusa nomi di comodo nei blocchi QA.
      'no-redeclare': 'off',
    },
  },
];
