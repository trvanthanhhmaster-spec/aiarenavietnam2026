const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/studio-result-actions.js', 'utf8');
const events = {}, docEvents = {}, windowEvents = {};
let refresh, focusCount = 0;
const actions = [{ hidden: true }, { hidden: true }];
const trigger = { focus() { focusCount++; } };
const more = { hidden: true, open: false,
  querySelector: () => trigger, querySelectorAll: () => actions,
  contains: target => target === trigger,
  addEventListener: (key, fn) => events[key] = fn };
vm.runInNewContext(source, {
  document: { getElementById: () => more, addEventListener: (key, fn) => docEvents[key] = fn },
  window: { addEventListener: (key, fn) => windowEvents[key] = fn },
  MutationObserver: class {
    constructor(fn) { refresh = fn; }
    observe(target, options) {
      assert.ok(actions.includes(target), 'observe actions only, not the menu hidden flag');
      assert.equal(options.attributes, true);
    }
  }
});
assert.equal(more.hidden, true, 'no export menu before an image exists');
actions[0].hidden = false; refresh();
assert.equal(more.hidden, false, 'available export reveals the compact menu');
more.open = true;
docEvents.click({ target: trigger });
assert.equal(more.open, true, 'inside clicks do not close the menu prematurely');
docEvents.click({ target: {} });
assert.equal(more.open, false, 'outside click closes');
more.open = true;
let prevented = false, stopped = false;
docEvents.keydown({ key: 'Escape', preventDefault() { prevented = true; }, stopPropagation() { stopped = true; } });
assert.equal(more.open, false);
assert.ok(prevented && stopped, 'Escape closes only this menu, not other Studio panels');
assert.equal(focusCount, 1);
more.open = true;
events.click({ target: { closest: () => actions[0] } });
assert.equal(more.open, false);
assert.equal(focusCount, 2, 'choosing an action returns focus to the trigger');
more.open = true;
windowEvents.resize();
assert.equal(more.open, false);
actions[0].hidden = true; actions[1].hidden = false; refresh();
assert.equal(more.hidden, false, 'deletion remains available independently of export');
actions[1].hidden = true; more.open = true; refresh();
assert.equal(more.hidden, true);
assert.equal(more.open, false, 'new collection clears the menu');
const php = fs.readFileSync('studio.php', 'utf8');
assert.match(php, /<details class="studio-result-more"[\s\S]*id="downloadStory"[\s\S]*id="deleteCurrentVersion"[\s\S]*<\/details>/);
assert.match(php, /id="resultDownload"[^>]*download hidden>Tải ảnh/);
assert.match(php, /aria-label="Thêm thao tác với bản phối"/);
assert.match(php, /Xuất thẻ chia sẻ/);
console.log('Studio result actions: compact disclosure, availability, keyboard/outside dismissal and reset passed.');
