const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

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
  experience, catalog, nextHint: element(), progressSteps: [],
  state: { event: '', garment: '', style: '', garmentVariant: '' },
  lookup: (items, slug) => items.find(item => item.slug === slug) || {},
  variantsForGarment: () => catalog.garmentVariants,
  CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } }
};
vm.createContext(context);
vm.runInContext(realFunction('updateProgress', 'function updatePassport'), context);
vm.runInContext('updateProgress();', context);
assert.equal(experience.studioGuide.next, 'event');
assert.equal(experience.studioGuide.ready, false);
Object.assign(context.state, { event: 'custom-occasion', garment: 'custom-garment', style: 'custom-style', garmentVariant: 'custom-variant' });
vm.runInContext("updateProgress('event');", context);
assert.equal(experience.studioGuide.ready, true);
assert.equal(experience.studioGuide.next, 'review');
assert.equal(experience.studioGuide.labels.garment, 'Mẫu cụ thể do admin thêm');
assert.equal(events.at(-1).detail.changed, 'event');
assert.equal(events.at(-1).type, 'studio:selection');
context.state.style = '';
vm.runInContext('updateProgress();', context);
assert.equal(experience.studioGuide.next, 'style');

const retry = element();
Object.assign(context, {
  resultState: element(), resultProgress: element(), srStatus: element(), studioStatus: element(),
  previewGenerationStatus: element(), previewGenerationMessage: element(),
  document: { getElementById: id => id === 'retryGeneration' ? retry : null }
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
let canceledTimers = 0;
Object.assign(context, {
  imageInput: { files: [] }, generationPending: false, autoGenerateTimer: null,
  saveLookButton: element(), compareLooksButton: element(), resultDownload: element(),
  pendingAutoFingerprint: '', queuedAutoGeneration: false, selectionFingerprint: () => 'selection',
  setStatus: message => { context.lastStatus = message; },
  window: { clearTimeout() { canceledTimers++; }, setTimeout(fn, ms) { pendingTimers.push({ fn, ms }); return pendingTimers.length; } }
});
vm.runInContext(realFunction('scheduleAutoGeneration', 'async function generateLook'), context);
vm.runInContext('scheduleAutoGeneration();', context);
assert.equal(pendingTimers.length, 0, 'incomplete selections do not call AI');
context.state.style = 'custom-style';
vm.runInContext('scheduleAutoGeneration(); scheduleAutoGeneration();', context);
assert.equal(pendingTimers.length, 2);
assert.equal(canceledTimers, 1, 'rapid choices replace the debounce timer');
context.generationPending = true;
vm.runInContext('scheduleAutoGeneration();', context);
assert.equal(pendingTimers.length, 2, 'pending jobs do not create parallel provider calls');
assert.equal(context.queuedAutoGeneration, true);

assert.ok(!source.includes('updateSummary(kind);\n  }'), 'restoration must not reference an undefined changed kind');
console.log('Studio beginner: real catalog snapshot, missing steps, job states, retry, friendly errors and auto-generation debounce passed without provider calls.');
