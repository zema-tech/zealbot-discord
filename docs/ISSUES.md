# Known doc/code mismatches (do NOT fix without context)

1. `npm ci` at root fails with `Unsupported URL Type "workspace:"` (the
   `apps/*` + `packages/*` workspaces need Bun/pnpm). Workaround in CI:
   drop the `workspaces` field for the job. Documented in `docs/HOSTING.md`
   troubleshooting.
2. Full bot-message i18n is partial: `src/utils/i18n.js` + `src/locales/`
   cover a handful of commands; most replies are hardcoded Italian.
   Rolling out `t()` everywhere is future work (see `docs/CONFIG.md` lingue).
3. Prettier: `npm run format` exists but is opt-in — ~200 files predate the
   config and a mass reformat would nuke blame. Gate CI on ESLint only.
4. `apps/dashboard` (Next.js) is experimental until the Phase-3 cutover in
   `PLAN.md`; `src/dashboard` (Express) is the only supported one.
