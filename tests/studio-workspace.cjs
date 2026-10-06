const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function element(classes = []) {
  const set = new Set(classes);
  const listeners = {};
  return {
    hidden: false, dataset: {}, attributes: {}, textContent: '',
    classList: {
      contains(name) { return set.has(name); },
      add(name) { set.add(name); }, remove(name) { set.delete(name); },
      toggle(name, active) { active ? set.add(name) : set.delete(name); }
    },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(name, fn) { listeners[name] = fn; },
    emit(name, event) { if (listeners[name]) listeners[name].call(this, event); },
    click() { this.clicked = true; this.emit('click'); },
    focus() { this.focused = true; }, scrollIntoView() { this.scrolled = true; }
  };
}
const ids = {};
['studioExperience', 'workspaceCatalog', 'workspaceInsights', 'workspacePanelTitle',
  'workspacePanelHint', 'workspaceFullscreen', 'workspaceUpload', 'inputImage',
  'studioDock', 'dockClose', 'studioSrStatus', 'variantStrip'].forEach(id => { ids[id] = element(); });
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
vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/studio-workspace.js'), 'utf8'), { document, window });
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
assert.equal(uploadNote.textContent, 'Tuỳ chọn · tối đa 8 MB');

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
console.log('Studio workspace: panels, mobile navigation, upload, unsupported fullscreen and inline comparison passed.');
