[English](README.md) | [Italiano](README.it.md)

# ⚡ ZealBot

📚 **Docs site:** https://zema-tech.github.io/zealbot-discord/

[![CI](https://github.com/zema-tech/zealbot-discord/actions/workflows/ci.yml/badge.svg)](https://github.com/zema-tech/zealbot-discord/actions/workflows/ci.yml)
[![CodeQL](https://github.com/zema-tech/zealbot-discord/actions/workflows/codeql.yml/badge.svg)](https://github.com/zema-tech/zealbot-discord/actions/workflows/codeql.yml)
[![Docker](https://github.com/zema-tech/zealbot-discord/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/zema-tech/zealbot-discord/actions/workflows/docker-publish.yml)
![Node](https://img.shields.io/badge/node-22%2B-brightgreen)
![discord.js](https://img.shields.io/badge/discord.js-v14-blue)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Commands](https://img.shields.io/badge/slash%20commands-85%2B-orange)
[![Donate](https://img.shields.io/badge/donate-Stripe-635BFF?logo=stripe&logoColor=white)](https://donate.stripe.com/test_aFa9AMegr8Me61bgAXcbC01)
**Production-ready multi-server Discord bot** with ~85 slash commands, per-guild feature toggles, a modern web dashboard, and a central **Commander** architecture (gate · timeout · circuit-breaker · **Guardian**).

> Self-hostable · MIT · Dashboard inspired by MEE6 · Commander + immune system

---

## Why ZealBot?

| Feature | Description |
|---------|-------------|
| **Commander** | Single entry point: per-server toggles, isolated execution — one broken module never takes down the others |
| **Guardian** | Health scoring per module/guild, quarantine hints, automatic recovery — no LLM on the hot path |
| **AI plug-and-play** | One API key (Groq, Gemini, OpenAI, xAI, …) or free endpoints; per-guild brain & skills |
| **Professional tickets** | Claim, transcript, priority, SLA, rating |
| **Serious moderation** | Warns with escalation, lockdown with permission snapshots, case registry |
| **Web dashboard** | Discord OAuth2, server grid, configurable modules, activity overview |

## Support the project

If the bot is useful to you, a donation helps with **hosting, development time and new features**.

| | |
|--|--|
| **Open donation (Stripe)** | [Open Payment Link →](https://donate.stripe.com/test_aFa9AMegr8Me61bgAXcbC01) |
| **Custom amount (EUR)** | minimum €1 · €5 preset |

> **Note:** the current link is on **Stripe Sandbox** (`livemode: false`) tied to this account. For **real** donations, create the same product/Payment Link in **Live mode** from the [Stripe Dashboard](https://dashboard.stripe.com/payment-links) and replace the URL here and in [`.github/FUNDING.yml`](.github/FUNDING.yml).

Other ways to help: **★ star** the repo · issues and PRs · dashboard feedback.

### Sponsors

Companies or communities wanting to sponsor hosting / priority features: open an [issue](https://github.com/zema-tech/zealbot-discord/issues) titled `Sponsor` or use the Stripe link above.

Thanks to everyone supporting the project 💚

## Quick Start
```bash
git clone https://github.com/zema-tech/zealbot-discord.git
cd zealbot-discord
npm install
cp .env.example .env          # set DISCORD_TOKEN + CLIENT_ID
node deploy-commands.js
npm start
```

```bash
npm test                      # smoke tests (no token required)
npm run dashboard             # web panel (separate process)
```

> **Note:** The production dashboard lives in `src/dashboard` (Express).

---

## Features overview

| Area | Commands / capabilities |
|------|-------------------------|
| **Moderation** | ban, kick, timeout, warn, clear, lockdown, cases |
| **Economy** | balance, daily, bank, shop, lottery, rob, slots |
| **Levels** | chat/voice XP, rank, leaderboard, reward roles |
| **Tickets** | panel, claim, transcript, priority, SLA, rating |
| **AI** | `/chiedi`, summarize, brain/skills, auto provider |
| **Agents** | `/jarvis` + specialists in sandbox, live control-room |
| **Utility** | welcome, automod, starboard, reaction roles, giveaway… |
| **Music** | `/musica` (play, queue, skip, loop…) |

Full command list → [docs/en/COMMANDS.md](docs/en/COMMANDS.md)

---

### Docker

```bash
cp .env.example .env   # fill in DISCORD_TOKEN + CLIENT_ID
docker compose up -d --build
```

Health: `GET /healthz`. Data persists via the `./data`, `./logs`, `./backups` volumes — see [docs/en/HOSTING.md](docs/en/HOSTING.md).

### Docker image

Prebuilt images publish to GHCR on every `vX.Y.Z` tag (multi-arch amd64/arm64):

```bash
docker pull ghcr.io/zema-tech/zealbot-discord:latest
```

```yaml
# docker-compose.ghcr.yml — run without building
services:
  bot:
    image: ghcr.io/zema-tech/zealbot-discord:latest
    env_file: .env
    environment:
      DB_BACKEND: sqlite
      DB_SQLITE_PATH: /app/data/bot.db
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### Fly.io

```bash
fly launch              # creates fly.toml (already in repo)
fly secrets set DISCORD_TOKEN=... CLIENT_ID=...
fly deploy
```

Use a [volume](https://fly.io/docs/volumes/) for `data/` or data resets on every deploy — see [docs/en/HOSTING.md](docs/en/HOSTING.md).

### PM2 (`ecosystem.config.js`)

```bash
npm install
cp .env.example .env
node deploy-commands.js
pm2 start ecosystem.config.js
pm2 save && pm2 startup
```

## Index

| Section | Content |
|---------|---------|
| [Support](#support-the-project) | Stripe donations · sponsors |
| [Architecture](#architecture) | Brain → muscles → Guardian |
| [Features](#features-summary) | Overview by area |
| [Requirements](#requirements) | Node, intents |
| [Variables](#essential-variables) | Minimal env |
| [Dashboard](#web-dashboard) | OAuth2 and startup |
| [Hosting](#hosting) | Render, Docker, VPS |
| [Docs](docs/README.md) | [CONFIG](docs/en/CONFIG.md) · [COMMANDS](docs/en/COMMANDS.md) · [HOSTING](docs/en/HOSTING.md) · [PLAN](PLAN.md) |

---
## Architecture

```text
        Dashboard / Discord / MCP   (nerves)
                    │
                    ▼
            ┌───────────────┐
            │   COMMANDER   │  brain: gate, dispatch, config
            │  + Guardian   │  immune: score, quarantine hint
            └───────┬───────┘
                    │
     ┌──────────────┼──────────────┐
     ▼              ▼              ▼
  modules        dashboard        events
  (muscles)      (muscles)        (muscles)
```

- Modules never call each other — only through the **Commander**
- Per-server on/off toggles (default **ON**)
- Dashboard validates config; **Commander executes**
- **Guardian** tracks success/fail/timeout and exposes `guardianSummary(guildId)`
- Typed core: `packages/commander` (TypeScript) + bridge in `src/modules/commander.js`

---

## Requirements

- **Node.js 22+** (Node 24 recommended for `@discordjs/voice` and SQLite)
- Discord intents: Guilds, GuildMessages, **Message Content**, **Server Members**, GuildModeration
- Discord application: bot token + Client ID

---

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DISCORD_TOKEN` | Bot token |
| `CLIENT_ID` | Command deployment |
| `GUILD_ID` | Optional — restrict to a single test server |
| `DB_BACKEND` | `json` (default) or `sqlite` |
| `CLIENT_SECRET` · `SESSION_SECRET` · `BASE_URL` | Dashboard OAuth2 |
| `DASHBOARD_AUDIT_LOG` | Optional: dashboard audit log path |
| `GROQ_API_KEY` / `GEMINI_API_KEY` / … | AI providers (optional) |

Full list → [docs/en/CONFIG.md](docs/en/CONFIG.md) · [`.env.example`](.env.example).

---

## Web dashboard

1. Discord Developer Portal → OAuth2 → redirect `<BASE_URL>/callback` (scopes: `identify guilds`)
2. Set `DASHBOARD_PORT`, `SESSION_SECRET`, `CLIENT_SECRET`, `BASE_URL`
3. Run:

```bash
npm start              # bot
npm run dashboard      # panel (shares .env + DB with the bot)
```

Requires **Manage Server** permission and the bot present in the guild.

Server grid (Join / Invite) · categorized modules · sectioned Welcome · 7/14/30 overview.

---

## Hosting

[docs/en/HOSTING.md](docs/en/HOSTING.md) — Docker, PM2, Render, Railway, VPS.

Health endpoint: `GET /healthz` → `{ ok, guilds, commands, backend }`

---

## Project structure

```text
src/commands/          slash commands by category
src/events/            Discord event listeners
src/modules/           descriptors + commander bridge
src/database/          json / sqlite store
src/dashboard/         Express dashboard (production)
packages/commander/    TypeScript core (gate, breaker, guardian)
docs/                  CONFIG · COMMANDS · HOSTING · AGENTS (it/en)
.github/FUNDING.yml    donation links (Sponsor button)
```

```bash
npm run dev
npm run build:commander   # after changes to packages/commander
npm test
```

---

## Support the project

If ZealBot is useful to you, a donation helps cover **hosting, development time and new features**.

| | |
|--|--|
| **Stripe donation** | [Open payment link →](https://donate.stripe.com/test_aFa9AMegr8Me61bgAXcbC01) |
| **Custom amount (EUR)** | min 1 € · preset 5 € |

> The current link is on Stripe Sandbox. For live donations, create a Payment Link in Live mode from the [Stripe Dashboard](https://dashboard.stripe.com/payment-links) and update this README + [`.github/FUNDING.yml`](.github/FUNDING.yml).

Other ways to help: **★ star** the repo · open issues & PRs · give dashboard feedback.

---

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

---

## License

[MIT](LICENSE) — free to use, modify and distribute.

[![Donate with Stripe](https://img.shields.io/badge/Support-donate%20with%20Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://donate.stripe.com/test_aFa9AMegr8Me61bgAXcbC01)
