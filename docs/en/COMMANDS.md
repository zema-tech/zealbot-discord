# Bot commands

> Auto-generated with `node scripts/gen-docs.js` (Italian original: `docs/it/COMMANDS.md`, refreshed 2026-10-12) — do not edit by hand.
>
> Total: **89 commands** in **8 categories**.
> The category matches the subfolder in src/commands/.
> Cooldown in seconds per user (default 3s if not set by the module).
> Parameters marked with an asterisk (*) are required.
> Descriptions mirror the bot's ItalianSlash strings; names/options stay untranslated (code).

## Category index

- [ai](#ai) (9)
- [economy](#economy) (11)
- [fun](#fun) (12)
- [levels](#levels) (3)
- [moderation](#moderation) (15)
- [music](#music) (1)
- [tickets](#tickets) (2)
- [utility](#utility) (36)

## ai

Commands: 9

| Command | Description | Cooldown | Subcommands / Options |
|---|---|---|---|
| `/ai-config` | Configure the server's AI features | 3 s | **mostra** — Show current AI config (no params)<br>**mention** — Auto-reply when the bot is mentioned (`stato: boolean*`)<br>**automod-ai** — AI analysis of suspicious messages (automod) (`stato: boolean*`)<br>**ticket-ai** — Automatic AI replies in tickets (`stato: boolean*`)<br>**fun-ai** — AI fun commands (/immagina, /storia) (`stato: boolean*`)<br>**prompt** — Set custom system prompt (`testo: string*`)<br>**prompt-reset** — Restore the default system prompt (no params) |
| `/analizza` | Ask the AI for 5 actionable insights to grow the server | 30 s | `giorni: integer` |
| `/brain` | The bot's brain: skills, memories and files (Obsidian style) | 5 s | **stato** — Server brain stats (no params)<br>**skill-lista** — List active skills (no params)<br>**skill-mostra** — Show a skill (`nome: string*`)<br>**skill-crea** — Create a skill (staff) (`nome: string*`, `descrizione: string*`, `trigger: string*`, `istruzioni: string*`)<br>**skill-toggle** — Enable/disable a skill (staff) (`nome: string*`, `stato: boolean*`)<br>**skill-rimuovi** — Delete a server skill (staff) (`nome: string*`)<br>**skill-importa** — Import a skill from the skills/ library (staff) (`nome: string*`)<br>**memoria-salva** — Save a note to the brain (staff) (`titolo: string*`, `testo: string*`, `tag: string`)<br>**memoria-cerca** — Search memories (`query: string*`)<br>**memoria-lista** — List notes (no params)<br>**memoria-mostra** — Show a note (staff) (`titolo: string*`)<br>**memoria-dimentica** — Delete a note (staff) (`titolo: string*`)<br>**memoria-modello** — Create a note from a memory/modelli/ template (staff) (`modello: string*`, `titolo: string`)<br>**file-aggiungi** — Upload a .txt/.md reference file (staff) (`nome: string*`, `allegato: attachment*`)<br>**file-lista** — List uploaded files (no params)<br>**file-leggi** — Read a file (staff) (`nome: string*`)<br>**file-rimuovi** — Delete a file (staff) (`nome: string*`)<br>**persona-mostra** — Show memories about you (or a user, staff) (`utente: user`)<br>**persona-dimentica** — Forget a memory (number or text) (`rif: string*`, `utente: user`)<br>**profilo** — Show the server card as seen by the AI (no params)<br>**profilo-imposta** — Free-form server note for the AI (staff) (`testo: string*`)<br>**profilo-reset** — Remove the staff server note (staff) (no params) |
| `/chiedi` | Ask the server AI a question | 15 s | `domanda: string*` |
| `/codice` | Ask the AI about the bot's code | 10 s | **chiedi** — Ask a question about the bot code (`domanda: string*`)<br>**file** — Show a bot file (first lines) (`percorso: string*`)<br>**cerca** — Search a term in the code (`termine: string*`)<br>**albero** — Code structure overview (no params) |
| `/immagina` | Generate an image with AI from your prompt | 20 s | `prompt: string*` |
| `/jarvis` | Assign a task to JARVIS and its specialist agents | 10 s | `compito: string*`, `agente: string` |
| `/riassumi` | Summarize recent channel messages with AI | 30 s | `quantita: integer` |
| `/storia` | Generate an original tale with AI | 20 s | `tema: string*`, `lunghezza: string` |

## economy

Commands: 11

| Command | Description | Cooldown | Subcommands / Options |
|---|---|---|---|
| `/balance` | See your balance or another user's | 3 s | `utente: user` |
| `/bank` | Manage the bank (safe from theft) | 3 s | **deposita** — Deposit coins in the bank (`importo: integer*`)<br>**preleva** — Withdraw coins from the bank (`importo: integer*`) |
| `/daily` | Claim the daily reward (500 🪙) | 5 s | — |
| `/leaderboard` | Richest users leaderboard | 5 s | — |
| `/lotteria` | Server lottery: buy tickets and win the pot! | 3 s | **info** — Show pot, price and tickets sold (no params)<br>**compra** — Buy lottery tickets (`biglietti: integer`)<br>**estrai** — Draw the winner now (staff) (no params) |
| `/pay` | Send coins to another user | 5 s | `utente: user*`, `importo: integer*` |
| `/rep` | Server reputation system | 3 s | **dai** — Give +1 rep to a user (`utente: user*`)<br>**mostra** — Show a user's rep (`utente: user`)<br>**classifica** — Top 10 users by rep (no params) |
| `/rob` | Try to steal (wallet only) coins from a user | 10 s | `utente: user*` |
| `/shop` | Server role shop | 3 s | **lista** — Show roles for sale (no params)<br>**compra** — Buy a role with your coins (`ruolo: role*`)<br>**aggiungi** — Put a role up for sale (staff) (`ruolo: role*`, `prezzo: integer*`)<br>**rimuovi** — Remove a role from sale (staff) (`ruolo: role*`) |
| `/slots` | Slot machine: bet your coins | 8 s | `puntata: integer*` |
| `/work` | Work to earn coins | 5 s | — |

## fun

Commands: 12

| Command | Description | Cooldown | Subcommands / Options |
|---|---|---|---|
| `/8ball` | Ask the magic 8-ball something | 3 s | `domanda: string*` |
| `/affinita` | Compute the (ironic) affinity between two users | 3 s | `utente1: user*`, `utente2: user` |
| `/afk` | Tell you're away (or back) | 3 s | `motivo: string` |
| `/compleanno` | Server birthdays 🎂 | 3 s | **imposta** — Save your birthday (DD/MM) (`data: string*`)<br>**rimuovi** — Forget your birthday (no params)<br>**lista** — Upcoming birthdays (no params)<br>**canale** — Announcements channel (staff) (`canale: channel`) |
| `/confessa` | Anonymous server confessions | 5 s | **imposta** — Set the channel for anonymous confessions (staff) (`canale: channel*`)<br>**invia** — Send an anonymous confession (max 500 chars) (`testo: string*`) |
| `/dice` | Roll one or more dice | 3 s | `facce: integer`, `quantita: integer` |
| `/joke` | Tell a joke | 3 s | — |
| `/meme` | Generate a random meme | 3 s | — |
| `/oroscopo` | Discover today's horoscope: love, work and luck! | 3 s | `segno: string*` |
| `/preferiresti` | An impossible dilemma: vote A or B and see what the server thinks! | 10 s | — |
| `/sfida` | Show the weekly server challenge | 5 s | — |
| `/trivia` | Multiple-choice quiz: guess the answer within 20 seconds! | 10 s | — |

## levels

Commands: 3

| Command | Description | Cooldown | Subcommands / Options |
|---|---|---|---|
| `/premi` | Manage level reward roles | 3 s | **imposta** — Assign a role to a level (`livello: integer*`, `ruolo: role*`)<br>**rimuovi** — Remove a level reward (`livello: integer*`)<br>**lista** — Show all level rewards (no params) |
| `/rank` | Show your level (or another user's) | 3 s | `utente: user` |
| `/top` | Server level leaderboard | 5 s | — |

## moderation

Commands: 15

| Command | Description | Cooldown | Subcommands / Options |
|---|---|---|---|
| `/ban` | Ban a user from the server | 5 s | `utente: user*`, `motivo: string`, `giorni: integer` |
| `/caso` | Server moderation history | 3 s | **vedi** — View a case by ID (`id: string*`)<br>**utente** — View a user's history (`utente: user*`, `tipo: string`)<br>**nota** — Add a note to a user's history (`utente: user*`, `testo: string*`)<br>**elimina** — Delete a case from history (ManageGuild) (`id: string*`) |
| `/clear` | Delete messages with filters (max 100, last 14 days only) | 5 s | `quantita: integer*`, `utente: user`, `solo-bot: boolean`, `con-link: boolean`, `contiene: string` |
| `/kick` | Kick a user from the server | 5 s | `utente: user*`, `motivo: string` |
| `/lock` | Lock/unlock a text channel | 3 s | **on** — Lock the channel (staff only can write) (no params)<br>**off** — Unlock the channel (no params) |
| `/lockdown` | Lock/unlock ALL text channels (raid emergency) | 10 s | **on** — Lock all text channels (@everyone can't write) (`motivo: string`)<br>**off** — Restore pre-lockdown permissions (no params) |
| `/nuke` | Regenerate the channel (clone + delete the old one) | 10 s | — |
| `/segnala` | Report a user to staff | 60 s | `utente: user*`, `motivo: string*` |
| `/slowmode` | Set a channel slowmode | 3 s | `secondi: integer*`, `canale: channel` |
| `/timeout` | Time out a user (e.g. 10m, 1h, 1d) | 5 s | `utente: user*`, `durata: string*`, `motivo: string` |
| `/unban` | Unban a user by ID | 5 s | `userid: string*`, `motivo: string` |
| `/untimeout` | Remove a user's timeout | 3 s | `utente: user*`, `motivo: string` |
| `/warn` | Warn a user (automatic threshold actions, see /warnazioni) | 3 s | `utente: user*`, `motivo: string*` |
| `/warnazioni` | Configure automatic warn-threshold actions (staff) | 3 s | **mostra** — Show active rules (no params)<br>**imposta** — Replace rules (max 5, compact format) (`regole: string*`)<br>**reset** — Back to default (3 warns → 10 min timeout) (no params) |
| `/warnings` | Manage a user's warnings | 3 s | **lista** — View a user's warnings (`utente: user*`)<br>**rimuovi** — Remove a single warn by ID (`utente: user*`, `id: string*`)<br>**pulisci** — Remove all warnings of a user (`utente: user*`) |

## music

Commands: 1

| Command | Description | Cooldown | Subcommands / Options |
|---|---|---|---|
| `/musica` | Play music in voice (PeakBot style) | 3 s | **play** — Play a track or queue it (`query: string*`)<br>**skip** — Skip the current track (no params)<br>**stop** — Stop music and clear the queue (no params)<br>**coda** — Show the play queue (no params)<br>**pausa** — Pause the current track (no params)<br>**riprendi** — Resume the paused track (no params)<br>**volume** — Set volume (0-100) (`livello: integer*`)<br>**attuale** — Show the now-playing track (no params)<br>**mescola** — Shuffle the queue (no params)<br>**ripeti** — Repeat: off, track or queue (`modo: string*`)<br>**testi** — Lyrics of the now-playing track (no params)<br>**cronologia** — Recent tracks in this server (no params) |

## tickets

Commands: 2

| Command | Description | Cooldown | Subcommands / Options |
|---|---|---|---|
| `/ticket` | Professional ticket system | 3 s | **setup** — Configure the ticket system (category, panel, log, roles) (`canale-panel: channel*`, `categoria: channel*`, `ruolo-supporto: role*`, `canale-log: channel`, `ruolo-supporto-2: role`, `max-per-utente: integer`)<br>**panel** — Publish the button ticket panel (staff) (`canale: channel`, `tipi: string`, `titolo: string`)<br>**domande-mostra** — Show pre-open questions per type (`tipo: string*`)<br>**domande-imposta** — Set pre-open questions (staff, max 5) (`tipo: string*`, `d1: string*`, `d2: string`, `d3: string`, `d4: string`, `d5: string`)<br>**domande-reset** — Remove pre-open questions (staff) (`tipo: string*`)<br>**aggiungi** — Add a user to the ticket (`utente: user*`)<br>**rimuovi** — Remove a user from the ticket (`utente: user*`)<br>**claim** — Take charge of this ticket (staff) (no params)<br>**chiudi** — Close this ticket with transcript (`motivo: string`)<br>**riapri** — Reopen this ticket (staff) (no params)<br>**transcript** — Download this ticket's transcript (no params)<br>**priorita** — Set ticket priority (staff) (`livello: string*`)<br>**assegna** — Assign the ticket to a staffer (staff) (`staff: user*`)<br>**oggetto** — Set the ticket subject (`testo: string`)<br>**nota** — Add a staff note to the ticket (staff) (`testo: string*`)<br>**stats** — Server ticket stats (no params)<br>**rinomina** — Rename the ticket channel (`nome: string*`)<br>**tipo** — Change the ticket type (staff) (`nuovo: string*`)<br>**trasferisci** — Transfer ticket ownership (staff) (`utente: user*`)<br>**proteggi** — Protect the ticket from auto-close/deletion (staff) (no params)<br>**blacklist** — Block/unblock ticket users (staff) (`azione: string*`, `utente: user`)<br>**autoelimina** — Delete closed tickets after N days, 0 = off (staff) (`giorni: integer`)<br>**sposta** — Move the ticket to another category (staff) (`categoria: channel*`)<br>**tag** — Quick staff replies: use, create, list or remove (`azione: string*`, `nome: string`, `testo: string`)<br>**archivio** — Recent closed tickets (staff) (no params) |
| `/ticket-ai` | AI assistant for tickets (drafts and summaries) | 10 s | **suggerisci** — Generate a staff reply draft for this ticket (no params)<br>**riassumi** — Summarize this ticket in 5 points (no params) |

## utility

Commands: 36

| Command | Description | Cooldown | Subcommands / Options |
|---|---|---|---|
| `/analytics` | YouTube-Studio-style server stats (messages and members) | 10 s | `giorni: integer` |
| `/autoresponder` | Keyword or regex auto-replies (PeakBot style) | 3 s | **aggiungi** — Add an auto-reply (`parola: string*`, `risposta: string*`, `modalita: string`)<br>**rimuovi** — Remove an auto-reply by ID (`id: string*`)<br>**lista** — Show all auto-replies (no params)<br>**pulisci** — Delete all auto-replies (no params) |
| `/autorole` | Manage roles auto-assigned to new members | 3 s | **aggiungi** — Add an automatic role for new members (`ruolo: role*`)<br>**rimuovi** — Remove an automatic role (`ruolo: role*`)<br>**lista** — Show current autorole state (no params)<br>**attiva** — Enable or disable autorole (`stato: boolean*`) |
| `/avatar` | Show a user's avatar | 3 s | `utente: user` |
| `/comando` | Server custom commands: !name triggers with custom reply (PeakBot style) | 3 s | **crea** — Create a !name custom command (`nome: string*`, `risposta: string*`)<br>**modifica** — Edit a custom command reply (`nome: string*`, `risposta: string*`)<br>**elimina** — Delete a custom command (`nome: string*`)<br>**lista** — Show all custom commands (no params) |
| `/config` | Configure the bot from chat (applies instantly, no restart) | 3 s | **mostra** — Show effective values (masked secrets) (no params)<br>**lista** — Configurable keys (no params)<br>**imposta** — Set a variable (owner-only secrets) (`chiave: string*`, `valore: string*`)<br>**reset** — Back to .env/default for a key (`chiave: string*`) |
| `/costruisci` | Generate the server structure with AI from a description | 60 s | `descrizione: string*` |
| `/embed` | Create a custom embed with preview | 5 s | **crea** — Create an embed via modal and send it to the chosen channel (`canale: channel*`) |
| `/evento` | Manage scheduled server events | 5 s | **crea** — Create a scheduled event (`nome: string*`, `data-ora: string*`, `descrizione: string`, `canale-vocale: channel`)<br>**lista** — Show scheduled events (no params)<br>**elimina** — Delete a scheduled event (`id: string*`) |
| `/export` | Server data export and backup management (staff only) | 30 s | **server** — Download a JSON with all this server's data (no params)<br>**backup-ora** — Run a database backup now (no params)<br>**backup-lista** — Show the last 7 backups with date and size (no params)<br>**backup-ripristina** — Restore a previous backup (asks confirmation) (`nome: string*`) |
| `/giveaway` | Start a giveaway (the bot draws a winner) | 10 s | `durata: string*`, `premio: string*`, `vincitori: integer`, `ruolo: role` |
| `/help` | Show the full command list | 5 s | — |
| `/inviti` | Server invite stats | 3 s | **info** — Who invited a user and their counts (`utente: user`)<br>**classifica** — Top inviters (no params) |
| `/lingua` | Set the bot language for this server | 3 s | **mostra** — Show the server's current language (no params)<br>**imposta** — Set the server language (`lingua: string*`) |
| `/mcp` | Bot external MCP connections (Hermes style) | 5 s | **stato** — Connected / failed MCP servers / registered tools (no params)<br>**lista** — Tools available in this server (mcp_&lt;server&gt;_&lt;tool&gt;) (no params)<br>**cerca** — Search a tool across connected servers (Composio style) (`query: string*`)<br>**chiama** — Call an external MCP tool (`nome: string*`, `argomenti: string`)<br>**ricarica** — Re-read mcp/servers.json without restart (no params) |
| `/modulo` | Commander: module status, on/off and reload (one fault never kills the rest) | 3 s | **stato** — Show health of every module (no params)<br>**on** — Re-enable a module in this server (`nome: string*`)<br>**off** — Disable a module in this server (`nome: string*`)<br>**reload** — Reload a module without restarting the bot (`nome: string*`) |
| `/mydata` | Your data in the bot: export or delete (GDPR, this server only) | 10 s | **esporta** — Download everything the bot knows about you here (no params)<br>**dimentica** — Delete your data from this server (no params) |
| `/permessi` | Custom permissions: restrict commands to specific roles (PeakBot style) | 3 s | **imposta** — Allow a command only to certain roles (max 5) (`comando: string*`, `ruolo: role*`, `ruolo2: role`, `ruolo3: role`, `ruolo4: role`, `ruolo5: role`)<br>**rimuovi** — Remove a role from a command, or reset the command (no role) (`comando: string*`, `ruolo: role`)<br>**mostra** — Show custom permissions (of a command or all) (`comando: string`)<br>**reset** — Wipe ALL custom permissions (with confirmation) (no params) |
| `/ping` | Show the bot latency | 3 s | — |
| `/poll` | Create a reaction poll | 5 s | `domanda: string*`, `opzioni: string`, `durata: string` |
| `/profilo` | Show a user's full profile | 3 s | `utente: user` |
| `/reactionroles` | Create a reaction-role panel with select menu | 3 s | **crea** — Set panel channel, title and description (`canale: channel*`, `titolo: string*`, `descrizione: string*`)<br>**aggiungi** — Add a role to the panel (`ruolo: role*`, `etichetta: string*`, `emoji: string*`)<br>**rimuovi** — Remove a role from the panel (`ruolo: role*`)<br>**pubblica** — Publish the panel in the chosen channel (no params)<br>**elimina** — Delete the panel and its config (no params) |
| `/remind` | Set a reminder (e.g. 10m, 2h, 1d) | 5 s | `tempo: string*`, `testo: string*`, `canale: channel` |
| `/selfimprove` | Nightly bot self-improvement (status, dry run, execution) | 60 s | **stato** — Status: active? last run? AI provider? (no params)<br>**prova** — Dry-run now (proposes without applying) (no params)<br>**esegui** — Run the full cycle now (applies if tests pass) (no params)<br>**lezioni** — Lessons learned from the compendium (how it improves) (no params)<br>**principi** — Compendium review principles (no params) |
| `/serverinfo` | Show server information | 5 s | — |
| `/setup` | Configure the bot for this server | 3 s | **welcome** — Welcome channel + message (`canale: channel`, `messaggio: string`)<br>**goodbye** — Goodbye channel (`canale: channel`)<br>**logs** — Moderation log channel (`canale: channel`)<br>**suggest** — Suggestions channel (`canale: channel`)<br>**automod** — Enable/disable automoderation (`attiva: boolean*`)<br>**mostra** — Show current config (no params) |
| `/stanza` | Create and manage your private rooms | 3 s | **crea** — Create a private room (max 3 per user) (`nome: string`, `tipo: string`)<br>**aggiungi** — Add a user to the room (`utente: user*`)<br>**rimuovi** — Remove a user from the room (`utente: user*`)<br>**elimina** — Delete this room (no params) |
| `/starboard` | Configure the most-appreciated-message board | 3 s | **imposta** — Set starboard channel, threshold and emoji (`canale: channel*`, `soglia: integer`, `emoji: string`)<br>**disattiva** — Disable the starboard (no params)<br>**mostra** — Show current config (no params) |
| `/stats-canali` | Voice channels with live server stats | 5 s | **attiva** — Create the 3 stats channels (staff) (no params)<br>**disattiva** — Delete the stats channels (staff) (no params) |
| `/suggest` | Send a server suggestion | 10 s | `testo: string*` |
| `/template` | Apply a server-structure template (PeakBot style) | 10 s | **lista** — Show available templates (no params)<br>**anteprima** — Preview a template structure without creating it (`nome: string*`)<br>**applica** — Create template roles and channels (deletes nothing) (`nome: string*`) |
| `/tempvoice` | Configure temporary voice channels | 3 s | **imposta** — Set temp-voice lobby and category (`lobby: channel*`, `categoria: channel*`)<br>**disattiva** — Disable temporary voice (no params)<br>**mostra** — Show current config (no params) |
| `/token` | Personal API tokens to connect Claude to the bot (owner only) | 5 s | **crea** — Create a token (shown once) (`nome: string`)<br>**lista** — Active tokens of this server (no params)<br>**revoca** — Revoke a token (`id: string*`) |
| `/voice` | Manage your temporary voice channel | 3 s | **nome** — Rename your voice channel (`nome: string*`)<br>**limite** — Set the user limit (0 = no limit) (`numero: integer*`)<br>**blocca** — Lock the voice channel (no new joins) (no params)<br>**sblocca** — Unlock the voice channel (no params)<br>**kick** — Disconnect a user from voice (`utente: utente*`) |
| `/wizard` | Guided bot setup, step by step (channels, tickets, automod…) | 5 s | — |
| `/youtube` | New YouTube video notifications (free, via RSS) | 5 s | **aggiungi** — Notify new videos from a channel (staff) (`canale: string*`, `annunci: channel*`)<br>**rimuovi** — Stop notifications (staff) (`canale: string*`)<br>**lista** — Monitored channels (no params) |
