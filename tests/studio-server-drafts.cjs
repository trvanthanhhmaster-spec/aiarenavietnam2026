const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/studio-session.js', 'utf8');
function fixture(server, { userId = 'owner', authenticated = true, cache = new Map(), failLocal = false } = {}) {
  const requests = [], events = [];
  const indexedDB = { open() {
    const request = {};
    queueMicrotask(() => {
      if (failLocal) { request.error = Error('blocked'); request.onerror(); return; }
      request.result = { transaction() {
        const tx = { objectStore() { return {
          get(key) { return operation(() => cache.get(key)); },
          put(value, key) { return operation(() => { cache.set(key, value); }); },
          delete(key) { return operation(() => { cache.delete(key); }); },
          openCursor() {
            const result = {}, entries = [...cache.entries()]; let index = 0;
            function next() { queueMicrotask(() => {
              const entry = entries[index++];
              result.result = entry ? { value: entry[1], delete: () => cache.delete(entry[0]), continue: next } : null;
              result.onsuccess();
              if (!entry) tx.oncomplete();
            }); }
            next(); return result;
          }
        }; } };
        function operation(fn) { const result = {}; queueMicrotask(() => { result.result = fn(); tx.oncomplete(); }); return result; }
        return tx;
      } }; request.onsuccess();
    }); return request;
  } };
  const config = { sessionScope: 'fixture', auth: { userId, authenticated }, lookCsrf: 'fixture-csrf', draftEndpoint: 'studio-draft.php' };
  const window = { VREMIX_STUDIO: config };
  vm.runInNewContext(source, {
    window, indexedDB, Date, setTimeout, clearTimeout,
    Event: class { constructor(type) { this.type = type; } },
    CustomEvent: class { constructor(type, value) { this.type = type; this.detail = value.detail; } },
    document: { addEventListener() {}, dispatchEvent(e) { events.push(e); } },
    fetch: async (url, options) => {
      requests.push({ url, options });
      const payload = options.body && JSON.parse(options.body);
      if (server.fail) throw Error('offline');
      if (!payload) return { ok: true, json: async () => ({ record: server.record, revision: server.revision }) };
      if (payload.revision !== server.revision) return { ok: false, status: 409, json: async () => ({ error: 'newer server draft' }) };
      server.revision++;
      server.record = payload.action === 'clear' ? null : { ...payload.record, userId, updatedAt: Date.now() };
      return { ok: true, json: async () => ({ revision: server.revision, updatedAt: Date.now() }) };
    }
  });
  return { api: window.VRemixSession, requests, events, cache };
}
function draft(event) { return { draft: { event, planning: { count: 1, people: [{ faceSupplied: true }] } }, guideStep: 'garment', output: { imageUrl: 'data:image/png;base64,not-sent' } }; }
async function main() {
  const expired = new Map([['old-session', { updatedAt: Date.now() - 86400001 }]]);
  await fixture({}, { authenticated: false, userId: '', cache: expired }).api.read();
  assert.equal(expired.size, 0, 'expired device drafts are physically removed, including old sessions');
  const server = { revision: 0, record: null };
  const first = fixture(server);
  assert.equal(await first.api.read(), null);
  first.api.save(draft('school')); first.api.save(draft('custom'));
  await first.api.retry();
  assert.equal(first.requests.filter(r => r.options.method === 'POST').length, 1, 'debounced choices coalesce');
  assert.equal(server.record.draft.event, 'custom');
  assert.equal(server.record.draft.planning.people[0].faceSupplied, false);
  assert.equal(server.record.output, undefined, 'never upload output blobs or signed media URLs to the draft');
  assert.equal(first.api.status().state, 'saved');
  const second = fixture(server);
  assert.equal((await second.api.read()).draft.event, 'custom', 'new device restores server, not its empty cache');
  first.api.save(draft('school')); await first.api.retry();
  second.api.save(draft('street'));
  await assert.rejects(second.api.retry(), /newer server/);
  assert.equal(second.api.status().state, 'conflict');
  assert.equal(server.record.draft.event, 'school', 'stale device cannot overwrite a newer snapshot');
  const third = fixture(server, { failLocal: true });
  await third.api.read(); third.api.save(draft('ceremony')); await third.api.retry();
  assert.equal(server.record.draft.event, 'ceremony', 'server persistence works when local storage is blocked');
  await third.api.clear();
  assert.equal(server.record, null);
  const afterClear = fixture(server, { cache: new Map([['session:fixture', { ...draft('old'), updatedAt: Date.now(), userId: '' }]]) });
  assert.equal(await afterClear.api.read(), null, 'server tombstone prevents resurrecting an old device draft');
  const guest = fixture({ revision: 0, record: null }, { authenticated: false, userId: '' });
  await guest.api.read(); await guest.api.save(draft('school')); await guest.api.flush();
  assert.equal(guest.requests.length, 0, 'guest drafts never write under a fake account');
  assert.equal((await fixture({}, { authenticated: false, userId: '', cache: guest.cache }).api.read()).draft.event, 'school');
  const migrated = fixture({ revision: 0, record: null }, { cache: guest.cache });
  assert.equal((await migrated.api.read()).draft.event, 'school'); await migrated.api.retry();
  assert.equal(migrated.api.status().state, 'saved', 'guest choices migrate only after login');
  const outageServer = { revision: 0, record: null, fail: true }, offline = fixture(outageServer);
  await offline.api.read(); offline.api.save(draft('school')); await assert.rejects(offline.api.retry());
  assert.equal(offline.api.status().state, 'error', 'offline is not presented as cloud-saved');
  outageServer.fail = false; await offline.api.retry(); assert.equal(outageServer.record.draft.event, 'school');
  console.log('Account drafts: server restore, coalescing, guest migration, conflict rejection, tombstones, unavailable local storage and offline retry passed.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
