[English](CONTRIBUTING.md) | [Italiano](CONTRIBUTING.it.md)

# Contributing

Open-source bot (MIT) for the community: every PR gets read and gets a real
answer. Few rules, always respected.

## Gate (mandatory before opening a PR)

```bash
npm run verify   # tsc (packages/commander) + full smoke test
```

Red in CI = information, not rejection: fix and re-push.

## Conventions

- **Conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`.
- **Never** force-push, `reset --hard`, `branch -D` without being asked.
- **Never** secrets in commits (tokens, API keys, sessions). Local `.env` only.
- Functions under 50 lines; tests alongside the code (smoke section in `scripts/smoke-test.js`).
- Italian for the bot's user-facing messages; concise code and comments.

## Architecture (must respect)

- **Commander as the single orchestrator** (`src/modules/commander.js`): dashboard,
  commands, events and handlers never require `modules/registry` directly —
  smoke `[8/5]` forbids it and fails if you do.
- **Isolated modules**: descriptor in `src/modules/<id>.js` via `defineModule`,
  never calls between modules.
- **DB**: JSON with versioned `schema.js` (`__v`); no new dependencies
  without a correctness need.
- See `decisions/` (ADRs) for past decisions and their triggers.

## Useful issues

A minimal reproduction is already a great contribution. For new ideas open
an issue first: let's decide together *before* you spend a weekend building them.
