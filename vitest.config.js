import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['test/unit/**/*.test.js'],
    testTimeout: 15000,
    // DB su file condivisi tra suite: sequenziale, mai parallelo.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'packages/commander/dist/**/*.js',
        'src/modules/*.js',
        'src/database/warnings.js',
        'src/database/levels.js',
        'src/database/tickets.js',
        'src/events/secretGuard.js',
        'src/ai/brain/learn.js',
        'src/database/customCommands.js',
        'src/utils/i18n.js',
      ],
    },
  },
});
