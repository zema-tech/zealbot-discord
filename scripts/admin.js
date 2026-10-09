#!/usr/bin/env node
'use strict';
/**
 * scripts/admin.js — CLI admin da terminale (Termux-friendly, stile zeal-bot).
 *
 *   npm run admin -- status
 *   npm run admin -- guilds
 *   npm run admin -- moduli <gid> [on|off <modulo>]
 *   npm run admin -- stats <gid>
 *   npm run admin -- user <gid> <uid>
 *   npm run admin -- config [get <chiave> | set <chiave> <valore> | reset <chiave> | lista]
 *   npm run admin -- token <gid> <crea [nome] | lista | revoca <id>>
 *   npm run admin -- backup
 *
 * Solo DB locali: niente gateway Discord. Comandi live (annunci, kick…)
 * restano su Discord/dashboard. Exit code != 0 in errore (per script).
 */

const path = require('path');

const ROOT = path.join(__dirname, '..');
const DB = path.join(ROOT, 'src', 'database');

function out(o) {
  console.log(typeof o === 'string' ? o : JSON.stringify(o, null, 2));
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exitCode = 1;
}

function help() {
  console.log(`Uso: npm run admin -- <comando> [args]

  status                  salute: moduli, backend, DB, memoria
  guilds                  server noti nei DB
  moduli <gid>            salute moduli del server
  moduli <gid> on|off <m> toggle modulo (come /modulo)
  stats <gid>             ticket + livelli + economy
  user <gid> <uid>        livelli, monete, warn, casi
  config lista|get|set|reset  override runtime (/config da chat)
  token <gid> crea|lista|revoca  token MCP personali
  backup                  backup immediato come quello notturno
`);
}

function cmdStatus() {
  const commander = require(path.join(ROOT, 'src', 'modules', 'commander.js'));
  const mods = commander.listModules();
  let backend = 'json';
  try {
    backend = require(path.join(DB, 'store.js')).backend();
  } catch {}
  const mu = process.memoryUsage();
  out({
    ok: true,
    uptimeSec: Math.floor(process.uptime()),
    modules: mods.length,
    backend,
    memoryMB: Math.round(mu.heapUsed / 1048576),
    alerts: commander.alertsPending(),
    node: process.version,
  });
}

function knownGuilds() {
  const { load, dbFile } = require(path.join(DB, 'jsonDb.js'));
  const ids = new Set();
  for (const name of ['tickets', 'levels', 'economy', 'guildConfig', 'warnings']) {
    try {
      const db = load(dbFile(name));
      for (const k of Object.keys(db)) {
        if (typeof k === 'string' && !k.startsWith('__') && !/^(qatest|w1test|gtest)/.test(k)) ids.add(k);
      }
    } catch {}
  }
  return [...ids].sort();
}

function cmdGuilds() {
  const ids = knownGuilds();
  if (!ids.length) return out('(nessun server nei DB: avvia prima il bot)');
  out(ids.map((id) => ({ guildId: id })));
}

function cmdModuli([gid, action, mod]) {
  if (!gid) return fail('Uso: moduli <gid> [on|off <modulo>]');
  const commander = require(path.join(ROOT, 'src', 'modules', 'commander.js'));
  if (!action) {
    return out(commander.moduleHealth(gid).map((m) => ({
      id: m.id, enabled: m.enabled, isolated: m.isolated, ok: m.ok, errors: (m.errors || []).length,
    })));
  }
  if ((action !== 'on' && action !== 'off') || !mod) return fail('Uso: moduli <gid> on|off <modulo>');
  try {
    const entry = commander.setModuleEnabled(gid, mod, action === 'on');
    out({ id: entry?.id || mod, enabled: entry?.enabled ?? (action === 'on') });
  } catch (e) {
    fail(e.message);
  }
}

function cmdStats([gid]) {
  if (!gid) return fail('Uso: stats <gid>');
  const res = { guildId: gid };
  try {
    const t = require(path.join(DB, 'tickets.js')).getStats(gid);
    res.tickets = { open: t.open, closed: t.closed, avgCloseMin: t.avgCloseMin, avgRating: t.avgRating };
  } catch {}
  try {
    const l = require(path.join(DB, 'levels.js')).getLeaderboard(gid, 5);
    res.levelTop = l.map((e) => ({ id: e.id, level: e.level, total: e.total }));
  } catch {}
  try {
    const e = require(path.join(DB, 'economy.js')).getLeaderboard(gid, 5);
    res.ecoTop = e.map((x) => ({ id: x.id, total: x.balance ?? x.total ?? 0 }));
  } catch {}
  out(res);
}

function cmdUser([gid, uid]) {
  if (!gid || !uid) return fail('Uso: user <gid> <uid>');
  const res = { guildId: gid, userId: uid };
  try {
    const l = require(path.join(DB, 'levels.js')).getLevel(gid, uid);
    res.levels = { level: l.level, xp: l.xp };
  } catch {}
  try {
    const u = require(path.join(DB, 'economy.js')).getUser(gid, uid);
    res.economy = { balance: u.balance, bank: u.bank };
  } catch {}
  try {
    const w = require(path.join(DB, 'warnings.js')).getWarnings(gid, uid);
    res.warnings = w.map((x) => ({ id: x.id, reason: x.reason }));
  } catch {}
  try {
    const c = require(path.join(DB, 'cases.js')).getUserCases(gid, uid, 10);
    res.cases = c.map((x) => ({ id: x.id, type: x.type, reason: x.reason }));
  } catch {}
  out(res);
}

function cmdConfig([op, key, ...rest]) {
  const settings = require(path.join(DB, 'settings.js'));
  if (!op || op === 'lista') {
    return out(settings.listKeys().map((k) => ({ key: k.key, secret: k.secret, overridden: k.overridden })));
  }
  if (op === 'get') {
    if (!key) return fail('Uso: config get <chiave>');
    const k = key.toUpperCase();
    const v = settings.getOverride(k);
    const env = settings.effectiveEnv()[k];
    return out({ key: k, override: v ?? null, effective: v !== undefined ? v : (env ?? null), secret: !!settings.WHITELIST[k]?.secret });
  }
  if (op === 'set') {
    if (!key || !rest.length) return fail('Uso: config set <chiave> <valore>');
    try {
      const saved = settings.setOverride(key, rest.join(' '));
      const shown = settings.WHITELIST[saved.key]?.secret ? settings.mask(saved.value) : saved.value;
      return out({ key: saved.key, value: shown });
    } catch (e) {
      return fail(e.message);
    }
  }
  if (op === 'reset') {
    if (!key) return fail('Uso: config reset <chiave>');
    try {
      return out({ key: key.toUpperCase(), reset: settings.deleteOverride(key) });
    } catch (e) {
      return fail(e.message);
    }
  }
  return fail('Uso: config lista|get|set|reset');
}

function cmdToken([gid, op, arg]) {
  if (!gid || !op) return fail('Uso: token <gid> crea [nome] | lista | revoca <id>');
  const tokens = require(path.join(DB, 'apiTokens.js'));
  if (op === 'crea') {
    // Da terminale serve l'owner reale: lo chiede, niente default.
    const owner = process.env.ADMIN_OWNER_ID || '';
    if (!owner) return fail('Imposta ADMIN_OWNER_ID=<tuo id Discord> per creare token da CLI.');
    const rec = tokens.createToken(gid, owner, arg || 'cli');
    console.log(`Endpoint: <BASE_URL>/mcp\nHeader: Authorization: Bearer <token>\n`);
    return out({ id: rec.id, token: rec.token, guildId: rec.guildId });
  }
  if (op === 'lista') {
    return out(tokens.listTokens(gid));
  }
  if (op === 'revoca') {
    if (!arg) return fail('Uso: token <gid> revoca <id>');
    return out({ revoked: tokens.revokeToken(arg) });
  }
  return fail('Uso: token <gid> crea|lista|revoca');
}

function cmdBackup() {
  try {
    const { runBackupNow } = require(path.join(ROOT, 'src', 'jobs', 'backup.js'));
    const r = runBackupNow();
    out({ ok: r.ok, dir: r.dir, files: (r.files || []).length, pruned: r.pruned, error: r.error || null });
    if (!r.ok) process.exitCode = 1;
  } catch (e) {
    fail(e.message);
  }
}

function main() {
  const [cmd, ...args] = process.argv.slice(2);
  if (!cmd || cmd === 'help' || cmd === '--help') return help();
  const map = {
    status: cmdStatus, guilds: cmdGuilds, moduli: () => cmdModuli(args),
    stats: () => cmdStats(args), user: () => cmdUser(args), config: () => cmdConfig(args),
    token: () => cmdToken(args), backup: cmdBackup,
  };
  if (!map[cmd]) {
    fail(`Comando sconosciuto: ${cmd}`);
    return help();
  }
  try {
    map[cmd]();
  } catch (e) {
    fail(e.message);
  }
}

if (require.main === module) main();

module.exports = { main };
