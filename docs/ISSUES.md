# Known doc/code mismatches (do NOT fix without context)

1. `npm ci` at root fails with `Unsupported URL Type "workspace:"` (the
   `apps/*` + `packages/*` workspaces need Bun/pnpm). Workaround in CI:
   drop the `workspaces` field for the job. Documented in `docs/HOSTING.md`
   troubleshooting (both languages).
2. Full bot-message i18n is partial: `src/utils/i18n.js` + JSON locales cover
   a handful of commands; most replies are hardcoded Italian, and slash
   names/descriptions stay Italian by documented choice. Rolling out `t()`
   everywhere is future work (see `docs/CONFIG.md` lingue / `docs/en/CONFIG.md`).
   Default language stays `it` (flipping to `en` would silently change UX
   for existing Italian servers).
3. Prettier: `npm run format` exists but is opt-in — ~200 files predate the
   config and a mass reformat would nuke blame. Gate CI on ESLint only.
4. `apps/dashboard` (Next.js) is experimental until the Phase-3 cutover in
   `PLAN.md`; `src/dashboard` (Express) is the only supported one.
5. Product default language is Italian (`FALLBACK_LANG='it'`), not English:
   deliberate (see 2), against the letter of the i18n request.
6. `scripts/gen-docs.js` writes to `docs/COMMANDS.md`, but docs now live in
   `docs/it/` + `docs/en/`. Decide: generator targets `docs/it/COMMANDS.md`
   (+ English edition strategy) before re-running, or it recreates the old path.
7. `docs/it/HOSTING.md` §5 suggests a Pterodactyl egg with Node.js version 20,
   but `package.json` `engines` requires `>=22.12.0` (voice). Decide the
   minimum supported Node for eggs.
8. `docs/it/ARCHITECTURE.md` interaction pipeline lists two steps numbered
   "5." (gate + custom perms). Cosmetic; renumber when touching the file.
