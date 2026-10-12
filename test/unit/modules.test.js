'use strict';
/**
 * Unit test moduli/DB puri + guardie. Chiavi `utest_*` su disco con cleanup
 * in finally (ogni test pulisce il suo). Mai rete.
 */
const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');

const DB = path.join(__dirname, '..', '..', 'src', 'database');
const BRAIN = path.join(__dirname, '..', '..', 'src', 'ai', 'brain');
const jsonDb = require(path.join(DB, 'jsonDb.js'));

const G = 'utest_g1';

function scrub(file, key = G) {
  try {
    const f = jsonDb.dbFile(file);
    const db = jsonDb.load(f);
    if (db[key] !== undefined) {
      delete db[key];
      jsonDb.save(f, db);
    }
  } catch {}
}

describe('warnings actions', () => {
  const W = require(path.join(DB, 'warnings.js'));
  it('default storico + selezione soglia', () => {
    assert.deepEqual(W.getWarnActions('nope'), [{ warns: 3, action: 'timeout', minutes: 10 }]);
    const rules = [{ warns: 2, action: 'timeout', minutes: 5 }, { warns: 5, action: 'ban', minutes: 0 }];
    assert.equal(W.actionFor(1, rules), null);
    assert.equal(W.actionFor(4, rules).action, 'timeout');
    assert.equal(W.actionFor(9, rules).action, 'ban');
  });
  it('validazione rifiuta spazzatura', () => {
    for (const bad of [[], [{ warns: 2, action: 'x' }], [{ warns: 2, action: 'kick' }, { warns: 2, action: 'ban' }]]) {
      assert.throws(() => W.setWarnActions(G, bad));
    }
  });
  it('roundtrip con cleanup', () => {
    try {
      const saved = W.setWarnActions(G, [{ warns: 4, action: 'kick', minutes: 0 }]);
      assert.equal(saved[0].warns, 4);
      assert.equal(W.getWarnActions(G)[0].action, 'kick');
    } finally {
      const f = jsonDb.dbFile('warnings');
      const db = jsonDb.load(f);
      delete db[G];
      jsonDb.save(f, db);
    }
  });
});

describe('levels totali veri', () => {
  const L = require(path.join(DB, 'levels.js'));
  it('cumulativo sulla curva (L2 = 100+175+resto)', () => {
    assert.equal(L.totalXp({ level: 2, xp: 50 }), 325);
    assert.equal(L.totalXp({}), 0);
    assert.equal(L.totalXp({ level: -3, xp: -5 }), 0);
  });
  it('voiceMinutes separati dai messaggi', () => {
    try {
      const v = L.addXp(G, 'u1', 100, { messages: 0, voiceMinutes: 30 });
      assert.equal(v.voiceMinutes, 30);
      assert.equal(v.messageCount, 0);
      const m = L.addXp(G, 'u2', 10);
      assert.equal(m.messageCount, 1);
      assert.equal(m.voiceMinutes, 0);
      assert.equal(L.getRankPosition(G, 'fantasma'), null);
    } finally {
      scrub('levels');
    }
  });
});

describe('tickets stats corrette', () => {
  const T = require(path.join(DB, 'tickets.js'));
  it('byType è oggetto, medie giuste', () => {
    const f = jsonDb.dbFile('tickets');
    try {
      const db = jsonDb.load(f);
      db[G] = {
        config: T.getConfig(G), counter: 2,
        tickets: {
          a: { channelId: 'a', ownerId: 'u', type: 'bug', number: 1, status: 'closed', createdAt: 1000, closedAt: 1000 + 30 * 60000 },
          b: { channelId: 'b', ownerId: 'u', type: 'supporto', number: 2, status: 'open', createdAt: 1 },
        },
      };
      jsonDb.save(f, db);
      T.setRating(G, 'a', 4);
      const st = T.getStats(G);
      assert.deepEqual(st.byType, { bug: 1, supporto: 1 });
      assert.equal(st.avgCloseMin, 30);
      assert.equal(st.avgRating, 4);
      // backfill ticket vecchio
      const old = T.getTicket(G, 'b');
      assert.equal(old.priority, 'normale');
      assert.deepEqual(old.notes, []);
    } finally {
      scrub('tickets');
    }
  });
});

describe('secretGuard patterns', () => {
  const { findSecret } = require(path.join(__dirname, '..', '..', 'src', 'events', 'secretGuard.js'));
  it('rileva, non lancia, niente falsi positivi banali', () => {
    assert.ok(findSecret('token: MTIzNDU2Nzg5MDEyMzQ1Njc4OIhb2Fm.Abcdef.GhI1234567890abcdefghijklm'));
    assert.ok(findSecret('key sk-ant-abcdefghijklmnopqrstuv'));
    assert.ok(findSecret('AKIAIOSFODNN7EXAMPLE'));
    assert.equal(findSecret('ciao, come va oggi?'), null);
    assert.equal(findSecret(''), null);
    assert.equal(findSecret(null), null);
  });
});

describe('learn extractFact', () => {
  const { extractFact } = require(path.join(BRAIN, 'learn.js'));
  it('pattern forti sì, rumore no', () => {
    assert.equal(extractFact('ricordati che odio il giallo'), 'odio il giallo');
    assert.equal(extractFact('tifo Napoli'), 'tifa Napoli');
    assert.equal(extractFact('che ore sono?'), null);
    assert.equal(extractFact('/chiedi ciao'), null);
    assert.equal(extractFact('guarda https://x.y'), null);
  });
});

describe('customCommands resolveVariables', () => {
  const { resolveVariables } = require(path.join(DB, 'customCommands.js'));
  it('{args} e co.', () => {
    assert.equal(resolveVariables('ciao {args}', { args: 'Luca' }), 'ciao Luca');
    assert.equal(resolveVariables('x{args}y', {}), 'xy');
    assert.equal(
      resolveVariables('{user} su {server} ({count})', { userMention: '@u', serverName: 'S', count: 2 }),
      '@u su S (2)'
    );
  });
});

describe('defineModule contratto', () => {
  const { defineModule } = require(path.join(__dirname, '..', '..', 'src', 'modules', 'defineModule.js'));
  it('normalizza e scarta', () => {
    const n = defineModule({ id: 'test', commands: ['a', 'a'] });
    assert.deepEqual(n.commands, ['a']);
    assert.equal(n.version, '1.0.0');
    assert.throws(() => defineModule({ id: 'NO spazi!' }));
    assert.throws(() => defineModule({ id: 'ok', version: 'x' }));
  });
});

describe('i18n fallback', () => {
  const { t, getLang, SUPPORTED_LANGS } = require(path.join(__dirname, '..', '..', 'src', 'utils', 'i18n.js'));
  it('chiave nota, fallback it, chiave ignota -> chiave', () => {
    assert.equal(t('common.ok', 'en'), '✅');
    assert.equal(t('lingua.title', 'en').includes('language') || t('lingua.title', 'en').length > 0, true);
    assert.equal(t('inesistente.xyz', 'en'), 'inesistente.xyz');
    assert.equal(getLang(null), 'it');
    assert.deepEqual([...SUPPORTED_LANGS].sort(), ['en', 'it']);
  });
});

describe('schema migrate', () => {
  const schema = require(path.join(DB, 'schema.js'));
  it('merge default idempotente', () => {
    const fixture = { g1: { config: { maxPerUser: 9 }, counter: 0, tickets: {} } };
    assert.equal(schema.migrateToCurrent('tickets', fixture), true);
    assert.equal(fixture.__v, 2);
    assert.equal(fixture.g1.config.maxPerUser, 9);
    assert.equal(schema.migrateToCurrent('tickets', fixture), false);
    assert.equal(schema.migrateToCurrent('sconosciuto', {}), false);
  });
});
