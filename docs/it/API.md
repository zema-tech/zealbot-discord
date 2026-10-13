# API interne — Commander, Guardian, moduli

Come pilotare il bot dal codice (comandi, dashboard, MCP, CLI passano tutti di qui).
English edition: `API.md`.

## Commander (`src/modules/commander.js` + core `packages/commander`)

Orchestratore unico. Mai require diretto di `modules/registry` (lo smoke `[8/5]` lo vieta).

| Metodo | Firma | Cosa fa |
|---|---|---|
| `checkGate(commandName, guildId)` | `(string, string?)` | `{ok:true}` oppure `{ok:false, reason:'disabled'\|'isolated', featureId}`. Prima risolve comando → feature. |
| `canRun(guildId, featureId)` | `(string?, string?)` | Stesso gate per feature id (per eventi/handler). Fail-open. |
| `executeCommand(command, interaction, client, opts?)` | `opts.timeoutMs` (default 15000) | Esegue `command.execute` isolato con timeout; registra errori (breaker). Non lancia mai: `{ok, timedOut?, error?}`. |
| `guardEvent(file, event, args, client)` | — | Avvolge ogni listener: salta se il modulo non può girare, registra errori. Non lancia mai. |
| `featureOfCommand/Event/Component` | `(string)` | nome → feature id (oppure `null` = sempre consentito). |
| `listModules()` | — | Descrittori statici (id, versione, comandi…). |
| `moduleHealth(guildId)` | — | Stato per guild: enabled, isolated, errori, stats. |
| `setModuleEnabled(guildId, id, on)` | — | Toggle (riattivare azzera anche breaker+errori). Lancia su id sconosciuto. |
| `reloadModule(guildId, id)` | — | Rivalida la sintassi, ricarica il descrittore, azzera errori+breaker. |
| `resetModule(guildId, id)` | — | Azzera errori+breaker. |
| `updateModuleConfig(guildId, mod, patch)` | — | Instrada una patch validata al DB del modulo giusto. Lancia `{status, message}`. |
| `alertsPending()` | — | Segnali dolore in coda (Guardian). |
| `guardianSummary(guildId)` | — | Punteggi salute dal core TS (vedi sotto). |

## Guardian (sistema immunitario)

- **Score (passivo):** core TS `packages/commander` (`Guardian.observe/summary`): ok/fail/timeout per guild+feature → `{features, critical, weak, ok}`. Niente LLM nell'hot path.
- **Dolore (attivo):** `registry.recordError` ritorna `{tripped}`; al trip un segnale deduplicato va in coda (`drainAlerts`, finestra 15 min). `src/jobs/guardianJob.js` recapita nel canale log della guild ogni 2 min; ≥3 moduli isolati = febbre (1/ora).
- **Pelle:** `src/events/secretGuard.js` cancella token/chiavi leakati + DM + modlog.
- Salute quando vuoi: `commander.guardianSummary(gid)`, `commander.alertsPending()`.

## Configurazione per guild

Due strati (gli stessi di `/config` e dashboard):

1. **Toggle moduli** — `commander.setModuleEnabled(gid, id, on)` (persistente via `moduleState`).
2. **Impostazioni moduli** — `commander.updateModuleConfig(gid, mod, patch)` per `general, welcome, logging, levels, automod, autorole, starboard, confessioni, tickets, tempvoice, ai` (validati a monte; vedi `MODULE_FIELDS` in dashboard).
3. **Override env runtime** — `database/settings.js` (`setOverride/getOverride/effectiveEnv`, whitelist rigida). Leggi via `effectiveEnv()`, mai `process.env` diretto per le chiavi modificabili.

## Estendere con un nuovo modulo

1. Descrittore `src/modules/<id>.js` via `defineModule({id, title, commands, version…})` (validato, semver obbligatorio).
2. Slash command in `src/commands/<area>/` (autoload ricorsivo).
3. Listener in `src/events/` (un file per listener; eventi Discord condivisi sono pattern consentito, mai bypassare il gate — usa `commander.canRun`).
4. Stato in `src/database/<nome>.js` sopra `jsonDb` (migrazioni additive in `schema.js` con timbro `__v`).
5. Registra il feature id nelle mappe `commander.featureOf*` solo via descrittore (niente liste hardcoded altrove).
6. Docs: il comando appare in `docs/COMMANDS.md` via `node scripts/gen-docs.js`; aggiungi una sezione smoke con chiavi `qatest` + cleanup.

## Decisione dashboard (bloccata)

**Opzione B: Express (`src/dashboard`) è l'unica dashboard supportata.**
L'app Next.js sperimentale è stata rimossa; non reintrodurre una seconda dashboard senza un ADR.
