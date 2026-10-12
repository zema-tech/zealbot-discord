# Agents — JARVIS + specialists (ZealBot)

`/jarvis` assigns tasks in natural language. **JARVIS** (orchestrator)
understands, routes to the right specialist and stays responsible for the result.
Specialists never call each other: only JARVIS → specialist
(same principle as the Commander: brain → muscles).

## The agents

| Agent | Role | Example tasks |
|--------|-------|-------------------|
| ⚡ **JARVIS** | Orchestrator + generalist | anything; routes when needed |
| 🛡️ **Sentinel** | Moderation and safety | anti-raid plans, automod thresholds, ban procedures |
| 🎫 **Steward** | Tickets and support | canned replies, intake forms |
| 🎵 **Maestro** | Music and voice | queues, music command setup |
| 💰 **Banker** | Economy and levels | balances, rewards, XP tuning |
| 📚 **Lore** | Knowledge and code | summaries, explanations, server memory |
| 🔭 **Scout** | Web and external services | reading pages, using logged-in services |

Usage: `/jarvis task:<text>` (JARVIS chooses) or `/jarvis task:<text> agent:scout` (forced).
AI-less routing is keyword-based and always works; with an AI key
(even free by default, see `.env.example`) specialists reason
in steps (ReAct, max `JARVIS_MAX_STEPS`).

## Per-agent sandbox

Every run executes in an application sandbox (`src/agents/sandbox.js`):

- **capability-based**: only manifest tools (`say`, `note`, `fetchUrl`, `useService`, `askOwner`) — no free `require`/`fs`/network;
- **jail directory**: `data/sandboxes/<agent>/` (gitignored);
- **timeout**: `JARVIS_TASK_TIMEOUT_MS` (default 2 min);
- **audit**: start/end/errors in the logger, never secrets in logs.

It's logical isolation, not a VM: it protects against errors and tool abuse,
not hostile native code (plugins stay isolated via the pluginLoader).

## Goggles — the control-room (`/agents.html`)

Agents don't have a screen to truly share: the goggles are the **live
trace** of every session (thoughts → actions → observations →
result), visible live on the dashboard and fed by the shared
store (bot and dashboard are separate processes).

From the control-room you can:

- 👁️ **enter the screen**: open a session and watch the live stream (SSE);
- 🎧 **take over**: dictate an instruction read at the next step;
- ✅/⛔ **approve or deny** pending requests;
- 🔑 see **which services** hold vault credentials (never the values).

On Discord, approvals also arrive as buttons
(Approve/Deny) in the channel where you ran `/jarvis`.

## Vault — service logins

The owner stores credentials (tokens/API keys) and agents **use the
services without ever seeing the secrets**:

1. set `VAULT_KEY` in `.env` (min 16 chars, never commit it);
2. store the credential (via code: `vault.storeSecret(service, account, secret)`);
3. the specialist (today only Scout) calls `useService`: an
   **approval request** starts (dashboard + Discord);
4. once approved → the **broker** injects `Authorization: Bearer <secret>` into
   an https call and returns only the outcome (the secret is redacted
   if it reappears in the output).

Honest limits: Bearer-only over https, no internal hosts; **no bypassing
captchas/2FA/interactive logins** — humans handle those. Every use is
tracked (service, account, agent, session).

## Files

```text
src/agents/            manifest, router (JARVIS), sandbox, sessions,
                       approvals, vault, tools, index (facade)
src/commands/ai/jarvis.js   /jarvis + approval buttons
src/modules/agents.js       Commander feature (per-guild toggle)
src/dashboard/agentsRoutes.js + public/agents.html   control-room
```

Env: `VAULT_KEY`, `JARVIS_TASK_TIMEOUT_MS`, `JARVIS_APPROVAL_TIMEOUT_MS`,
`JARVIS_MAX_STEPS` (see `.env.example`).
