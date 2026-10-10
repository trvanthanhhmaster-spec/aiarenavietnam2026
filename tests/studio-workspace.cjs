const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const navigation = fs.readFileSync(path.join(__dirname, '../includes/studio/workspace-navigation.php'), 'utf8');
assert.equal((navigation.match(/class="workspace-logo"/g) || []).length, 1, 'Studio keeps one image logo');
assert.ok(navigation.includes('assets/images/v-remix-leaf-logo.png'), 'Studio uses the supplied leaf logo');
assert.ok(!navigation.includes('workspace-wordmark'), 'header must not duplicate the brand');
assert.ok(navigation.includes('workspace-sidebar__home'), 'home navigation remains available');
assert.ok(navigation.includes('if ($authUser !== null)'), 'avatar is only rendered for authenticated users');
assert.ok(navigation.includes('<strong>Đăng nhập</strong>') && navigation.includes('workspace-profile__icon'), 'guests have desktop login text and a named mobile account icon');
assert.ok(navigation.includes("$studioIcon('palette')"), 'Studio uses a creative palette rather than settings sliders');
assert.ok(navigation.includes("$studioIcon('folder-image')"), 'Collections uses a folder of images rather than loose image previews');
const workspaceCss = fs.readFileSync(path.join(__dirname, '../assets/css/studio-workspace.css'), 'utf8');
assert.match(workspaceCss, /\.workspace-topnav__label\s*\{\s*display:\s*none;/, 'mobile navigation is icon-only with accessible names');
assert.ok(navigation.includes('aria-label="Bộ sưu tập của tôi"'), 'collections action retains its accessible name and event hook');
assert.match(navigation, /class="workspace-topnav__new" data-workspace-new-collection aria-label="Bộ sưu tập mới"[^>]*disabled>/, 'mobile new collection is a named, initially guarded header action');
assert.match(workspaceCss, /\.workspace-topnav > \.workspace-topnav__new\s*\{\s*display:\s*none;/, 'desktop keeps its existing heading action');
assert.match(workspaceCss, /\.workspace-heading > \.workspace-new-collection\s*\{\s*display:\s*none;/, 'mobile removes the redundant heading action');
assert.match(workspaceCss, /repeat\(4, minmax\(44px, 1fr\)\)/, 'four mobile controls preserve 44px touch targets');
assert.equal((navigation.match(/data-workspace-tooltip/g) || []).length, 6, 'all sidebar icons have named hover/focus hints');

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
  'guidePeopleValue', 'guideTimeValue', 'guideCustomize', 'garmentVariantSection', 'guideReviewTitle',
  'workspaceRemoveUpload'].forEach(id => { ids[id] = element(); });
const guideCards = ['event', 'people', 'time', 'garment'].map(step => {
  const card = element(); card.dataset.guideCard = step; return card;
});
const guideSteps = ['event', 'people', 'time', 'garment'].map(step => {
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
const window = { location: {hash:''}, addEventListener(name,fn) { this[name]=fn; }, matchMedia: query => ({ matches: query.includes('1023px') && mobile }), setTimeout() {} };
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
assert.deepEqual(sections.map(section => section.hidden), [false, false, true, true, true]);
assert.equal(panelButtons[1].attributes['aria-pressed'], 'true');
ids.workspaceInsights.scrollTop = 160;
clickPanel('places');
assert.equal(ids.workspaceInsights.scrollTop, 0, 'switching information tabs starts at their first section');
ids.workspaceInsights.scrollTop = 90; clickPanel('places');
assert.equal(ids.workspaceInsights.scrollTop, 90, 'clicking the current tab preserves reading position');
assert.deepEqual(sections.map(section => section.hidden), [true, true, false, false, false]);
assert.equal(ids.workspacePanelTitle.textContent, 'Mang bản phối ra đời thật');
window.location.hash = '#studioExample'; window.hashchange();
assert.equal(panelButtons[1].attributes['aria-pressed'], 'true', 'old sample links open garment information');
assert.equal(ids.workspaceCatalog.hidden, true);
assert.deepEqual(sections.map(section => section.hidden), [false, false, true, true, true]);
window.location.hash = '#workspaceInsights'; window.hashchange();
assert.equal(panelButtons[1].attributes['aria-pressed'], 'true');
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
  const next = ['event', 'people', 'time', 'garment'].find(step => !choices[step]) || 'review';
  const guide = { next, ready: next === 'review', choices, changed, variantCount,
    planning: { activePerson: 1, people: [{ outfit: { garment: choices.garment || '' } }] },
    labels: { event: 'Dịp từ database', garment: 'Mẫu đã duyệt', style: 'Phong cách đã chọn' } };
  ids.studioExperience.emit('studio:selection', { detail: guide });
}
function visit(step) {
  const button = element(); button.dataset.guideStep = step;
  ids.studioExperience.emit('click', { target: { closest: selector => selector === 'button[data-guide-step]' ? button : null } });
}
// A real input's closest generic data-guide-step is the workspace itself.
// Clicking it must not navigate or steal focus from typing/date/file controls.
for (const field of ['occasionSearch', 'occasionNote', 'groupCount', 'periodStart', 'periodEnd', 'personName', 'personGender', 'personHeight', 'personWeight', 'personFaceConsent', 'personFace']) {
  garmentTrigger.focused = false;
  const step = ids.studioExperience.dataset.guideStep;
  ids.studioExperience.emit('click', { target: { id: field, closest: selector => selector === '[data-guide-step]' ? ids.studioExperience : null } });
  assert.equal(garmentTrigger.focused, false, field + ' must retain focus instead of focusing the step heading');
  assert.equal(ids.studioExperience.dataset.guideStep, step);
}
assert.deepEqual(guideCards.map(card => card.hidden), [false, true, true, true], 'initial view asks only one question');
assert.equal(ids.guideCustomize.hidden, true);
assert.equal(guideSteps[1].disabled, true, 'a beginner cannot accidentally skip the first choice');
visit('garment');
assert.equal(ids.studioExperience.dataset.guideStep, 'event');
selection({ event: 'db-event', garment: '' }, 'event', 1);
assert.equal(ids.studioExperience.dataset.guideStep, 'event', 'a choice never implicitly advances or creates');
ids.guideContinue.click();
assert.equal(ids.studioExperience.dataset.guideStep, 'people');
selection({ event: 'db-event', people: 1 }, 'people');
ids.guideContinue.click();
assert.equal(ids.studioExperience.dataset.guideStep, 'time');
selection({ event: 'db-event', people: 1, time: true }, 'time');
ids.guideContinue.click();
assert.equal(ids.studioExperience.dataset.guideStep, 'garment');
selection({ event: 'db-event', people: 1, time: true, garment: 'db-garment' }, 'garment', 1);
assert.equal(ids.guideGarmentValue.textContent, 'Mẫu đã duyệt');
assert.equal(ids.guideCustomize.hidden, false);
visit('garment');
assert.equal(guideCards[3].hidden, false);
assert.equal(ids.garmentVariantSection.hidden, false, 'even one sample exposes its actual photo and pattern, without requiring a second decision');
selection({ event: 'db-event', people: 1, time: true, garment: 'another-garment' }, 'garment', 3);
assert.equal(ids.studioExperience.dataset.guideStep, 'garment');
assert.equal(ids.garmentVariantSection.hidden, false, 'multiple concrete samples stay visible until user is done');
selection({ event: 'db-event', people: 1, time: true, garment: 'another-garment' }, 'garmentVariant', 3);
assert.equal(ids.studioExperience.dataset.guideStep, 'garment');
ids.guideContinue.click();
assert.equal(ids.studioExperience.dataset.guideStep, 'review');
selection({ event: 'no-preset-event', garment: '' }, 'event');
assert.equal(ids.studioExperience.dataset.guideStep, 'people', 'missing people returns to the appropriate step');
assert.equal(ids.guideContinue.disabled, true);
selection({ event: 'no-preset-event', people: 2 }, 'people');
ids.guideContinue.click();
assert.equal(ids.studioExperience.dataset.guideStep, 'time');
assert.equal(ids.guideContinue.disabled, true);
ids.guideBack.click();
assert.equal(ids.studioExperience.dataset.guideStep, 'people');
selection({ event: 'restored-event', people: 2, time: true, garment: 'restored-garment' });
visit('review');
assert.equal(ids.studioExperience.dataset.guideStep, 'review', 'review requires all four completed choices');
ids.inputImage.files = [{ name: 'portrait.png' }]; ids.inputImage.value = 'portrait.png';
ids.inputImage.emit('change');
assert.equal(ids.workspaceRemoveUpload.hidden, false);
ids.workspaceRemoveUpload.click();
assert.equal(ids.inputImage.value, '');
assert.equal(ids.workspaceRemoveUpload.hidden, true);
assert.equal(ids.workspaceUpload.focused, true, 'removing an upload returns focus to a visible control');

// Test the real comparison renderer without a paid provider job.
const source = fs.readFileSync(path.join(__dirname, '../assets/js/studio.js'), 'utf8');
const start = source.indexOf('  function compareCurrentLooks(versions)');
const end = source.indexOf('  if (saveLookButton)', start);
const compareLayer = element(); compareLayer.hidden = true; compareLayer.children = [];
compareLayer.appendChild = item => compareLayer.children.push(item);
Object.defineProperty(compareLayer, 'innerHTML', { set() { this.children = []; } });
const compareButton = element();
const createElement = () => ({ children: [], listeners: {}, appendChild(item) { this.children.push(item); }, setAttribute(key, value) { this[key] = value; }, addEventListener(type, fn) { this.listeners[type] = fn; } });
const compareContext = {
  currentLookbookItems: [{ url: 'https://example.com/a.png' }, { url: 'https://example.com/b.png' }],
  compareLayer, compareLooksButton: compareButton, document: { createElement }, setStatus() {},
  experience: { dispatchEvent() {} }, Event: class { constructor(type) { this.type = type; } },
  showResult() { throw new Error('comparison must stay in the preview'); }
};
vm.createContext(compareContext);
vm.runInContext(source.slice(start, end) + '\ncompareCurrentLooks();', compareContext);
assert.equal(compareLayer.hidden, false);
assert.equal(compareLayer.children.length, 3);
assert.equal(compareLayer.children[1].children[1].src, 'https://example.com/a.png');
const leftSelect = compareLayer.children[1].children[0].children[1];
leftSelect.value = '1'; leftSelect.listeners.change();
assert.equal(compareLayer.children[1].children[1].src, 'https://example.com/b.png', 'changing left selector updates only the comparison image');
vm.runInContext('compareCurrentLooks([{url:"/one",label:"One"},{url:"/two",label:"Two"},{url:"/three",label:"Three",active:true}]);', compareContext);
assert.equal(compareLayer.hidden, false, 'explicit pair update does not close comparison');
assert.equal(compareLayer.children[1].children[1].src, '/two');
assert.equal(compareLayer.children[2].children[1].src, '/three');
const rightSelect = compareLayer.children[2].children[0].children[1];
rightSelect.value = '0'; rightSelect.listeners.change();
assert.equal(compareLayer.children[2].children[1].src, '/one', 'right selector can choose any version');
compareLayer.children[0].children[0].listeners.click();
assert.equal(compareLayer.children[1].children[1].src, '/one', 'swap updates the left image');
assert.equal(compareLayer.children[2].children[1].src, '/two', 'swap updates the right image');
compareLayer.children[0].children[1].listeners.click();
assert.equal(compareLayer.classList.contains('is-expanded'), true);
vm.runInContext('compareCurrentLooks();', compareContext);
assert.equal(compareLayer.hidden, true);
assert.equal(compareLayer.classList.contains('is-expanded'), false, 'closing also exits expanded view');
assert.equal(compareButton.textContent, 'So sánh ảnh');
console.log('Studio workspace: panels, guided steps, presets, child variants, back/edit, upload/remove, fullscreen and comparison passed.');
