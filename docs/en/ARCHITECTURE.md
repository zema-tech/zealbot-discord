# Bot architecture

Map derived from reading the code (entry point `src/index.js`, events,
database, dashboard, jobs). File names and behaviors match what is
implemented, not future intentions.

## Overview

ZealBot — multi-server Discord bot based on **discord.js v14**, **CommonJS**,
**single Node process** (`node src/index.js`). Slash commands organized by
category-folder, persistent state in JSON (with optional SQLite
backend), web dashboard in a separate process, periodic jobs
started on the ready event. Variable details in `CONFIG.md`, commands in
`COMMANDS.md` (generated with `node scripts/gen-docs.js`).

## Folder structure

| Path | Role |
|---|---|
| `src/index.js` | Entry point: client, command/event loading, login, conditional dashboard startup |
| `src/commands/<category>/*.js` | Slash commands (`data` + `execute` + `cooldown`); the category is the folder name (`ai`, `economy`, `fun`, `levels`, `moderation`, `music`, `tickets`, `utility`) |
| `src/events/*.js` | One file per listener (`name` + `execute` + `once?`); see multi-listener pattern below |
| `src/handlers/` | `ticketHandler.js`, `reactionRoleHandler.js`: handle selects/modals/buttons before commands |
| `src/database/` | `store.js` + `jsonDb.js` (infrastructure) + ~25 domain modules (`economy.js`, `levels.js`, …) + respective `<name>.json` + `moduleState.js` (per-guild feature on/off) |
| `src/modules/` | Feature controllers: `registry.js` + one file per part (`tickets.js`, `levels.js`, … with mapped commands/db/events); command/event gates, dashboard toggles, health and per-module isolated errors |
| `src/dashboard/` | `index.js` (standalone process), `server.js`, `auth.js`, `api.js`, `guilds.js` (client/REST source), `presence.js` (roster), `discordRest.js` (REST reads), `public/`: web app Express separate from the bot |
| `src/jobs/` | `ticketAutoclose.js`, `backup.js`, `selfImprove.js`: timers started by `events/ready.js`, never started elsewhere |
| `src/utils/` | `logger.js`, `i18n.js`, `ai.js`/`aiProviders.js`, `player.js`, `codebase.js`, `helpers.js`, `transcript.js`, … |
| `src/locales/` | `it.js`, `en.js` for `utils/i18n.js` |
| `scripts/smoke-test.js` | QA (`npm test`): commands, events, DB roundtrips on `qatest` keys, require-safe |
| `scripts/gen-docs.js` | Generates `docs/COMMANDS.md` with no network nor bot |
| `deploy-commands.js` | Registers slash commands on Discord (test guild or global) |

## Boot (`src/index.js`)

1. `dotenv`, require `DISCORD_TOKEN` (exit 1 if missing).
2. `Client` with 8 intents (`Guilds`, `GuildMessages`, `MessageContent`,
   `GuildMembers`, `GuildModeration`, `GuildMessageReactions`,
   `GuildVoiceStates`, `GuildInvites`) and partials (`Message`, `Channel`,
   `GuildMember`, `Reaction`).
3. `client.commands` / `client.cooldowns` (`Collection`), `client.spamMap`
   (in-memory anti-spam `Map`).
4. `loadCommands(src/commands)` **recursive**: assigns
   `command.category = <folder name>`, skips files without `data`/`execute`
   with a warning, reports duplicate slash names without silently
   overwriting (last one wins in the `Collection`, with `console.warn`).
   A failed `require` skips only that file, never the whole bot.
5. Event registration: one `client.on`/`client.once` **per file**, with
   validation (`name` string + `execute` function); invalid files
   skipped with warning.
6. `unhandledRejection`/`uncaughtException` handlers: console + structured
   logger, never crash.
7. `client.login(DISCORD_TOKEN)`; the bot also writes the guild roster
   (presence) for the standalone dashboard. Never dashboard logic here.

## Interaction → command flow (`src/events/interactionCreate.js`)

Exact pipeline order for every `InteractionCreate`:

1. **`ticketHandler.handle(interaction)`** — if consumed (selects, modals,
   ticket buttons), stop.
2. **`reactionRoleHandler.handle(interaction)`** — if consumed (select
   `rr_select`), stop. Both with dedicated ephemeral error reply.
3. **`nuke_*` buttons** — `nuke_cancel` aborts; `nuke_confirm` requires
   `ManageChannels` permission, clones the channel, deletes the original and
   confirms (reply via webhook because the original channel no longer exists).
4. Only `isChatInputCommand()` continues; command looked up in
   `client.commands` by `interaction.commandName`.
5. **Controller gate** (`src/modules/registry`): if the command's feature is
   off for the guild, stop with ephemeral reply (DMs always allowed).
   `execute` errors are recorded per feature (dashboard).
5. **Custom permissions** (`database/customPerms`, PeakBot-style) — per-command
   roles per guild, with `Administrator` bypass. It runs **before** the
   cooldown on purpose: rejected users don't consume wait time.
6. **Cooldown** per command+user (`command.cooldown || 3` seconds),
   with ephemeral relative-timestamp wait message.
7. `command.execute(interaction, client)` + `logCommand(...)` for
   analytics. On error: structured log, best-effort embed in the
   guild's `logChannelId` (`database/guildConfig`), **cooldown
   refund** (`timestamps.delete`) so an error never costs wait time,
   generic ephemeral reply.

## Multi-listener pattern (events)

`index.js` registers **one listener per file**, so multiple files on the same
Discord event are multiple active listeners — a **deliberate** pattern only for
these events (verified by the smoke test, disjoint bodies):

- `guildMemberAdd` — welcome (`guildMemberAdd.js`), autorole
  (`autorole.js`), anti-raid (`antiRaid.js`), joins analytics
  (`analyticsMembers.js`), invites (`inviteTracker.js`).
- `messageCreate` — XP/automod (`messageCreate.js`), autoresponder
  (`autoResponder.js`, read-only + reply), analytics counting
  (`analyticsMessages.js`).
- `voiceStateUpdate` — temporary voice rooms (`tempVoice.js`),
  voice XP (`voiceXp.js`).

Any other duplicated event across two files is an **error** (the smoke test
fails). Other notable single listeners: `aiMention.js`,
`aiModeration.js`, `auditLog.js`, `customCommands.js`, `starboard.js`,
`snipe` via `utils/snipeCache.js`, `ready.js`.

## Persistence (`src/database/store.js` + `jsonDb.js`)

- `store.js` — synchronous `collection(name)` API with `get/set/update/delete/all`.
  Backend from env on every operation (tests switch env at runtime):
  - `DB_BACKEND=json` (**default**): `src/database/<name>.json` files,
    atomic read-modify-write via tmp+rename; corrupt files copied to
    `<file>.corrupt-<timestamp>` instead of losing them.
  - `DB_BACKEND=sqlite`: `node:sqlite` on `DB_SQLITE_PATH` (default
    `./data/bot.db`), `kv(collection, key, value)` table with JSON
    values, `journal_mode=WAL`, transactions on multi-row replace; if the
    driver is missing or open fails, fallback to json with warning
    (never crash, never data loss).
  - Postgres **future, not active**: only schema in
    `src/database/postgres-schema.sql`; would require a separate async API.
- `jsonDb.js` — `load/save/dbFile` compat layer over `store.js`, so the
  ~25 domain modules (`economy`, `levels`, `warnings`, `guildConfig`,
  `tickets`, `cases`, `shop`, `lotteria`, `rep`, `sfide`, `confessioni`,
  `reactionRoles`, `autoresponder`, `invites`, `tempvoice`, `stanze`,
  `levelRewards`, `analytics`, `customPerms`, `customCommands`,
  `aiConfig`, `starboard`, …) work unchanged on both backends.

## Separate-process dashboard (`src/dashboard/`)

- Started with `npm run dashboard` (`src/dashboard/index.js`, requires
  `DASHBOARD_PORT`); `express` is `require`d **lazy inside `startDashboard()`**
  so the smoke test passes even without express installed.
- Reads the **same bot DB store** (no syncing) + presence roster written by the bot; live Discord details via REST with the Bot token.
- `server.js`: 256kb JSON limit, `public/` static, auth routes, `/api`
  protected by `auth.requireAuth`, landing with inline fallback if
  `public/index.html` is missing, JSON 404, never-crashing error handler.
- `auth.js`: Discord OAuth2 (redirect `<BASE_URL>/callback`, scopes
  identify+guilds) with `SESSION_SECRET`, `CLIENT_ID`, `CLIENT_SECRET`,
  `BASE_URL`.
- `api.js`: per-guild API restricted to the admins of shared servers.

## Jobs (`src/jobs/`, started by `src/events/ready.js`)

| Job | Schedule | What it does |
|---|---|---|
| `ticketAutoclose` | every 15 min | Closes tickets idle beyond `autoCloseDays` (`setAutoClose`, 0 = off, max 90) |
| `backup` | nightly at 03:00 local | Copies `src/database/*.json` (+ sqlite if present) into `backups/YYYY-MM-DD-HHmm/`, 7-day retention, `backups/last.json` journal; never crash |
| `selfImprove` | nightly at `SELF_IMPROVE_TIME` | Active only with `SELF_IMPROVE=1` (default off); re-reads the code and proposes **one** patch, never auto-commits, `SELF_IMPROVE_DRY_RUN=1` for report-only |

All use `unref`'d intervals so they never keep the process alive alone,
and every start is wrapped in try/catch in `ready.js`.

## Command deploy and i18n

- `deploy-commands.js` — scans `src/commands` (one level), pushes
  `data.toJSON()` via REST: to the test guild if `GUILD_ID` is set,
  otherwise global (up to ~1h propagation).
- `utils/i18n.js` + `locales/it.js`/`en.js` — per-guild localized
  reply texts (`getLang`/`t`); slash names and descriptions stay
  in Italian.
- Music (`utils/player.js`, `/musica` command) — `discord-player` with
  extractor; voice-dependency errors mapped to Italian messages,
  never crash.
