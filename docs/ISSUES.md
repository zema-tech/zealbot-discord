# Known doc/code mismatches (do NOT fix without context)

1. ~~`npm ci` at root fails with `Unsupported URL Type "workspace:"`~~ RESOLVED:
   orphan Next-era workspaces (`apps/dashboard`, `packages/db|config|ui`)
   removed; plain `npm ci` works again. CI workaround dropped.
2. Full bot-message i18n: `src/core/i18n.js` (i18next + fs-backend) + `t()`
   covers moderation/economy/tickets/levels commands; most other replies are
   still hardcoded Italian, and slash names/descriptions stay Italian by
   documented choice. Product default is now English (`FALLBACK='en'`,
   `guildConfig.language` default `'en'`): guilds that never set a language
   see English — explicit product decision, `/language` (admin) to switch.
3. Prettier: `npm run format` exists but is opt-in — ~200 files predate the
   config and a mass reformat would nuke blame. Gate CI on ESLint only.
4. ~~`apps/dashboard` (Next.js) experimental~~ RESOLVED (Option B):
   removed entirely; Express is the only dashboard. Reintroduction needs an ADR.
5. ~~Product default language is Italian~~ RESOLVED: default is now
   English everywhere (`src/core/i18n.js`, `utils/i18n.js`, `guildConfig`).
6. `scripts/gen-docs.js` writes to `docs/COMMANDS.md`, but docs now live in
   `docs/it/` + `docs/en/`. Decide: generator targets `docs/it/COMMANDS.md`
   (+ English edition strategy) before re-running, or it recreates the old path.
7. `docs/it/HOSTING.md` §5 suggests a Pterodactyl egg with Node.js version 20,
   but `package.json` `engines` requires `>=22.12.0` (voice). Decide the
   minimum supported Node for eggs.
8. `docs/it/ARCHITECTURE.md` interaction pipeline lists two steps numbered
   "5." (gate + custom perms). Cosmetic; renumber when touching the file.
9. Dockerfile optimization proposal (NOT applied — current single-stage
   `node:24-slim` works): multi-stage build (builder: `npm ci`, runtime:
   copy `package.json` + `node_modules` prod + source), consider
   `node:22-alpine` (smaller, but musl + `libsodium`/opus for voice need
   testing), keep non-root `node` user and the `/healthz` HEALTHCHECK.
   Decide before changing: Alpine voice-dependency validation required.
