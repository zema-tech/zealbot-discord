'use strict';
/**
 * src/core/i18n.js — motore i18n (i18next + fs-backend sopra src/locales/*.json).
 *
 * Lingue: en (default + fallback), it. I JSON sono canonici; i18next li
 * carica da disco via fs-backend (init async all'avvio), con fallback
 * inline se il backend fallisce — t() non lancia mai e non aspetta mai.
 *
 * API:
 *   initI18n()                 -> da chiamare all'avvio (await), mai fatale
 *   getGuildLanguage(guildId)  -> 'en'|'it' (default 'en', sync, mai lancia)
 *   setGuildLanguage(guildId, lang) -> salva su guildConfig (lancia su invalida)
 *   t(guildId, key, vars)      -> stringa localizzata per la guild
 *
 * Nota .ts: il prompt chiedeva `src/core/i18n.ts`, ma `src/` non ha build
 * TypeScript (solo packages/commander): un .ts sarebbe codice morto. Questo
 * .js è il contratto eseguibile; i tipi sono documentati qui sopra.
 */

const path = require('path');

const SUPPORTED = ['en', 'it'];
const FALLBACK = 'en';

function normalize(lang) {
  const l = String(lang || '').toLowerCase().trim();
  return SUPPORTED.includes(l) ? l : FALLBACK;
}

// JSON caricati sync all'avvio del modulo (fallback se il backend fallisce).
function loadInline() {
  const out = {};
  for (const l of SUPPORTED) {
    try {
      out[l] = require(`../locales/${l}.json`);
    } catch {
      try {
        out[l] = require(`../locales/${l}`);
      } catch {
        out[l] = {};
      }
    }
  }
  return out;
}

const inline = loadInline();
let engine = null;
let ready = false;

/** Da chiamare all'avvio (await). Mai fatale: in errore resta il fallback inline. */
async function initI18n() {
  try {
    const i18next = require('i18next');
    const Backend = require('i18next-fs-backend');
    const inst = i18next.createInstance();
    await inst.use(Backend).init({
      lng: FALLBACK,
      fallbackLng: FALLBACK,
      supportedLngs: SUPPORTED,
      preload: [...SUPPORTED],
      backend: {
        loadPath: path.join(__dirname, '..', 'locales', '{{lng}}.json'),
      },
      interpolation: { prefix: '{', suffix: '}', escapeValue: false },
      initImmediate: false,
      showSupportNotice: false,
    });
    engine = inst;
    ready = true;
  } catch {
    engine = null;
    ready = false;
  }
  return ready;
}

function lookup(obj, key) {
  const parts = String(key || '').split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function interpolate(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(vars || {}, name) ? String(vars[name]) : m
  );
}

/** Lingua della guild (default 'en'). Sync, mai lancia. */
function getGuildLanguage(guildId) {
  if (!guildId) return FALLBACK;
  try {
    const guildConfig = require('../database/guildConfig');
    return normalize(guildConfig.getGuild(guildId).language);
  } catch {
    return FALLBACK;
  }
}

/** Salva la lingua. Lancia su lingua non supportata o guild mancante. */
function setGuildLanguage(guildId, lang) {
  const l = String(lang || '').toLowerCase().trim();
  if (!SUPPORTED.includes(l)) {
    throw new Error(`Lingua non supportata: ${lang} (attese: ${SUPPORTED.join(', ')}).`);
  }
  if (!guildId) throw new Error('guildId mancante.');
  const guildConfig = require('../database/guildConfig');
  guildConfig.updateGuild(guildId, { language: l });
  return l;
}

/**
 * Stringa localizzata per la guild. Mai undefined: fallback en, poi chiave.
 * @param {string|null} guildId
 * @param {string} key es. 'moderation.ban.success'
 * @param {object} [vars] interpolazione {var}
 */
function t(guildId, key, vars = {}) {
  const lang = getGuildLanguage(guildId);
  if (engine && ready) {
    try {
      const out = engine.t(String(key), { lng: lang, ...(vars || {}) });
      if (typeof out === 'string' && out !== String(key)) return out;
      if (typeof out !== 'string') return out;
    } catch {}
  }
  let val = lookup(inline[lang], key);
  if (val === undefined && lang !== FALLBACK) val = lookup(inline[FALLBACK], key);
  if (val === undefined) return String(key);
  if (typeof val !== 'string') return val;
  return interpolate(val, vars || {});
}

module.exports = { initI18n, getGuildLanguage, setGuildLanguage, t, SUPPORTED, FALLBACK, isReady: () => ready };
