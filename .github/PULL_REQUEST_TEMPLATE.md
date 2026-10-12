## What

<!-- One paragraph: what changes and why. -->

## Gate

- [ ] `npm run verify` green (tsc + smoke test)
- [ ] No secrets in commits (tokens, keys, sessions)
- [ ] No force-push / `reset --hard`

## Architecture checklist

- [ ] No direct `modules/registry` requires outside the Commander
  (dashboard, commands, events, handlers — smoke `[8/5]` enforces it)
- [ ] No calls between modules (only Commander → module)
- [ ] New DB keys covered by `schema.js` versioning or runtime backfill
- [ ] New slash commands registered in their module descriptor
- [ ] Docs updated if behavior changed (`docs/en` + `docs/it`)

## Screenshots / logs

<!-- Dashboard changes: screenshots. Bug fixes: red→green proof. -->
