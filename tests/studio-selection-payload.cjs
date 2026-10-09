// Offline execution of the REAL submit handler with a fake provider response.
// Checks payload/snapshot fidelity, not whether Gemini draws the requested pixels.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Planner = require('../assets/js/studio-planner.js');
const source = fs.readFileSync('assets/js/studio.js', 'utf8');
const start = source.indexOf('  async function generateLook()');
const end = source.indexOf('  async function resumeGeneration(', start);
assert.ok(start >= 0 && end > start);
async function check(count) {
  const plan = Planner.create(); Planner.setCount(plan, count); plan.shared = false;
  plan.period = Planner.period('unspecified');
  plan.people.forEach((p, i) => { p.outfit = Planner.outfit({ garment: i % 2 ? 'ao-tu-than' : 'ao-tac',
    garmentVariant: i % 2 ? 'tu-than-reu' : 'tac-do', color: i % 2 ? 'green' : 'red', pattern: 'plain',
    style: 'minimal', scene: 'temple', accessories: i % 2 ? ['tote'] : [], accessoryVariants: [] }); });
  plan.activePerson = count;
  const expected = JSON.parse(JSON.stringify(plan));
  const state = { ...plan.people[count - 1].outfit, event: 'ceremony', locks: {}, outputType: 'image', aspectRatio: '16:9', resolution: '1080', mode: 'text-to-image' };
  let posts = 0, payload, storedJob;
  const context = { Planner, planning: plan, state, generationPending: false, collectionBusy: false, savingLook: false,
    window: { VRemixSession: { status: () => ({ state: 'saved' }), retry: async () => {} } },
    persistStudio: async () => {}, readActiveJob: () => null,
    experience: { dataset: { guideStep: 'review' } }, selectionFingerprint: () => JSON.stringify(plan),
    compareLayer: null, compareLooksButton: {}, showResult() {}, setResultState() {}, prepareResultCopy() {},
    createRequestId: () => '00000000-0000-4000-8000-000000000001', collections: { active: () => null },
    catalog: { events: [{ slug: 'ceremony', preset: { weather: 'static weather', season: 'static season' } }], generationEndpoint: '/fixture' },
    lookup: (rows, slug) => rows.find(row => row.slug === slug) || {}, syncSubmitButton() {},
    savedLookId: null, currentResultJobId: null, buildFaceReferences: async () => null,
    saveActiveJob: value => { storedJob = structuredClone(value); }, clearActiveJob() {},
    requireImageOutput() {}, applyOutput() {}, resultMessage: () => 'fixture only', notifyHistory() {},
    saveLookButton: {}, currentLookbookItems: [], setStatus() {},
    fetch: async (url, options) => {
      posts++; payload = JSON.parse(options.body);
      // Simulate an asynchronous state change: returned result must keep its submit snapshot.
      plan.people[0].outfit.color = 'changed-after-submit';
      return { ok: true, json: async () => ({ status: 'completed', jobId: 'fixture-job', output: { lookbook: { items: [{ url: '/fixture.png' }] } } }) };
    }
  };
  vm.createContext(context); vm.runInContext(source.slice(start, end), context);
  await context.generateLook();
  assert.equal(posts, 1, 'exactly one explicit request');
  assert.deepEqual(payload.planning, expected, 'all per-person choices survive the real submit handler');
  for (const [key, name] of Object.entries({ garment: 'garmentSlug', garmentVariant: 'garmentVariantSlug', color: 'colorSlug', pattern: 'patternSlug', style: 'styleSlug', scene: 'sceneSlug', accessories: 'accessorySlugs', accessoryVariants: 'accessoryVariantSlugs' })) {
    assert.deepEqual(payload[name], expected.people[0].outfit[key], 'summary belongs to Person 1, not last active tab: ' + name);
  }
  assert.equal(payload.weather, ''); assert.equal(payload.season, '', 'static preset is not live weather');
  assert.equal(payload.generationType, 'image'); assert.equal(payload.inputImage, null);
  assert.deepEqual(JSON.parse(JSON.stringify(context.currentResultSelection.planning)), expected);
  assert.deepEqual(storedJob.selection.planning, expected);
}
(async () => {
  for (const count of [1, 2, 12]) await check(count);
  console.log('Real submit handler: 1/2/12 people, per-person garment/variant/color/pattern/style/scene/accessories, Person-1 summary, immutable result and one explicit POST passed offline. Pixels NOT assessed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
