'use strict';
/**
 * Unit test core Commander (puro, zero Discord/DB).
 * `node --test test/unit/` — mai rete, mai chiavi qatest su disco.
 */
const assert = require('node:assert/strict');

const {
  Breaker,
  checkGate,
  withTimeout,
  executeIsolated,
  resolveComponentFeature,
  BREAKER_THRESHOLD,
  BREAKER_WINDOW_MS,
  guardian,
} = require('../../packages/commander/dist/index.js');

const allow = () => true;
const deny = () => false;

describe('checkGate', () => {
  it('fail-open senza feature o guild', () => {
    assert.equal(checkGate({ featureId: null, guildId: 'g', isEnabled: deny, isIsolated: deny }).ok, true);
    assert.equal(checkGate({ featureId: 'x', guildId: null, isEnabled: deny, isIsolated: deny }).ok, true);
  });
  it('sistema e locked sempre consentiti', () => {
    assert.equal(checkGate({ featureId: 'system', guildId: 'g', isEnabled: deny, isIsolated: deny }).ok, true);
    assert.equal(
      checkGate({ featureId: 'f', guildId: 'g', isLocked: () => true, isEnabled: deny, isIsolated: deny }).ok,
      true
    );
  });
  it('disabled poi isolated, in ordine', () => {
    const d = checkGate({ featureId: 'f', guildId: 'g', isEnabled: deny, isIsolated: allow });
    assert.deepEqual([d.ok, d.reason], [false, 'disabled']);
    const isl = () => true;
    const i = checkGate({ featureId: 'f', guildId: 'g', isEnabled: allow, isIsolated: isl });
    assert.deepEqual([i.ok, i.reason], [false, 'isolated']);
    assert.equal(checkGate({ featureId: 'f', guildId: 'g', isEnabled: allow, isIsolated: deny }).ok, true);
  });
  it('errori nei check non bloccano mai', () => {
    const boom = () => { throw new Error('x'); };
    assert.equal(checkGate({ featureId: 'f', guildId: 'g', isEnabled: boom, isIsolated: boom }).ok, true);
  });
});

describe('Breaker', () => {
  it(`scatta a ${BREAKER_THRESHOLD} errori in finestra`, () => {
    const b = new Breaker(3, 60_000);
    const now = Date.now();
    assert.equal(b.note('g', 'f', now), false);
    assert.equal(b.note('g', 'f', now), false);
    assert.equal(b.note('g', 'f', now), true);
    assert.equal(b.isIsolated('g', 'f', now), true);
    assert.equal(b.isIsolated('g', 'altra', now), false);
  });
  it('finestra scaduta non isola', () => {
    const b = new Breaker(2, 1000);
    b.note('g', 'f', 0);
    b.note('g', 'f', 2000);
    assert.equal(b.isIsolated('g', 'f', 2000), false);
  });
  it('reset riabilita', () => {
    const b = new Breaker(1, 60_000);
    b.note('g', 'f');
    assert.equal(b.isIsolated('g', 'f'), true);
    b.reset('g', 'f');
    assert.equal(b.isIsolated('g', 'f'), false);
  });
  it(`costanti esportate (threshold=${BREAKER_THRESHOLD}, window=${BREAKER_WINDOW_MS})`, () => {
    assert.ok(BREAKER_THRESHOLD >= 2 && BREAKER_WINDOW_MS >= 1000);
  });
});

describe('withTimeout / executeIsolated', () => {
  it('valore veloce passa', async () => {
    const r = await withTimeout(async () => 42, 1000);
    assert.equal(r.timedOut, false);
    assert.equal(r.value, 42);
  });
  it('timeout scatta e non lancia', async () => {
    const r = await withTimeout(() => new Promise(() => {}), 30);
    assert.equal(r.timedOut, true);
  });
  it('errore torna nel risultato', async () => {
    const r = await withTimeout(async () => { throw new Error('boom'); }, 1000);
    assert.equal(r.timedOut, false);
    assert.equal(r.error.message, 'boom');
  });
  it('executeIsolated registra onError e non lancia mai', async () => {
    const seen = [];
    const out = await executeIsolated(async () => { throw new Error('x'); }, {
      featureId: 'f',
      timeoutMs: 500,
      onError: (f, e) => seen.push([f, e.message]),
    });
    assert.equal(out.ok, false);
    assert.deepEqual(seen, [['f', 'x']]);
    const to = await executeIsolated(() => new Promise(() => {}), { featureId: 'f', timeoutMs: 30 });
    assert.equal(to.ok, false);
    assert.equal(to.timedOut, true);
    assert.equal(to.error.code, 'COMMANDER_TIMEOUT');
  });
});

describe('resolveComponentFeature', () => {
  const cmd = (n) => ({ trivia: 'fun', balance: 'economy' }[n] || null);
  it('match esatto, comando dinamico, prefissi, fail-open', () => {
    assert.equal(resolveComponentFeature('embed_builder', cmd), 'utility');
    assert.equal(resolveComponentFeature('trivia:u:n:0', cmd), 'fun');
    assert.equal(resolveComponentFeature('ticket_claim', cmd), 'tickets');
    assert.equal(resolveComponentFeature('rr_select', cmd), 'reactionRoles');
    assert.equal(resolveComponentFeature('nuke_confirm:1', cmd), 'moderation');
    assert.equal(resolveComponentFeature('sconosciuto', cmd), null);
    assert.equal(resolveComponentFeature(null, cmd), null);
  });
  it('lookup comandi che lancia -> fail-open sui prefissi', () => {
    const boom = () => { throw new Error('x'); };
    assert.equal(resolveComponentFeature('ticket_x', boom), 'tickets');
    assert.equal(resolveComponentFeature('zzz', boom), null);
  });
});

describe('guardian', () => {
  it('summary ha la forma attesa', () => {
    const s = guardian.summary('g-test');
    assert.ok(s && typeof s === 'object');
    assert.ok(Array.isArray(s.features));
    assert.ok(Number.isFinite(s.critical) && Number.isFinite(s.weak) && Number.isFinite(s.ok));
  });
  it('observe non lancia mai', () => {
    assert.doesNotThrow(() => guardian.observe({}));
    assert.doesNotThrow(() => guardian.observe(null));
  });
});
