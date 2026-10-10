const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/studio.js', 'utf8');
function extract(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from);
  assert.ok(from >= 0 && to > from);
  return source.slice(from, to);
}
const now = 1800000000000;
function fixture(respond) {
  const cache = new Map();
  const requests = [];
  const states = [];
  const outfit = { garment: 'ao-tac', garmentVariant: 'red', accessories: [], accessoryVariants: [] };
  const planning = { count: 1, people: [{ id: 1, outfit }] };
  const context = {
    Date: { now: () => now }, setTimeout: (fn) => fn(),
    window: { localStorage: { getItem: k => cache.get(k) || null, setItem: (k, v) => cache.set(k, v), removeItem: k => cache.delete(k) },
      VRemixSession: { status: () => ({state: 'idle'}), retry: async () => {} } },
    activeJobKey: 'fixture', generationPending: false, collectionBusy: false, savingLook: false,
    catalog: { generationEndpoint: 'generation-edge.php', lookCsrf: 'fixture-csrf', events: [] },
    Planner: { clone: value => JSON.parse(JSON.stringify(value)), missing: () => 'review' },
    planning, state: { event: 'ceremony', ...outfit, locks: {}, mode: 'text-to-image' },
    experience: { dataset: {guideStep: 'review'} },
    collections: { active: () => 'fixture-collection' },
    lookup: () => ({}), buildFaceReferences: async () => null,
    persistStudio: async () => {}, selectionFingerprint: () => 'unchanged',
    showResult() {}, prepareResultCopy() {}, syncSubmitButton() {}, setStatus() {},
    setResultState: (state, message) => states.push({state, message}),
    samePlan: () => true, requireImageOutput() {}, applyOutput() {}, notifyHistory() {},
    compareLayer: null, compareLooksButton: null, savedLookId: null, currentResultJobId: null,
    currentLookbookItems: [], saveLookButton: {}, resultDownload: {},
    createRequestId: () => '11111111-1111-4111-8111-111111111111',
    fetch: async (url, options = {}) => {
      requests.push({url, method: options.method || 'GET', payload: options.body && JSON.parse(options.body)});
      const body = respond(requests.at(-1), requests.length);
      return { ok: body.http >= 200 && body.http < 300, status: body.http, json: async () => body.body };
    },
  };
  vm.createContext(context);
  for (const [start, end] of [
    ['  function readActiveJob()', '  function isSynchronousLocalGeneration()'],
    ['  async function generateLook(', '  async function resumeGeneration('],
    ['  async function resumeGeneration(', '  function humanizeGenerationError('],
    ['  function humanizeGenerationError(', '  async function pollJob('],
    ['  async function pollJob(', '  function resultMessage('],
  ]) vm.runInContext(extract(start, end), context);
  return {context, cache, requests, states};
}
const missing = () => ({http: 404, body: {error: 'Không tìm thấy bản phối.'}});
const pending = (age, jobId = null) => ({requestId: 'old-request', jobId, startedAt: now - age,
  selection: {planning: {count: 1}}});

(async () => {
  // Reproduces the user's stale request. Opening/retrying it performs GET
  // only, clears the missing ID, and preserves the current plan.
  const stale = fixture(missing);
  stale.context.saveActiveJob(pending(3600000));
  const previousPlan = JSON.stringify(stale.context.planning);
  await stale.context.generateLook();
  assert.equal(stale.requests.length, 1);
  assert.equal(stale.requests[0].method, 'GET');
  assert.equal(stale.context.readActiveJob(), null);
  assert.equal(JSON.stringify(stale.context.planning), previousPlan);
  assert.match(stale.states.at(-1).message, /Yêu cầu trước chưa được tiếp nhận/);

  // Only a subsequent explicit click submits a fresh request, once.
  stale.context.fetch = async (url, options = {}) => {
    stale.requests.push({url, method: options.method || 'GET', payload: options.body && JSON.parse(options.body)});
    return {ok: true, status: options.method === 'POST' ? 202 : 200,
      json: async () => options.method === 'POST'
        ? {jobId: 'new-job', status: 'processing'}
        : {jobId: 'new-job', status: 'completed', output: {}}};
  };
  await stale.context.generateLook();
  assert.deepEqual(stale.requests.map(r => r.method), ['GET', 'POST', 'GET']);
  assert.equal(stale.requests[1].payload.clientRequestId, '11111111-1111-4111-8111-111111111111');
  assert.equal(stale.requests[2].url, 'generation-edge.php?jobId=new-job');
  assert.equal(stale.context.readActiveJob(), null);

  const fresh = fixture((request, count) => count === 1 ? missing()
    : {http: 200, body: {jobId: 'eventually-visible', status: 'completed'}});
  const freshJob = pending(0);
  fresh.context.saveActiveJob(freshJob);
  assert.equal((await fresh.context.pollJob(freshJob, true)).status, 'completed');
  assert.equal(fresh.requests.length, 2);
  assert.ok(fresh.context.readActiveJob(), 'A temporarily missing new request stays recoverable');
  assert.ok(fresh.requests.every(r => r.method === 'GET'));

  for (const job of [pending(0), pending(0, 'deleted-or-foreign-job')]) {
    const absent = fixture(missing);
    absent.context.saveActiveJob(job);
    await assert.rejects(absent.context.pollJob(job, true), /GENERATION_REQUEST_NOT_FOUND/);
    assert.equal(absent.requests.length, job.jobId ? 1 : 11);
    assert.equal(absent.context.readActiveJob(), null);
    assert.ok(absent.requests.every(r => r.method === 'GET'));
  }
  const unavailable = fixture(() => ({http: 503, body: {error: 'Temporary outage'}}));
  const recoverable = pending(3600000);
  unavailable.context.saveActiveJob(recoverable);
  await assert.rejects(unavailable.context.pollJob(recoverable, true), /Temporary outage/);
  assert.ok(unavailable.context.readActiveJob(), 'Connection failures must not allow duplicate generation');
  console.log('Generation recovery: stale 404 releases retry, selections survive, new click submits once, fresh 404 grace and outage recovery passed offline.');
})().catch(error => { console.error(error); process.exitCode = 1; });
