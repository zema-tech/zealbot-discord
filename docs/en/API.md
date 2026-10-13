# Internal API — Commander, Guardian, modules

How to drive the bot from code (commands, dashboard, MCP, CLI all go through here).
Italian edition: `API.it.md`.

## Commander (`src/modules/commander.js` + `packages/commander` core)

Single orchestrator. Never require `modules/registry` directly (smoke `[8/5]` forbids it).

| Method | Signature | What it does |
|---|---|---|
| `checkGate(commandName, guildId)` | `(string, string?)` | `{ok:true}` or `{ok:false, reason:'disabled'\|'isolated', featureId}`. Resolves the command → feature first. |
| `canRun(guildId, featureId)` | `(string?, string?)` | Same gate by feature id (for events/handlers). Fail-open. |
| `executeCommand(command, interaction, client, opts?)` | `opts.timeoutMs` (default 15000) | Runs `command.execute` isolated with timeout; records errors (breaker). Never throws: `{ok, timedOut?, error?}`. |
| `guardEvent(file, event, args, client)` | — | Wraps every listener: skips if the module can't run, records errors. Never throws. |
| `featureOfCommand/Event/Component` | `(string)` | name → feature id (or `null` = always allowed). |
| `listModules()` | — | Static descriptors (id, version, commands…). |
| `moduleHealth(guildId)` | — | Per-guild state: enabled, isolated, errors, stats. |
| `setModuleEnabled(guildId, id, on)` | — | Toggle (re-enable also clears breaker+errors). Throws on unknown id. |
| `reloadModule(guildId, id)` | — | Revalidates syntax, reloads descriptor, clears errors+breaker. |
| `resetModule(guildId, id)` | — | Clears errors+breaker. |
| `updateModuleConfig(guildId, mod, patch)` | — | Dispatches a validated patch to the right module DB. Throws `{status, message}`. |
| `alertsPending()` | — | Queued pain signals (Guardian). |
| `guardianSummary(guildId)` | — | TS-core health scores (see below). |

## Guardian (immune system)

- **Score (passive):** TS core `packages/commander` (`Guardian.observe/summary`): ok/fail/timeout per guild+feature → `{features, critical, weak, ok}`. No LLM in the hot path.
- **Pain (active):** `registry.recordError` returns `{tripped}`; on trip a de-duplicated signal is queued (`drainAlerts`, 15-min window). `src/jobs/guardianJob.js` delivers to the guild log channel every 2 min; ≥3 isolated modules = fever alert (1/hour).
- **Skin:** `src/events/secretGuard.js` deletes leaked tokens/keys + DM + modlog.
- Read health anytime: `commander.guardianSummary(gid)`, `commander.alertsPending()`.

## Per-guild configuration

Two layers (same ones `/config` and the dashboard use):

1. **Module toggles** — `commander.setModuleEnabled(gid, id, on)` (persistent via `moduleState`).
2. **Module settings** — `commander.updateModuleConfig(gid, mod, patch)` for `general, welcome, logging, levels, automod, autorole, starboard, confessioni, tickets, tempvoice, ai` (validated upstream; see dashboard `MODULE_FIELDS`).
3. **Runtime env overrides** — `database/settings.js` (`setOverride/getOverride/effectiveEnv`, strict whitelist). Read via `effectiveEnv()`, never `process.env` directly for tunable keys.

## Extending with a new module

1. Descriptor `src/modules/<id>.js` via `defineModule({id, title, commands, version…})` (validated, semver required).
2. Slash commands in `src/commands/<area>/` (auto-loaded recursively).
3. Listeners in `src/events/` (one file per listener; shared Discord events are an allowed pattern, never bypass the gate — use `commander.canRun`).
4. State in `src/database/<name>.js` over `jsonDb` (additive migrations in `schema.js` with `__v` stamp).
5. Register the feature id in `commander.featureOf*` maps only via the descriptor (no hardcoded lists elsewhere).
6. Docs: command appears in `docs/COMMANDS.md` via `node scripts/gen-docs.js`; add a smoke section with `qatest` keys + cleanup.

## Dashboard decision (locked)

**Option B: Express (`src/dashboard`) is the only supported dashboard.**
The experimental Next.js app was removed; do not reintroduce a second
dashboard without an ADR.
