# Hosting — ZealBot

Guide in English to run the bot anywhere. Fast path for everyone:

```bash
npm run setup   # detects the host, verifies the token live, writes .env
npm run deploy  # registers slash commands
npm start       # bot (+ dashboard with npm run dashboard)
```

Common requirements:

- **Node.js ≥ 22.12** (recommended **Node 24**; @discordjs/voice requires it)
- **Toolchain**: the plain bot and the Express dashboard (`src/dashboard`) run on `npm`.
  For the Next.js dashboard (`apps/dashboard`, `workspace:*` protocol) you need
  **Bun** (primary, see `apps/dashboard/README.md`) or **pnpm**
  (`pnpm-workspace.yaml` included): `npm` does NOT support `workspace:*` and fails
  the install if it resolves those packages.
- `.env` file created from `.env.example` with at least `DISCORD_TOKEN` and `CLIENT_ID`
- Slash command deploy: `npm run deploy` (after every command add/change)
- Start: `npm start` (= `node src/index.js`) · Test: `npm test`

## Host matrix (auto-detected by `src/host/`)

| Host | Disk | Recommended storage | Dashboard | Notes |
|------|-------|---------------------|-----------|------|
| Render | ephemeral | sqlite on Disk (`/app/data`) | ✅ via `$PORT` | Blueprint `render.yaml` (bot + optional Next dashboard) |
| Railway | ephemeral | sqlite on Volume | ✅ via `$PORT` | `railway.toml` (root Dockerfile; dashboard Next = separate service) |
| Fly.io | ephemeral | sqlite on Volume (`/app/data`) | ✅ port 3000 | `fly.toml` (healthcheck `/healthz`: set the dashboard envs) |
| Pterodactyl | persistent | sqlite | ✅ panel port | Generic NodeJS egg |
| Docker | ephemeral* | sqlite on volume | ✅ `$PORT`/`3000` | `docker-compose.yml` (*persistent with volume); Next dashboard: `docker build -f apps/dashboard/Dockerfile` |
| VPS / local | persistent | sqlite (Node 22+) or json | ✅ | PM2 recommended; Next dashboard with Bun/PM2 |
| Termux | persistent | json | ✅ | Development, not production |
| Replit | persistent | json | ✅ | Always-on is paid |

> **Data persistence:** by default the bot uses JSON in `src/database/*.json`
> (`DB_BACKEND=json`). On hosts with an ephemeral filesystem (Railway/Render/Docker)
> use SQLite instead: `DB_BACKEND=sqlite` + `DB_SQLITE_PATH=./data/bot.db`
> (requires **Node ≥ 22**, uses `node:sqlite`, zero extra dependencies),
> with the `data/` folder on a persistent volume/disk.

---

## 1. Termux (Android)

```bash
pkg update && pkg install -y nodejs git
git clone <repo> zealbot && cd zealbot
npm ci
cp .env.example .env   # then fill it in with your editor
npm run deploy
npm start
```

Termux notes:

- No systemd: to keep it alive use `termux-wake-lock` + a `tmux` session,
  or PM2 (`npm i -g pm2 && pm2 start ecosystem.config.js && pm2 save`).
  PM2 does not restart on phone reboot by itself: reopen Termux and run `pm2 resurrect`.
- On Termux stay on `DB_BACKEND=json` (default) unless you have Node ≥ 22.
- Logs go to `logs/YYYY-MM-DD.log` (`LOG_LEVEL=info` by default).

## 2. VPS (Debian/Ubuntu) — systemd or PM2

```bash
# Node 24 LTS (nodesource) + clone
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs git
git clone <repo> /opt/zealbot && cd /opt/zealbot
npm ci --omit=dev
cp .env.example .env   # fill in DISCORD_TOKEN, CLIENT_ID, ...
npm run deploy
```

### Option A: systemd (recommended)

```bash
sudo cp zealbot.service /etc/systemd/system/zealbot.service
# adapt User/paths in the file if you don't use the "bot" user or /opt/zealbot
sudo systemctl daemon-reload
sudo systemctl enable --now zealbot
systemctl status zealbot
journalctl -u zealbot -f   # live logs
```

The `zealbot.service` file uses `WorkingDirectory=/opt/zealbot`,
`EnvironmentFile=/opt/zealbot/.env` and `Restart=always`.

### Option B: PM2

```bash
sudo npm i -g pm2
pm2 start ecosystem.config.js   # fork, 1 instance, logs in logs/pm2-*.log
pm2 save && pm2 startup         # automatic restart on boot
pm2 logs zealbot
```

> One instance only, please (`fork`, never `cluster`): the bot uses file-based DB,
> two instances writing the same JSON/SQLite would corrupt the data.

## 3. Docker

```bash
cp .env.example .env   # fill in the values
docker compose up -d --build
docker compose logs -f

# With web dashboard (optional profile, requires DASHBOARD_* in .env):
docker compose --profile dashboard up -d --build
```

- `Dockerfile`: `node:24-slim` base, `npm ci --omit=dev`, non-root `node` user,
  `NODE_ENV=production`, `/app/data /app/logs /app/backups` volumes.
- `docker-compose.yml`: `bot` service (`restart: unless-stopped`, `env_file: .env`,
  `./data ./logs ./backups` volumes); `bot-dashboard` service (only the
  `dashboard` profile) with published `${DASHBOARD_PORT:-3000}` port.
- **Conditional healthcheck** (see the Dockerfile comment): without `DASHBOARD_PORT`
  the bot exposes no HTTP, so the healthcheck immediately returns healthy
  (crashes are covered by `restart: unless-stopped`); with the dashboard on it hits
  `GET /healthz` (public endpoint with `/` fallback) via `node -e ... fetch(...)`
  with no need for `curl` in the image.
- In containers set `DB_BACKEND=sqlite` + `DB_SQLITE_PATH=./data/bot.db`
  (compose already defaults to it): the `src/database/` JSON files are **not**
  mounted as a volume because they live alongside the `.js` modules (mounting the folder
  would hide the code from the container).
- Music: the `node:24-slim` image does **not** include `ffmpeg` (needed by
  `discord-player`/`@discordjs/voice`). If you use music commands, add
  in the Dockerfile before `USER node`:
  `RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg && rm -rf /var/lib/apt/lists/*`.

## 4. Railway / Render

**Fast path (Render):** the repo includes `render.yaml` (Docker + `/healthz`
healthcheck + 1GB disk): *New → Blueprint*, then fill in the secret envs
(`DISCORD_TOKEN`, `CLIENT_ID`, `CLIENT_SECRET`, `BASE_URL`). The blueprint
already points SQLite at disk (`DB_SQLITE_PATH=/app/data/bot.db`).

Manual procedure (valid for both, ephemeral filesystem: persistent disk needed):

1. Create the service from the repo (Build: `npm ci`, Start: `node src/index.js`).
2. Set the **Environment Variables** from the panel (copy the keys from
   `.env.example`): `DISCORD_TOKEN`, `CLIENT_ID`, `DB_BACKEND=sqlite`,
   `DB_SQLITE_PATH=./data/bot.db`, and possibly `DASHBOARD_*`
   (on Render also open the port with `DASHBOARD_PORT`).
3. Mount a **persistent disk** on the `data/` path (e.g. Railway Volume →
   mount `/app/data`; Render Disk on Docker runtime → mount `/app/data`,
   on native Node runtime → `/opt/render/project/src/data`):
   that's where `bot.db`, `logs/` and `backups/` live. Without a disk, every deploy
   starts from zero (economy, levels, tickets… lost).
4. Run `npm run deploy` once (from local with the same env, or
   as a *one-off job*): registers slash commands on Discord.
5. Render free: inactivity spin-down **turns the bot off** (the bot must stay
   always online) — you need an always-on instance or a paid plan.

**Next.js dashboard (TypeScript):** `render.yaml` also includes the
`zealbot-dashboard` service (`apps/dashboard/Dockerfile`, `/` healthcheck):
fill in the envs from `apps/dashboard/.env.example` (`DISCORD_CLIENT_ID/SECRET`,
`NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `BOT_TOKEN`). On Railway create a separate
service with Dockerfile `apps/dashboard/Dockerfile`; on Fly copy `fly.toml`
changing Dockerfile and port. Local build: `docker build -f
apps/dashboard/Dockerfile -t zealbot-dashboard .` (requires Bun or pnpm for
workspaces, see Requirements).

## 5. Pterodactyl — egg note

No official egg: use a generic **NodeJS** egg (version 20):

- **Startup Command:** `node src/index.js`
- **Install Script:** `npm ci` (or `npm ci --omit=dev`)
- **Environment / Variables:** `DISCORD_TOKEN`, `CLIENT_ID` (+ `DB_BACKEND`,
  `AI_*`, `DASHBOARD_*` if needed) — or mount/upload an `.env` file
  in the server root.
- Data stays on the Pterodactyl server disk (persistent across restarts);
  take regular backups of `src/database/*.json` (or `data/bot.db` if using
  SQLite) with the `/backup` command or from the panel.
- The command deploy (`node deploy-commands.js`) runs once from
  console after setting the variables.

---

## Troubleshooting

| Symptom | Likely cause and fix |
|---|---|
| `Unsupported URL Type "workspace:"` on `npm install` | You're resolving `apps/dashboard` or `packages/*` with **npm**. For the **bot + Express dashboard** use only root dependencies (`npm ci` on the bot lockfile). For **Next** in `apps/dashboard` use **Bun** or **pnpm**. |
| `DisallowedIntents` / bot online but not responding | Enable in the [Developer Portal](https://discord.com/developers/applications) → Bot → **Privileged Gateway Intents**: **Server Members Intent** and **Message Content Intent** (the bot uses `GuildMembers` + `MessageContent`, see `src/index.js`). `GuildPresences` is **not** needed. |
| Missing or stale slash commands | Run `npm run deploy` (needs `CLIENT_ID`; with `GUILD_ID` commands land instantly on the test server, otherwise allow up to ~1h for global propagation). |
| `TokenInvalid` / `TOKEN_INVALID` | Wrong or regenerated `DISCORD_TOKEN`: update `.env` (never commit it) and restart. |
| Bot has no effect (roles, timeouts, channels) | **Permissions**: invite the bot with `bot` + `applications.commands` scopes and adequate permissions (Manage roles/channels, Ban, Moderate members for timeouts, Connect/Speak for music). The **bot role must sit above** the roles it manages, otherwise Discord silently refuses. |
| Dashboard: OAuth redirect failed | `BASE_URL` must match the Redirect URI registered in the Discord portal (`<BASE_URL>/callback`, scopes `identify`+`guilds`); `CLIENT_SECRET` and `SESSION_SECRET` (≥32 chars) are also required. |
| Port busy / dashboard won't open | Change `DASHBOARD_PORT` in `.env`; verify the port is exposed (firewall/VPS, `ports:` in compose, open port on Render). |
| Music won't start / voice errors | `ffmpeg` and `libsodium`/`opus` dependencies are needed (on VPS: `apt install ffmpeg`; on Docker see §3). Without them, other commands work anyway. |
| DB wiped after a redeploy | Ephemeral filesystem without volume: switch to `DB_BACKEND=sqlite` with persistent `data/` (§4). Locally, run `/backup` regularly (they land in `backups/`). |
| Crash loop / constant restarts | Read `logs/YYYY-MM-DD.log` (or `journalctl`/`pm2 logs`/`docker compose logs`): it's almost always an incomplete `.env` (missing `DISCORD_TOKEN` → immediate exit 1). |
