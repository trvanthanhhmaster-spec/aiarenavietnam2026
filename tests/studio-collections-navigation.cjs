const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function element() {
  const listeners = {};
  return {
    disabled: false, hidden: false, open: false, isConnected: true,
    addEventListener(name, fn) { listeners[name] = fn; },
    emit(name) { return listeners[name]?.call(this, { preventDefault() {} }); },
    showModal() { this.open = true; },
    close() { this.open = false; this.emit('close'); },
    focus() { this.focused = true; },
    scrollIntoView() {}, replaceChildren() {}
  };
}

(async () => {
  const ids = {};
  ['studioExperience', 'studioCollections', 'collectionsItems', 'collectionsStatus',
    'collectionSwitchConfirm', 'collectionSwitchError', 'collectionSwitchAccept',
    'newStudioCollection', 'collectionsPrivacy', 'collectionActionStatus', 'studioStage',
    'collectionSwitchTitle', 'collectionSwitchDescription', 'collectionSwitchCancel',
    'collectionsClose'].forEach(id => { ids[id] = element(); });
  const mobileNew = element(), library = element();
  let ready = false, edited = false, generating = false, starts = 0, lists = 0;
  ids.studioExperience.collectionsApi = {
    ready: () => ready, busy: () => generating, edited: () => edited,
    start: async () => { starts++; },
    list: () => { lists++; return []; }
  };
  vm.runInNewContext(fs.readFileSync('assets/js/studio-collections.js', 'utf8'), {
    window: { VREMIX_STUDIO: { auth: { authenticated: false } } },
    document: {
      getElementById: id => ids[id],
      querySelectorAll: selector => selector === '[data-workspace-new-collection]' ? [mobileNew] : [library]
    }
  });
  assert.ok(mobileNew.disabled && ids.newStudioCollection.disabled && library.disabled);
  ready = true;
  ids.studioExperience.emit('studio:collections-ready');
  assert.ok(!mobileNew.disabled && !ids.newStudioCollection.disabled && !library.disabled);
  generating = true;
  ids.studioExperience.emit('studio:collections-busy');
  assert.ok(mobileNew.disabled && ids.newStudioCollection.disabled);
  generating = false;
  ids.studioExperience.emit('studio:collections-busy');
  edited = true;
  mobileNew.emit('click');
  assert.ok(ids.collectionSwitchConfirm.open, 'edited work asks before starting a new collection');
  assert.equal(starts, 0);
  assert.equal(lists, 0, 'plus does not render/open the library');
  ids.collectionSwitchCancel.emit('click');
  assert.equal(starts, 0, 'cancel preserves work');
  assert.ok(mobileNew.focused, 'cancel returns focus to the initiating mobile button');
  mobileNew.emit('click');
  ids.collectionSwitchAccept.emit('click');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(starts, 1);
  assert.equal(ids.studioCollections.open, false);
  assert.equal(ids.collectionSwitchConfirm.open, false);
  assert.equal(mobileNew.disabled, false);
  edited = false;
  ids.newStudioCollection.emit('click');
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(starts, 2, 'desktop and mobile use the same start action');
  library.emit('click');
  assert.ok(ids.studioCollections.open, 'the separate collections icon still opens the library');
  assert.equal(starts, 2);
  console.log('Studio collection navigation: mobile/desktop start, readiness, generation lock, confirmation, cancellation, focus and separate library passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
