# MCP — bot remote control (Hermes Agent style)

Inspired by [NousResearch/hermes-agent](https://github.com/nousresearch/hermes-agent):
same concepts (`mcp_servers`, `tools.include/exclude`, stdio + Streamable HTTP,
`mcp_<server>_<tool>` prefix), adapted to the bot.

| Direction | What it does | Config |
|---|---|---|
| **A. Server** (AI → bot) | Claude/ChatGPT operate the bot via `POST /mcp` | `/token crea`, snippet in `mcp/claude.example.json` |
| **B. Client** (bot → AI/tools) | The bot uses external MCP servers as tools | `mcp/servers.json` (from `mcp/servers.example.json`), `/mcp` command |

## A. Server — bot remote control

The bot exposes an **MCP server** (Streamable HTTP) on `POST /mcp`. Protocol
(`src/mcp/protocol.js`) and Bearer auth (`src/mcp/auth.js`) are stable and
untouchable: every token is valid for **one server only** and every tool enforces it.

### A.1. Create the token (once, from Discord)

As the server owner:

```
/token crea nome:claude-casa
```

Copy the shown token (it won't be recoverable) and the endpoint:

```
https://TUO-HOST/mcp
```

### A.2. Connect Claude

**Claude Code** (recommended):

```bash
claude mcp add --transport http zealbot https://TUO-HOST/mcp \
  --header "Authorization: Bearer dbt_..."
```

**Claude Desktop**: `Settings → Connectors → Add` with URL + header
`Authorization: Bearer dbt_...`. The same snippet is ready in
`mcp/claude.example.json`.

**Other MCP clients**: `POST /mcp` endpoint, `2025-06-18` protocol,
`initialize` (replies with `Mcp-Session-Id` header, send it back),
`tools/list`, `tools/call`. `GET /mcp` opens an SSE stream (needs a session),
`DELETE /mcp` closes it.

Code layout: `src/mcp/` — `protocol.js` (JSON-RPC, stable), `auth.js`
(Bearer + sessions, stable), `tools/` (one file per area + `index.js`
registry: new tool = new file + one line), `server.js` (Express mount).

### A.3. Scope rules (apply to every tool)

1. Every call requires `guildId`, which must match the token's server
   (logical 403 otherwise) — shared helper `src/mcp/tools/scope.js`.
2. **Status comes from the roster**: `module_status` and `guild_info` include the
   server's presence entry (name, members, snapshot freshness) read from the shared
   DB. If the bot is no (longer) in the server, the tool reports it
   (`botPresente: false`) but still answers — the roster is informative,
   never a blocker.
3. Top `limit`s are capped (default 10, max 25).

### A.4. Read tools (never writes)

| Tool | What it does |
|------|---------|
| `modules_list` | modules, versions, commands |
| `module_status` | on/off, 🛡️ protection, errors (per server) |
| `module_toggle` | turns a module on/off |
| `module_reset` | clears errors and protection (recovery) |
| `guild_snapshot` | modules + tickets + level top |
| `brain_search` | searches server skills/memories/files |
| `ticket_stats` | by type, avg close time, rating, staff top |
| `tickets_open` | open tickets with priority and claim |
| `brain_note_save` / `brain_note_forget` | writes/deletes server memories |
| `settings_get` / `settings_set` | AI provider, limits, logs (never API keys) |
| `economy_top`, `levels_top` | leaderboards |
| `user_cases` / `mod_history` | user moderation history |
| `bot_health` | uptime, mode, backend (honest nulls without client) |
| `config_get`, `shop_list`, `invites_top`, `channels_list`, `roles_list`, `analytics_summary`, `guild_info` | extra reads |
| `module_reload`, `module_config`, `announce_send` | writes via Commander |
| `economy_top` | wallet top (`limit`) |
| `levels_top` | level/XP top (`limit`) |
| `mod_history` | user moderation history (`userId`, `limit`) |
| `analytics_summary` | messages/joins/leaves for the last N days (`days`, max 30) |
| `config_get` | read-only server config (language, channels, automod…) |
| `shop_list` | roles-for-sale catalog |
| `invites_top` | top inviters (`limit`) |
| `channels_list` | live channels from Discord (id, name, type) |
| `roles_list` | live roles from Discord (id, name, color) |

### A.5. Write tools (via Commander + scope, never direct DB)

| Tool | What it does | Gate |
|------|---------|------|
| `module_toggle` | turns a module on/off | `Commander.setModuleEnabled` |
| `module_reload` | reloads without restart, clears errors+breaker | `Commander.reloadModule` |
| `module_reset` | clears errors+protection | `Commander.resetModule` |
| `module_config` | changes config (general, welcome, logging, levels, automod, autorole, starboard, confessioni, tickets, tempvoice, ai). Read first with `config_get`. Max 20-key patch, 2KB max values | `Commander.updateModuleConfig` |
| `announce_send` | sends a message to a server text channel (verified in the live list, max 2000 chars, @everyone/@here neutralized) | REST Bot token + channel scope |

Example (Claude): "read `config_get`, raise the automod level with
`module_config`, confirm with `module_status`, announce in #annunci with
`announce_send`".

### A.6. Management

- `/token lista` — usage and last-use of every token
- `/token revoca id:...` — disconnects Claude immediately

Security: tokens stored as sha256 only, never in logs; instant revocation;
every write goes through the Commander gate like everything else.

## B. Client — connect the bot to AIs (Hermes style)

The bot becomes an MCP **host**: it connects to external servers (filesystem, github,
fetch, sqlite, OpenAI-compatible gateway, local Ollama) and exposes them as
`mcp_<server>_<tool>` tools, usable from Discord (`/mcp chiama`) and by the AI.

```bash
cp mcp/servers.example.json mcp/servers.json  # NEVER commit servers.json (tokens!)
# enable a server in servers.json, then from Discord:
/mcp stato     # connected / failed servers / registered tools
/mcp lista     # names like mcp_<server>_<tool>
/mcp chiama nome:mcp_fetch_fetch argomenti:{"url":"https://..."}
/mcp ricarica  # re-reads servers.json without restart
```

Format details, catalog (`mcp/catalog.json`) and stdio security: see
`mcp/README.md`. Code: `src/mcp/client/` — `config.js` (`mcp_servers` loader
+ `${VAR}`), `transports.js` (stdio + Streamable HTTP, TAG sanitization),
`manager.js` (4-wave discovery, include/exclude filters with globs,
`include` wins, resources/prompts wrappers only if supported),
`aiBridge.js` (function-specs for the AI), `index.js` (lazy singleton).

Env: `MCP_ENABLED=1`, `MCP_SERVERS_PATH=./mcp/servers.json`, `MCP_TIMEOUT=30000`.
The native AI stays in `src/ai/aiProviders.js` (`OPENAI_API_KEY` keys etc.,
free Pollinations fallback): MCP adds *tools*, it doesn't replace providers.
