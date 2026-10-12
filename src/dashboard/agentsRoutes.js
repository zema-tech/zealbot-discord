'use strict';
/**
 * src/dashboard/agentsRoutes.js — Control-room agenti (i "goggles").
 *
 * La dashboard gira in un processo separato dal bot: legge sessioni e
 * approvazioni dallo store condiviso (collection `agents`). SSE in polling
 * sullo store (1.5s): niente socket tra processi, niente stato in memoria.
 */

const path = require('path');

const MANAGE_GUILD = 0x20n;

/** Guild dell'utente con Gestisci Server (via REST Discord, come loadAccess). */
async function manageableGuildIds(discordToken) {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => { try { ctrl.abort(); } catch {} }, 10000);
    let res;
    try {
      res = await fetch('https://discord.com/api/v10/users/@me/guilds', {
        headers: { Authorization: `Bearer ${discordToken}` },
        signal: ctrl.signal,
      });
    } finally {
      clearTimeout(timer);
    }
    if (!res.ok) return null;
    const list = await res.json().catch(() => null);
    if (!Array.isArray(list)) return null;
    const out = new Set();
    for (const g of list) {
      try {
        if (g && typeof g.id === 'string' && (BigInt(String(g.permissions || '0')) & MANAGE_GUILD) !== 0n) {
          out.add(g.id);
        }
      } catch {}
    }
    return out;
  } catch {
    return null;
  }
}

/** 403 se l'utente non gestisce la guild (fail closed anche in errore REST). */
async function requireGuildManager(req, res, gid) {
  try {
    if (!gid) {
      res.status(400).json({ ok: false, errore: 'Server sconosciuto.' });
      return false;
    }
    const allowed = await manageableGuildIds(req.discordToken);
    if (!allowed) {
      res.status(503).json({ ok: false, errore: 'Discord non raggiungibile: riprova.' });
      return false;
    }
    if (!allowed.has(String(gid))) {
      res.status(403).json({ ok: false, errore: 'Serve Gestisci Server in quel server.' });
      return false;
    }
    return true;
  } catch {
    try {
      res.status(403).json({ ok: false, errore: 'Accesso negato.' });
    } catch {}
    return false;
  }
}

/** Guild di una sessione (null se ignota). */
function sessionGuild(sid) {
  try {
    const sessions = require('../agents/sessions');
    const s = sessions.get(String(sid));
    return s && s.guildId ? String(s.guildId) : null;
  } catch {
    return null;
  }
}

/** Guild di un'approvazione (via sessione). */
function approvalGuild(aid) {
  try {
    const approvals = require('../agents/approvals');
    const list = typeof approvals.pending === 'function' ? approvals.pending() : [];
    const rec = Array.isArray(list) ? list.find((a) => a && a.id === String(aid)) : null;
    if (!rec || !rec.sessionId) return null;
    return sessionGuild(rec.sessionId);
  } catch {
    return null;
  }
}

function mountAgents(app, auth) {
  const express = require('express');
  const manifest = require('../agents/manifest');
  const sessions = require('../agents/sessions');
  const approvals = require('../agents/approvals');
  const vault = require('../agents/vault');

  // Pagina control-room (login Discord come /app.html).
  app.get('/agents.html', auth.requireAuthOrRedirect, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'agents.html'));
  });

  const r = express.Router();

  r.get('/', (req, res) => res.json({ ok: true, agents: manifest.list() }));

  r.get('/sessions', async (req, res) => {
    const limit = Math.min(Number.parseInt(req.query.limit || '20', 10) || 20, 50);
    // Solo sessioni dei server che gestisci (niente sbirciate cross-guild).
    const allowed = await manageableGuildIds(req.discordToken);
    if (!allowed) return res.status(503).json({ ok: false, errore: 'Discord non raggiungibile: riprova.' });
    let list = [];
    try {
      list = sessions.list(limit * 3).filter((s) => s && s.guildId && allowed.has(String(s.guildId))).slice(0, limit);
    } catch {}
    res.json({ ok: true, sessions: list });
  });

  r.get('/sessions/:id', async (req, res) => {
    const gid = sessionGuild(req.params.id);
    if (!(await requireGuildManager(req, res, gid))) return;
    const s = sessions.get(String(req.params.id));
    if (!s) return res.status(404).json({ ok: false, errore: 'Sessione non trovata.' });
    res.json({ ok: true, session: s });
  });

  // Stream live di una sessione (goggles): polling store, heartbeat 15s.
  r.get('/sessions/:id/stream', async (req, res) => {
    const id = String(req.params.id);
    if (!(await requireGuildManager(req, res, sessionGuild(id)))) return;
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(': connesso\n\n');
    let lastSteps = -1;
    let lastStatus = '';
    let alive = true;
    const hb = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {}
    }, 15000);
    if (typeof hb.unref === 'function') hb.unref();
    const tick = () => {
      if (!alive) return;
      let s = null;
      try {
        s = sessions.get(id);
      } catch {}
      if (!s) {
        try {
          res.write('event: gone\ndata: {"gone":true}\n\n');
        } catch {}
        cleanup();
        return;
      }
      try {
        if (s.steps.length !== lastSteps || s.status !== lastStatus) {
          lastSteps = s.steps.length;
          lastStatus = s.status;
          res.write(`data: ${JSON.stringify({ steps: s.steps.slice(-60), status: s.status, result: s.result })}\n\n`);
        }
        if (s.status !== 'running') {
          setTimeout(cleanup, 3000);
        }
      } catch {
        cleanup();
      }
    };
    function cleanup() {
      alive = false;
      clearInterval(hb);
      clearInterval(iv);
      try {
        res.end();
      } catch {}
    }
    const iv = setInterval(tick, 1500);
    if (typeof iv.unref === 'function') iv.unref();
    tick();
    req.on('close', cleanup);
  });

  r.get('/approvals/pending', (req, res) => {
    res.json({ ok: true, pending: approvals.pending() });
  });

  r.post('/approvals/:id/resolve', async (req, res) => {
    const { approved, note } = req.body || {};
    // Solo chi gestisce il server della sessione (come i bottoni Discord: owner).
    if (!(await requireGuildManager(req, res, approvalGuild(req.params.id)))) return;
    const who = (req.user && (req.user.username || req.user.id)) || 'dashboard';
    const cur = approvals.resolve(String(req.params.id), approved === true, who, note || null);
    if (!cur) return res.status(404).json({ ok: false, errore: 'Richiesta non trovata o già risolta.' });
    res.json({ ok: true, approval: cur });
  });

  // Take-over: "entra nello schermo" e detta un'istruzione all'agente.
  r.post('/sessions/:id/inbox', async (req, res) => {
    if (!(await requireGuildManager(req, res, sessionGuild(req.params.id)))) return;
    const text = String((req.body && req.body.text) || '').trim();
    if (!text) return res.status(400).json({ ok: false, errore: 'Testo mancante.' });
    const ok = sessions.inject(String(req.params.id), text.slice(0, 1000));
    if (!ok) return res.status(404).json({ ok: false, errore: 'Sessione non trovata o già chiusa.' });
    res.json({ ok: true });
  });

  // Vault: solo nomi servizi/account, MAI segreti.
  r.get('/vault', (req, res) => {
    res.json({ ok: true, enabled: vault.isEnabled(), services: vault.listServices() });
  });

  return { router: r, mountPath: '/api/agents' };
}

module.exports = { mountAgents };
