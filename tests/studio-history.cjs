const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor() { this.children = []; this.listeners = {}; this.hidden = false; this.textContent = ''; this.classes = new Set(); this.classList = { toggle: (key, on) => on ? this.classes.add(key) : this.classes.delete(key), add: key => this.classes.add(key) }; }
  addEventListener(event, handler) { (this.listeners[event] ||= []).push(handler); }
  dispatch(event, detail) { (this.listeners[event] || []).forEach(fn => fn({ detail })); }
  click() { this.dispatch('click'); }
  setAttribute(name, value) { this[name] = value; }
  append(...items) { this.children.push(...items); }
  appendChild(item) { this.append(item); }
  replaceChildren() { this.children = []; }
}
const ids = Object.fromEntries(['studioExperience', 'studioHistory', 'historyItems', 'historyStatus', 'historyRetry', 'historyMore', 'historyConfirm', 'historyCompare', 'historyTitle', 'historyRecent', 'historyAccept', 'historyCancel'].map(id => [id, new Element()]));
let current = { jobId: 'job-3', lookId: null, pending: false, edited: false };
let calls = [], opened = [], compared = [], fail = false, holdNextFetch = false, releaseFetch;
const rows = [1, 2, 3].map(i => ({ id: 'job-' + i, jobId: 'job-' + i, image_url: '/img-' + i, saved: i === 1, selection: { planning: { count: i } }, created_at: '2026-10-07T0' + i + ':00:00Z', parentJobId: i > 1 ? 'job-' + (i - 1) : null }));
ids.studioExperience.resultsApi = {
  current: () => current,
  open: (row, edit) => { assert.equal(edit, true); opened.push(row); current.jobId = row.jobId; current.edited = false; ids.studioExperience.dispatch('studio:history-change', { selectionOnly: true }); },
  compare: rows => compared.push(rows),
};
const context = {
  document: { getElementById: id => ids[id], createElement: () => new Element() },
  window: { VREMIX_STUDIO: { historyEndpoint: '/history', lookCsrf: 'fixture' } },
  fetch: async (url, options) => { calls.push(url); assert.equal(options.headers['X-VRemix-CSRF'], 'fixture'); if (holdNextFetch) { holdNextFetch = false; return new Promise(resolve => { releaseFetch = resolve; }); } return { ok: !fail, json: async () => fail ? { error: 'Offline' } : { items: rows, scoped: url.includes('?'), hasMore: false } }; },
  Date, encodeURIComponent,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
};
vm.createContext(context);
vm.runInContext(fs.readFileSync(__dirname + '/../assets/js/studio-history.js', 'utf8'), context);
async function tick() { await new Promise(resolve => setImmediate(resolve)); }
(async () => {
  await tick();
  assert.equal(ids.historyItems.children.length, 3, 'one thumbnail per successful job, regardless of save');
  assert.equal(ids.historyItems.children[2]['aria-pressed'], 'true');
  assert.equal(ids.historyItems.children[1].children[2].textContent, 'Chưa lưu');
  assert.equal(ids.studioExperience.classes.has('has-history'), true);
  ids.historyCompare.click(); assert.equal(compared[0].length, 3, 'all versions available for either comparison side');
  assert.equal(compared[0][0].url, '/img-1'); assert.equal(compared[0][2].active, true);
  current.pending = true; ids.historyItems.children[0].click(); assert.equal(opened.length, 0);
  current.pending = false; current.edited = true; ids.historyItems.children[0].click();
  assert.equal(ids.historyConfirm.hidden, false); assert.equal(opened.length, 0);
  ids.historyCancel.click(); assert.equal(ids.historyConfirm.hidden, true); assert.equal(opened.length, 0);
  const beforeOpenCalls = calls.length;
  const originalButtons = ids.historyItems.children.slice();
  ids.historyItems.children[0].click(); ids.historyAccept.click();
  assert.equal(ids.historyItems.children[0]['aria-pressed'], 'true', 'highlight changes synchronously before any network response');
  assert.equal(calls.length, beforeOpenCalls, 'known-version selection never reloads or re-signs history');
  ids.historyItems.children[2].click(); ids.historyItems.children[1].click();
  assert.equal(current.jobId, 'job-2', 'rapid choices leave the last version active');
  assert.equal(ids.historyItems.children[1]['aria-pressed'], 'true');
  assert.equal(calls.length, beforeOpenCalls);
  assert.equal(ids.historyItems.children[1], originalButtons[1], 'keep thumbnail nodes and keyboard focus during selection');
  ids.historyItems.children[0].click(); await tick();
  assert.equal(opened[0].selection.planning.count, 1); assert.equal(current.jobId, 'job-1');
  holdNextFetch = true;
  ids.studioExperience.dispatch('studio:history-change');
  ids.historyItems.children[1].click();
  releaseFetch({ ok: true, json: async () => ({ items: [], scoped: true, hasMore: false }) }); await tick();
  assert.equal(ids.historyItems.children.length, 3, 'a late history response cannot replace the locally selected rail');
  assert.equal(ids.historyItems.children[1]['aria-pressed'], 'true');
  ids.historyRecent.click(); await tick(); assert.equal(calls.at(-1), '/history');
  assert.equal(ids.historyTitle.textContent, 'Ảnh gần đây');
  fail = true; ids.studioExperience.dispatch('studio:history-change'); await tick();
  assert.equal(ids.historyItems.children.length, 3, 'history outage does not remove prior images');
  assert.equal(ids.historyRetry.hidden, false);
  const previousCalls = calls.length;
  current = { jobId: null, lookId: null, pending: false, edited: false };
  ids.studioExperience.dispatch('studio:history-change'); await tick();
  assert.equal(ids.studioHistory.hidden, true, 'blank projects never expose unrelated recent generations');
  assert.equal(ids.historyItems.children.length, 0);
  assert.equal(calls.length, previousCalls, 'blank projects do not load the global history');
  console.log('Studio history: unsaved versions, active thumbnail, snapshot restore, edit confirmation, compare, pending guard and outage safety passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
