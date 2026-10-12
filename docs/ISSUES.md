# Known doc/code mismatches (do NOT fix without context)

Found during the docs/i18n pass. Fix only with maintainer context.

1. ~~`docs/it/COMMANDS.md` stale~~ RESOLVED during this pass: regenerated
   upstream (89 commands, `/jarvis` included) and moved to `docs/it/`.
2. `scripts/gen-docs.js` writes to `docs/COMMANDS.md`, but docs now live in
   `docs/it/` + `docs/en/`. Decide: generator targets `docs/it/COMMANDS.md`
   (+ English edition strategy) before re-running, or it recreates the old path.
3. `docs/it/HOSTING.md` §5 suggests a Pterodactyl egg with Node.js version 20,
   but `package.json` `engines` requires `>=22.12.0` (voice). Decide the
   minimum supported Node for eggs.
4. `docs/it/ARCHITECTURE.md` interaction pipeline lists two steps numbered
   "5." (gate + custom perms). Cosmetic; renumber when touching the file.
5. README badge says "85+ commands", code has 89. Fine as-is (85+), revisit
   only if the badge should track the exact count.
6. `npm ci` at root fails with `Unsupported URL Type "workspace:"` (the
   `apps/dashboard` + `packages/*` workspaces need Bun/pnpm; documented in
   `docs/it/HOSTING.md` troubleshooting). `npm test` passes with the existing
   `node_modules`. CI should either use Bun/pnpm workspaces or scope installs
   (`npm ci --omit=dev` still resolves workspaces — verify on CI).
