# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| `main` (latest) | :white_check_mark: |
| older tags | :x: |

We support the latest `main` only. Update before reporting.

## Reporting a Vulnerability

**Do not open a public issue** for security problems (especially leaked-token
handling, auth bypass, sandbox escapes, vault crypto, or MCP token issues).

Instead, report privately:

1. Open a [GitHub Security Advisory](https://github.com/zema-tech/zealbot-discord/security/advisories/new)
   (preferred), **or**
2. Contact the maintainer directly (see the profile email on
   [zema-tech](https://github.com/zema-tech)).

Please include:

- what you did (minimal reproduction steps, no real secrets),
- what you expected vs. what happened,
- the commit hash you tested,
- impact assessment (who is affected: bot owner, server owner, members?).

## What happens next

- Acknowledgement ASAP (target: 48h).
- We fix on a private branch, add a regression test in `scripts/smoke-test.js`,
  then disclose in the release notes.
- Credit in the advisory if you want it.

## Scope notes

High-interest areas (see also `decisions/`):

- `src/agents/` (sandbox capabilities, vault AES-GCM, human approvals),
- `src/mcp/` (Bearer sessions, guild scoping),
- `src/dashboard/auth.js` (OAuth2, sessions),
- `src/events/secretGuard.js` (secret patterns),
- `src/modules/commander.js` (gates, breaker).

Out of scope: upstream dependency vulnerabilities
(report those upstream, but tell us if they bite).
