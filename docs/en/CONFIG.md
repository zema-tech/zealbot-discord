# Configuration (environment variables)

Every env read by the code (`grep process.env` in `src/`,
`deploy-commands.js`) plus `.env.example`. Copy `.env.example` to `.env`
and fill in at least the required ones. Never commit `.env`.

Per-server configuration (language, channels, welcome, automod, tickets, levels, AI, permissions) happens exclusively from the web dashboard (`<BASE_URL>/app.html`, Generale, Moderazione, Livelli, Ticket e Vocali, AI ed Extra, Permessi sections). This file only describes the process environment variables.

| Variable | Required | Default | Used in | Notes |
|---|---|---|---|---|
| `DISCORD_TOKEN` | yes | — | `src/index.js`, `deploy-commands.js` | Bot token. Without it, the bot exits with an error. |
| `CLIENT_ID` | yes (for command deploy and dashboard) | — | `deploy-commands.js`, `src/dashboard/auth.js` | Application ID. `deploy-commands.js` uses it with no fallback. |
| `GUILD_ID` | no | — (global deploy) | `deploy-commands.js` | If set, registers commands only on the test server (fast); otherwise global (up to ~1h). |
| `AI_PROVIDER` | no | `auto` | `src/utils/aiProviders.js` | `auto` picks from present keys; values: `openai`, `anthropic`, `gemini`, `groq`, `openrouter`, `mistral`, `deepseek`, `xai`, `together`, `cerebras`, `ollama`, `fireworks`, `novita`, `huggingface`, `nvidia`, `kimi`, `pollinations` (+ aliases `claude`, `google`, `grok`, `hf`); unknown value + `AI_API_URL` = custom OpenAI-compatible endpoint. |
| `OPENAI_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `gpt-4o-mini`. |
| `ANTHROPIC_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `claude-3-5-haiku-20241022`. |
| `GEMINI_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `gemini-2.0-flash`. |
| `GROQ_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `llama-3.3-70b-versatile`. |
| `OPENROUTER_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `openai/gpt-4o-mini`. |
| `MISTRAL_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `mistral-small-latest`. |
| `DEEPSEEK_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `deepseek-chat`. |
| `XAI_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `grok-3-mini`. |
| `TOGETHER_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo`. |
| `CEREBRAS_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `llama3.1-8b` (very fast). Multiple comma-separated keys = Hermes-style pool (`sk-a,sk-b`: rotation + key failover). |
| `FIREWORKS_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `accounts/fireworks/models/kimi-k2p6`. |
| `NOVITA_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `moonshotai/kimi-k2.5` (200+ models via `AI_MODEL`). |
| `HF_TOKEN` | no (one is enough) | — | `src/utils/aiProviders.js` | Hugging Face Inference Providers, default `deepseek-ai/DeepSeek-V3.2`. |
| `NVIDIA_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Default model `nvidia/nemotron-3-super-120b-a12b`. |
| `KIMI_API_KEY` | no (one is enough) | — | `src/utils/aiProviders.js` | Moonshot, default `kimi-for-coding`. |
| `AI_MODEL` | no | provider default model | `src/utils/aiProviders.js` | Accepts Hermes-style `provider:model` (e.g. `groq:llama-3.3-70b-versatile`, wins over `AI_PROVIDER`). Endpoint override via `<PREFIX>_BASE_URL` (e.g. `GROQ_BASE_URL`). |
| `AI_FALLBACKS` | no | — (no failover) | `src/utils/aiProviders.js` | E.g. `groq,openrouter`: if the primary fails (rate, timeout, network, HTTP, key), tries in order. If all fail, the shown error is the primary's. |
| `OLLAMA_HOST` | no | `http://localhost:11434` | `src/utils/aiProviders.js` | With `AI_PROVIDER=ollama`: local AI (default `llama3.1`), zero cloud, no keys. |
| `AI_API_URL` | no | `https://text.pollinations.ai` | `src/utils/aiProviders.js` | Custom OpenAI-compatible endpoint; without keys the free Pollinations is used, no key required. |
| `AI_API_KEY` | no | — | `src/utils/aiProviders.js` | Key for custom `AI_API_URL`. |
| `AI_DAILY_LIMIT` | no | `500` | `src/utils/ai.js` | Daily AI call budget on a shared key (`0` = unlimited). Past the limit the AI replies "Budget giornaliero esaurito" (daily budget exhausted). |
| `DB_BACKEND` | no | `json` | `src/database/store.js` | `json` (`src/database/*.json` files) or `sqlite` (`kv` table via `node:sqlite`, Node 22+). Anything other than `sqlite` falls back to `json`. |
| `DB_SQLITE_PATH` | no | `./data/bot.db` | `src/database/store.js`, `src/jobs/backup.js` | Sqlite database path (directory created if missing, `journal_mode=WAL`). Included in backup if the file exists. If `node:sqlite` is missing: fallback to json with warning. |
| `LOG_LEVEL` | no | `info` | `src/utils/logger.js` | `debug`, `info`, `warn`, `error`. JSON-lines logs on console + `logs/YYYY-MM-DD.log`. |
| `LOG_DIR` | no | `logs` | `src/utils/logger.js` | Directory for daily log files. |
| `BACKUP_DIR` | no | `backups` | `src/jobs/backup.js` | Nightly backup destination `YYYY-MM-DD-HHmm/`, 7-day retention, `last.json` journal. Not in `.env.example` (found via grep). |
| `SELF_IMPROVE` | no | off | `src/jobs/selfImprove.js` | Only `=1` enables nightly self-improvement. Never auto-commits: review with `git diff`. |
| `SELF_IMPROVE_TIME` | no | `22:00` | `src/jobs/selfImprove.js` | Local execution time. |
| `SELF_IMPROVE_DRY_RUN` | no | off | `src/jobs/selfImprove.js` | `=1`: report only, no patch applied. |
| `SELF_IMPROVE_GUILD_ID` | no | — (log only) | `src/jobs/selfImprove.js` | Server receiving the nightly report. |
| `DASHBOARD_PORT` | no | — (dashboard off) | `src/dashboard/index.js` | Required by `npm run dashboard` (separate process); without it, the dashboard doesn't start. |
| `SESSION_SECRET` | yes (if dashboard) | — | `src/dashboard/auth.js` | Session secret, at least 32 random characters. |
| `CLIENT_SECRET` | yes (if dashboard) | — | `src/dashboard/auth.js` | Discord app client secret (OAuth2). |
| `BASE_URL` | yes (if dashboard) | — | `src/dashboard/auth.js`, `/help` command | Public URL (e.g. `http://localhost:3000`); must match the OAuth2 redirect `<BASE_URL>/callback`. Also used in the `/help` footer. |

Notes:

- AI keys are alternatives: **one** key is enough and the provider is
  picked automatically (`AI_PROVIDER=auto`); without keys it works free
  via Pollinations (default `AI_API_URL`).
- Fixed 25s AI timeout in code (`src/utils/aiProviders.js`), not
  configurable via env.
- Backups always at 03:00 local with 7-day retention: code constants
  (`src/jobs/backup.js`), not env.
