[English](README.md) | [Italiano](README.it.md)

# ⚡ ZealBot

[![CI](https://github.com/zema-tech/zealbot-discord/actions/workflows/ci.yml/badge.svg)](https://github.com/zema-tech/zealbot-discord/actions/workflows/ci.yml)
![Node](https://img.shields.io/badge/node-22%2B-brightgreen)
![discord.js](https://img.shields.io/badge/discord.js-v14-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Commands](https://img.shields.io/badge/slash%20commands-85%2B-orange)
[![Donate](https://img.shields.io/badge/donate-Stripe-635BFF?logo=stripe&logoColor=white)](https://donate.stripe.com/test_aFa9AMegr8Me61bgAXcbC01)

Multi-server Discord bot (**ZealBot**) with ~85 slash commands, per-guild module toggles, a **web dashboard** and a central **Commander** (brain: gate, timeout, circuit-breaker, **Guardian**).

> Self-hostable · MIT · MEE6-style dashboard · Commander + immune system

## Why it's different

- **Commander (brain)** — single entry point: per-server toggles, isolated execution, one broken module never kills the others
- **Guardian (immunity)** — health score per module/guild, suggested quarantine, recovery; no LLM in the hot path
- **Plug-and-play AI** — one key (Groq, Gemini, OpenAI, …) or a free endpoint; per-guild brain/skills
- **Professional tickets** — claim, transcripts, priorities, SLA, ratings
- **Serious moderation** — escalating warns, lockdown with permission snapshots, case registry
- **Web dashboard** — Discord OAuth2, server grid, configurable modules, activity overview

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
cp .env.example .env   # DISCORD_TOKEN + CLIENT_ID
node deploy-commands.js
npm start
```

```bash
npm test   # tokenless smoke test: commands, events, commander, DB
```

### Docker

```bash
cp .env.example .env   # fill in DISCORD_TOKEN + CLIENT_ID
docker compose up -d --build
```

Health: `GET /healthz`. Data persists via the `./data`, `./logs`, `./backups` volumes — see [docs/en/HOSTING.md](docs/en/HOSTING.md).

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
            │  + Guardian   │  immunity: score, quarantine hint
            └───────┬───────┘
                    │
      ┌──────────────┼──────────────┐
      ▼              ▼              ▼
   modules        dashboard        events
   (muscles)      (muscles)        (muscles)
```

- Modules never call each other: only through the **Commander**
- **On/off toggle per server** (default ON)
- Dashboard config: the UI validates, the **Commander executes**
- **Guardian** observes ok/fail/timeout and exposes `guardianSummary(guildId)`
- Typed core: `packages/commander` (TypeScript) + bridge in `src/modules/commander.js`

---

## Features (summary)

| Area | Examples |
|------|--------|
| **Moderation** | ban, kick, timeout, warn, clear, lockdown, cases |
| **Economy** | balance, daily, bank, shop, lottery, rob, slots |
| **Levels** | chat/voice XP, rank, top, reward roles |
| **Tickets** | panel, claim, transcript, priorities, SLA, ratings |
| **AI** | /ask, summarize, brain/skills, auto provider |
| **Agents** | /jarvis + sandboxed specialists, live control-room ([docs/en/AGENTS.md](docs/en/AGENTS.md)) |
| **Utility** | welcome, automod, starboard, reaction roles, giveaways… |
| **Music** | /musica (play, queue, skip, loop…) |

Full command details → [docs/en/COMMANDS.md](docs/en/COMMANDS.md).

---

## Requirements

- **Node.js 22+** (required by `package.json`; Node 24 recommended for `@discordjs/voice` and `DB_BACKEND=sqlite`)
- Intents: Guilds, GuildMessages, **Message Content**, **Server Members**, GuildModeration
- Discord app: token + Client ID

---

## Essential variables

| Variable | Role |
|-----------|--------|
| `DISCORD_TOKEN` | Bot token |
| `CLIENT_ID` | Command deploy |
| `GUILD_ID` | Optional: single test server |
| `DB_BACKEND` | `json` (default) or `sqlite` |
| `CLIENT_SECRET` · `SESSION_SECRET` · `BASE_URL` | Dashboard OAuth2 |
| `DASHBOARD_AUDIT_LOG` | Optional: dashboard audit log path |
| `GROQ_API_KEY` / `GEMINI_API_KEY` / … | AI (optional) |

Full list → [docs/en/CONFIG.md](docs/en/CONFIG.md) · [`.env.example`](.env.example).

---

## Web dashboard

1. Developer Portal → OAuth2 → redirect `<BASE_URL>/callback` (scopes `identify guilds`)
2. Env: `DASHBOARD_PORT`, `SESSION_SECRET`, `CLIENT_SECRET`, `BASE_URL`
3. Start:

```bash
npm start            # bot
npm run dashboard    # Express panel (same .env / DB)
```

Requires **Manage Server** + bot present in the guild.

Server grid (Join / Invite) · categorized modules · sectioned Welcome · 7/14/30 overview.

---

## Hosting

[docs/en/HOSTING.md](docs/en/HOSTING.md) — Docker, PM2, Render, Railway, VPS.

Health: `GET /healthz` → `ok`, `guilds`, `commands`, `backend`.

---

## Structure

```text
src/commands/          slash commands by category
src/events/            Discord listeners
src/modules/           descriptors + commander bridge
src/database/          json / sqlite
src/dashboard/         Express + UI (typical production)
apps/dashboard/        optional Next.js (Bun/pnpm, workspace:*)
packages/commander/    TS core (gate, breaker, guardian)
docs/                  CONFIG, COMMANDS, HOSTING (it/en)
.github/FUNDING.yml    donation links (Sponsor button)
```

```bash
npm run dev
npm run build:commander   # after changes to packages/commander
npm test
```

---

## License

[MIT](LICENSE) — contributions and issues welcome.

[![Donate with Stripe](https://img.shields.io/badge/Support-donate%20with%20Stripe-635BFF?style=for-the-badge&logo=stripe&logoColor=white)](https://donate.stripe.com/test_aFa9AMegr8Me61bgAXcbC01)
