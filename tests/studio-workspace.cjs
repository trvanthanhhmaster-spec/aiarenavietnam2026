const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element(classes = []) {
  const set = new Set(classes);
  const listeners = {};
  return {
    hidden: false, dataset: {}, attributes: {}, textContent: '', firstChild: { textContent: '' },
    classList: {
      contains(name) { return set.has(name); },
      add(name) { set.add(name); }, remove(name) { set.delete(name); },
      toggle(name, active) { active ? set.add(name) : set.delete(name); }
    },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(name, fn) { listeners[name] = fn; },
    emit(name, event) { if (listeners[name]) listeners[name].call(this, event); },
    dispatchEvent(event) { this.emit(event.type, event); },
    click() { this.clicked = true; this.emit('click'); },
    focus() { this.focused = true; }, scrollIntoView() { this.scrolled = true; }
  };
}
const ids = {};
['studioExperience', 'workspaceCatalog', 'workspaceInsights', 'workspacePanelTitle',
  'workspacePanelHint', 'workspaceFullscreen', 'workspaceUpload', 'inputImage',
  'studioDock', 'dockClose', 'studioSrStatus', 'variantStrip', 'guideReview',
  'guideNavigation', 'guideContinue', 'guideBack', 'guideEventValue', 'guideGarmentValue',
  'guideStyleValue', 'guideCustomize', 'garmentVariantSection', 'guideReviewTitle',
  'workspaceRemoveUpload'].forEach(id => { ids[id] = element(); });
const guideCards = ['event', 'garment', 'style'].map(step => {
  const card = element(); card.dataset.guideCard = step; return card;
});
const guideSteps = ['event', 'garment', 'style'].map(step => {
  const button = element(); button.dataset.progressStep = step; return button;
});
const sections = [element(['studio-passport']), element(['studio-check']), element(['studio-tips']),
  element(['studio-sourcing']), element(['studio-places'])];
const panelButtons = ['catalog', 'heritage', 'places'].map(name => {
  const button = element(); button.dataset.workspacePanel = name; return button;
});
const uploadNote = element();
ids.workspaceUpload.querySelector = () => uploadNote;
ids.workspaceInsights.querySelectorAll = () => sections;
ids.studioExperience.querySelectorAll = () => panelButtons;
const garmentTrigger = element();
ids.workspaceCatalog.querySelector = () => garmentTrigger;
ids.workspaceCatalog.querySelectorAll = selector => selector === '[data-guide-card]' ? guideCards : guideSteps;
const variant = element();
ids.variantStrip.querySelector = () => variant;
const preview = element();
const panelHeader = element();
const document = {
  getElementById: id => ids[id],
  querySelector: selector => selector === '.studio-preview' ? preview : panelHeader,
  addEventListener() {}
};
let mobile = false;
const window = { matchMedia: query => ({ matches: query.includes('1023px') && mobile }), setTimeout() {} };
class UIEvent { constructor(type, options = {}) { this.type = type; Object.assign(this, options); } }
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/studio-workspace.js'), 'utf8'), { document, window, Event: UIEvent });
function clickPanel(name) {
  const button = panelButtons.find(item => item.dataset.workspacePanel === name);
  ids.studioExperience.emit('click', { target: { closest: selector => selector === '[data-workspace-panel]' ? button : null } });
}
assert.equal(ids.workspaceCatalog.hidden, false);
assert.equal(ids.workspaceInsights.hidden, true);
assert.equal(ids.workspaceFullscreen.hidden, true, 'unsupported fullscreen must not leave a dead button');
clickPanel('heritage');
assert.equal(ids.workspaceCatalog.hidden, true);
assert.equal(ids.workspaceInsights.hidden, false);
assert.deepEqual(sections.map(section => section.hidden), [false, false, false, true, true]);
assert.equal(panelButtons[1].attributes['aria-pressed'], 'true');
clickPanel('places');
assert.deepEqual(sections.map(section => section.hidden), [true, true, true, false, false]);
assert.equal(ids.workspacePanelTitle.textContent, 'Mang bản phối ra đời thật');
mobile = true;
clickPanel('catalog');
assert.equal(panelHeader.scrolled, true);
ids.workspaceUpload.click();
assert.equal(ids.inputImage.clicked, true, 'keyboard-accessible upload opens the actual file input');
ids.inputImage.files = [{ name: 'portrait.png' }];
ids.inputImage.value = 'portrait.png'; ids.inputImage.emit('change');
assert.equal(uploadNote.textContent, 'portrait.png');
ids.inputImage.value = ''; ids.inputImage.emit('change');
assert.equal(uploadNote.textContent, 'Không bắt buộc · tối đa 8 MB');

function selection(choices, changed = '', variantCount = 0) {
  const next = ['event', 'garment', 'style'].find(step => !choices[step]) || 'review';
  const guide = { next, ready: next === 'review', choices, changed, variantCount,
    labels: { event: 'Dịp từ database', garment: 'Mẫu đã duyệt', style: 'Phong cách đã chọn' } };
  ids.studioExperience.emit('studio:selection', { detail: guide });
}
function visit(step) {
  const button = element(); button.dataset.guideStep = step;
  ids.studioExperience.emit('click', { target: { closest: selector => selector === '[data-guide-step]' ? button : null } });
}
assert.deepEqual(guideCards.map(card => card.hidden), [false, true, true], 'initial view asks only one question');
assert.equal(ids.guideCustomize.hidden, true);
assert.equal(guideSteps[1].disabled, true, 'a beginner cannot accidentally skip the first choice');
visit('style');
assert.equal(ids.studioExperience.dataset.guideStep, 'event');
selection({ event: 'db-event', garment: 'db-garment', style: 'db-style' }, 'event', 1);
assert.equal(ids.guideReview.hidden, false, 'a complete DB preset goes directly to editable summary');
assert.deepEqual(guideCards.map(card => card.hidden), [true, true, true]);
assert.equal(ids.guideGarmentValue.textContent, 'Mẫu đã duyệt');
assert.equal(ids.guideCustomize.hidden, false);
visit('garment');
assert.equal(guideCards[1].hidden, false);
assert.equal(ids.garmentVariantSection.hidden, true, 'one default child does not require a redundant decision');
selection({ event: 'db-event', garment: 'another-garment', style: 'db-style' }, 'garment', 3);
assert.equal(ids.studioExperience.dataset.guideStep, 'garment');
assert.equal(ids.garmentVariantSection.hidden, false, 'multiple concrete samples stay visible until user is done');
selection({ event: 'db-event', garment: 'another-garment', style: 'db-style' }, 'garmentVariant', 3);
assert.equal(ids.studioExperience.dataset.guideStep, 'garment');
ids.guideContinue.click();
assert.equal(ids.studioExperience.dataset.guideStep, 'review');
selection({ event: 'no-preset-event', garment: '', style: '' }, 'event');
assert.equal(ids.studioExperience.dataset.guideStep, 'garment', 'incomplete presets ask for the next missing choice');
assert.equal(ids.guideContinue.disabled, true);
selection({ event: 'no-preset-event', garment: 'db-garment', style: '' }, 'garment', 2);
ids.guideContinue.click();
assert.equal(ids.studioExperience.dataset.guideStep, 'style');
assert.equal(ids.guideContinue.disabled, true);
ids.guideBack.click();
assert.equal(ids.studioExperience.dataset.guideStep, 'garment');
selection({ event: 'restored-event', garment: 'restored-garment', style: 'restored-style' });
assert.equal(ids.studioExperience.dataset.guideStep, 'review', 'restored jobs also use the real snapshot');
ids.inputImage.files = [{ name: 'portrait.png' }]; ids.inputImage.value = 'portrait.png';
ids.inputImage.emit('change');
assert.equal(ids.workspaceRemoveUpload.hidden, false);
ids.workspaceRemoveUpload.click();
assert.equal(ids.inputImage.value, '');
assert.equal(ids.workspaceRemoveUpload.hidden, true);
assert.equal(ids.workspaceUpload.focused, true, 'removing an upload returns focus to a visible control');

// Test the real comparison renderer without a paid provider job.
const source = fs.readFileSync(path.join(__dirname, '../assets/js/studio.js'), 'utf8');
const start = source.indexOf('  function compareCurrentLooks()');
const end = source.indexOf('  if (saveLookButton)', start);
const compareLayer = element(); compareLayer.hidden = true; compareLayer.children = [];
compareLayer.appendChild = item => compareLayer.children.push(item);
const compareButton = element();
const createElement = () => ({ children: [], appendChild(item) { this.children.push(item); } });
const compareContext = {
  currentLookbookItems: [{ url: 'https://example.com/a.png' }, { url: 'https://example.com/b.png' }],
  compareLayer, compareLooksButton: compareButton, document: { createElement }, setStatus() {},
  showResult() { throw new Error('comparison must stay in the preview'); }
};
vm.createContext(compareContext);
vm.runInContext(source.slice(start, end) + '\ncompareCurrentLooks();', compareContext);
assert.equal(compareLayer.hidden, false);
assert.equal(compareLayer.children.length, 2);
assert.equal(compareLayer.children[0].children[0].src, 'https://example.com/a.png');
vm.runInContext('compareCurrentLooks();', compareContext);
assert.equal(compareLayer.hidden, true);
assert.equal(compareButton.textContent, 'So sánh ảnh');
console.log('Studio workspace: panels, guided steps, presets, child variants, back/edit, upload/remove, fullscreen and comparison passed.');
