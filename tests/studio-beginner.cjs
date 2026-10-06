const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Planner = require('../assets/js/studio-planner.js');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/studio.js'), 'utf8');
function realFunction(name, nextName) {
  const start = source.indexOf('  function ' + name + '(');
  const end = source.indexOf('  ' + nextName, start);
  assert.ok(start >= 0 && end > start, name + ' must be extracted from production code');
  return source.slice(start, end);
}
function element() {
  return { hidden: true, textContent: '', dataset: {}, attributes: {},
    classList: { toggle() {} }, setAttribute(key, value) { this.attributes[key] = value; } };
}
const experience = element();
const events = [];
experience.dispatchEvent = event => events.push(event);
const catalog = {
  events: [{ slug: 'custom-occasion', label: 'Dịp do admin thêm' }],
  garments: [{ slug: 'custom-garment', name: 'Trang phục do admin thêm' }],
  garmentVariants: [{ slug: 'custom-variant', name: 'Mẫu cụ thể do admin thêm' }],
  styles: [{ slug: 'custom-style', label: 'Phong cách do admin thêm' }]
};
const context = {
  Planner, planning: Planner.create(), media: { pause() {} },
  experience, catalog, nextHint: element(), progressSteps: [],
  state: { event: '', garment: '', style: '', garmentVariant: '' },
  lookup: (items, slug) => items.find(item => item.slug === slug) || {},
  variantsForGarment: () => catalog.garmentVariants,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
};
vm.createContext(context);
vm.runInContext(realFunction('selectedEvent', 'function variantsForGarment'), context);
vm.runInContext(realFunction('updateProgress', 'function updatePassport'), context);
vm.runInContext('updateProgress();', context);
assert.equal(experience.studioGuide.next, 'event');
assert.equal(experience.studioGuide.ready, false);
Object.assign(context.state, { event: 'custom-occasion', garment: 'custom-garment', style: 'custom-style', garmentVariant: 'custom-variant' });
Planner.setCount(context.planning, 1);
context.planning.period = Planner.period('unspecified');
Planner.capture(context.planning, context.state);
vm.runInContext("updateProgress('event');", context);
assert.equal(experience.studioGuide.ready, true);
assert.equal(experience.studioGuide.next, 'review');
assert.equal(experience.studioGuide.labels.garment, 'Mẫu cụ thể do admin thêm');
assert.equal(events.at(-1).detail.changed, 'event');
assert.equal(events.at(-1).type, 'studio:selection');
context.state.style = '';
vm.runInContext('updateProgress();', context);
assert.equal(experience.studioGuide.next, 'review', 'style is optional');
context.state.event = 'custom'; context.planning.customOccasion = 'Đi biển';
vm.runInContext('updateProgress();', context);
assert.equal(experience.studioGuide.next, 'review', 'a custom occasion can reach confirmation');
assert.equal(experience.studioGuide.labels.event, 'Đi biển · dịp tự nhập');
assert.equal(catalog.events.length, 1, 'custom input does not insert an approved catalog entry');

const retry = element();
Object.assign(context, {
  resultState: element(), resultProgress: element(), srStatus: element(), studioStatus: element(),
  previewGenerationStatus: element(), previewGenerationMessage: element(),
  document: { getElementById: id => id === 'retryGeneration' ? retry : element() }
});
vm.runInContext(realFunction('setResultState', 'function showResult'), context);
vm.runInContext("setResultState('processing', 'Đang tạo ảnh');", context);
assert.equal(experience.attributes['aria-busy'], 'true');
assert.equal(retry.hidden, true);
assert.equal(context.previewGenerationStatus.hidden, false);
vm.runInContext("setResultState('failed', 'Hãy thử lại sau');", context);
assert.equal(experience.attributes['aria-busy'], 'false');
assert.equal(retry.hidden, false);
assert.equal(context.studioStatus.textContent, 'Hãy thử lại sau');
vm.runInContext("setResultState('completed', 'Đã có ảnh');", context);
assert.equal(retry.hidden, true);

vm.runInContext(realFunction('humanizeGenerationError', 'async function pollJob'), context);
for (const error of ['Gemini Web bridge HTTP 502', 'Failed to fetch', 'Supabase error', 'Method not allowed', 'Unexpected token in JSON', 'Gemini session expired']) {
  context.providerError = error;
  const message = vm.runInContext('humanizeGenerationError(providerError)', context);
  assert.ok(!/HTTP|Gemini|bridge|Supabase|JSON/.test(message), 'provider jargon must not be the main user message');
  assert.ok(message.includes('thử lại'));
}
assert.equal(vm.runInContext("humanizeGenerationError('Ảnh vượt quá 8 MB. Hãy chọn ảnh nhỏ hơn 8 MB.');", context), 'Ảnh vượt quá 8 MB. Hãy chọn ảnh nhỏ hơn 8 MB.');

const pendingTimers = [];
Object.assign(context, {
  imageInput: { files: [] }, generationPending: false,
  saveLookButton: element(), compareLooksButton: element(), resultDownload: element(),
  currentLookbookItems: [], syncSubmitButton() {},
  setStatus: message => { context.lastStatus = message; },
  window: { setTimeout(fn, ms) { pendingTimers.push({ fn, ms }); return pendingTimers.length; } }
});
vm.runInContext(realFunction('selectionChanged', 'async function generateLook'), context);
vm.runInContext('selectionChanged();', context);
assert.equal(pendingTimers.length, 0, 'selections never schedule AI');
context.state.style = 'custom-style';
vm.runInContext('selectionChanged(); selectionChanged();', context);
assert.equal(pendingTimers.length, 0);
context.generationPending = true;
vm.runInContext('selectionChanged();', context);
assert.equal(pendingTimers.length, 0, 'pending jobs do not queue another provider call');

assert.ok(!source.includes('updateSummary(kind);\n  }'), 'restoration must not reference an undefined changed kind');
console.log('Studio beginner: real 4-step snapshot, optional style, job states, retry, friendly errors and no automatic generation passed without provider calls.');
