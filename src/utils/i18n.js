'use strict';
/**
 * src/utils/i18n.js — mini-i18n EN/IT sopra il motore core (i18next).
 *
 * - `t(key, lang='en', vars={}): chiavi nested `a.b.c`, interpolazione `{var}`,
 *   fallback a IT se la chiave manca nella lingua richiesta; se manca anche in
 *   IT ritorna la chiave stessa.
 * - `getLang(guildId)`: legge `language` da guildConfig (default 'en', valida
 *   solo 'it'/'en'). guildId nullo (DM) → 'en' senza toccare il DB.
 * - `setLang(guildId, lang)`: scrive via guildConfig.updateGuild; lancia su
 *   lingua non supportata.
 *
 * Ownership i18n: questo file + src/locales/*. Le descrizioni dei comandi
 * slash restano in IT (non localizzate via Discord) per scelta documentata.
 */

const SUPPORTED_LANGS = ['it', 'en'];
const FALLBACK_LANG = 'en';

/** JSON canonico (src/locales/<lang>.json), fallback ai legacy .js. */
function loadLocale(lang) {
  try {
    return require(`../locales/${lang}.json`);
  } catch {}
  try {
    return require(`../locales/${lang}`);
  } catch {}
  return {};
}

const locales = {
  it: loadLocale('it'),
  en: loadLocale('en'),
};

// Motore i18next sopra gli stessi JSON (stessa API, stesso fallback IT):
// init sincrono su risorse inline — niente fs-backend perché i JSON
// viaggiano col codice. Se i18next manca/rompe, t() resta sul lookup manuale.
let i18n = null;
try {
  const i18next = require('i18next');
  const instance = i18next.createInstance();
  instance.init({
    lng: FALLBACK_LANG,
    fallbackLng: FALLBACK_LANG,
    resources: { it: { translation: locales.it }, en: { translation: locales.en } },
    interpolation: { prefix: '{', suffix: '}', escapeValue: false },
    initImmediate: false,
    showSupportNotice: false,
  });
  i18n = instance;
} catch {
  i18n = null;
}

function lookup(obj, key) {
  const parts = String(key).split('.');
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object' || !(p in cur)) return undefined;
    cur = cur[p];
  }
  return cur;
}

function interpolate(str, vars) {
  return String(str).replace(/\{(\w+)\}/g, (m, name) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : m
  );
}

function normalizeLang(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
}

/**
 * @param {string} key chiave nested es. 'ping.title'
 * @param {string} [lang='it']
 * @param {Object} [vars={}] valori per l'interpolazione `{var}`
 * @returns {string|*} stringa tradotta (o il valore non-stringa), mai undefined
 */
function t(key, lang = 'en', vars = {}) {
  const l = SUPPORTED_LANGS.includes(lang) ? lang : FALLBACK_LANG;
  // Via i18next quando disponibile (stesso fallback IT configurato sopra).
  if (i18n) {
    try {
      const out = i18n.t(String(key), { lng: l, ...(vars || {}) });
      // i18next ritorna la chiave se manca ovunque: identico al fallback manuale.
      if (typeof out === 'string' && out !== String(key)) return out;
      if (typeof out !== 'string') return out;
    } catch {}
  }
  let val = lookup(locales[l], key);
  if (val === undefined && l !== FALLBACK_LANG) val = lookup(locales[FALLBACK_LANG], key);
  if (val === undefined) return key;
  if (typeof val !== 'string') return val;
  return interpolate(val, vars || {});
}

/** Lingua della guild ('it' default). Mai lancia per guildId nullo. */
function getLang(guildId) {
  if (!guildId) return FALLBACK_LANG;
  try {
    const guildConfig = require('../database/guildConfig');
    return normalizeLang(guildConfig.getGuild(guildId).language);
  } catch {
    return FALLBACK_LANG;
  }
}

/** Imposta la lingua della guild. Lancia Error se lang non supportata. */
function setLang(guildId, lang) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    throw new Error(`Lingua non supportata: ${lang} (attese: ${SUPPORTED_LANGS.join(', ')})`);
  }
  const guildConfig = require('../database/guildConfig');
  return guildConfig.updateGuild(guildId, { language: lang });
}

module.exports = { t, getLang, setLang, SUPPORTED_LANGS, FALLBACK_LANG };
