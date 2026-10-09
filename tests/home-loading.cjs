const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

// Run the real homepage script without network/media downloads. Fake timers
// make the first-frame and explicit design-preview behavior deterministic.
function boot(search = '', cached = false) {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  const frames = [];
  function element() {
    const classes = new Set();
    const listeners = {};
    return {
      dataset: {}, style: { setProperty() {} }, readyState: 0, loads: 0,
      classList: {
        add(...names) { names.forEach(name => classes.add(name)); },
        remove(...names) { names.forEach(name => classes.delete(name)); },
        contains(name) { return classes.has(name); },
        toggle(name, on) { if (on) classes.add(name); else classes.delete(name); }
      },
      setAttribute() {}, removeAttribute() {}, appendChild() {}, pause() {},
      load() { this.loads++; this.readyState = 0; },
      addEventListener(name, callback) { (listeners[name] ||= []).push(callback); },
      removeEventListener() {},
      emit(name) { (listeners[name] || []).forEach(callback => callback()); }
    };
  }
  const ids = {};
  ['stage', 'explorePoster', 'controller', 'capsule', 'cellLabel', 'status', 'notice',
    'noticeText', 'retryBtn', 'exploreStudio'].forEach(id => { ids[id] = element(); });
  const branches = { base: { label: 'Base', isBase: true }, other: { label: 'Other' } };
  const buttons = Object.keys(branches).map(key => {
    const button = element(); button.dataset.branch = key; return button;
  });
  ids.controller.querySelectorAll = () => buttons;
  Object.keys(branches).forEach(key => ['f', 'r'].forEach(dir => {
    const video = ids[`v-${key}-${dir}`] = element();
    video.preload = key === 'base' && dir === 'f' ? 'auto' : 'none';
  }));
  if (cached) ids['v-base-f'].readyState = 2;
  const window = {
    VREMIX_CONFIG: { branches, ui: { status_loading: 'Loading', error_video_load: 'Failed' } },
    location: { search }, matchMedia: () => ({ matches: false }), addEventListener() {},
    setTimeout(callback, delay) { const id = ++nextId; timers.set(id, { callback, due: now + delay }); return id; },
    clearTimeout(id) { timers.delete(id); }
  };
  const document = { getElementById: id => ids[id], createElement: element, addEventListener() {} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../assets/js/app.js'), 'utf8'), {
    window, document, URLSearchParams, requestAnimationFrame: callback => frames.push(callback)
  });
  return {
    ids, buttons,
    frame() { frames.splice(0).forEach(callback => callback()); },
    advance(milliseconds) {
      const until = now + milliseconds;
      while (true) {
        const pending = [...timers].filter(([, task]) => task.due <= until).sort((a, b) => a[1].due - b[1].due);
        if (!pending.length) break;
        const [id, task] = pending[0]; now = task.due; timers.delete(id); task.callback();
      }
      now = until;
    },
    decode(id = 'v-base-f') { ids[id].readyState = 2; ids[id].emit('loadeddata'); }
  };
}

const slow = boot();
slow.advance(799);
assert.equal(slow.ids.stage.classList.contains('media-waiting'), false);
slow.advance(1);
assert.equal(slow.ids.stage.classList.contains('media-waiting'), true);
assert.equal(slow.ids.stage.classList.contains('media-ready'), false);
assert.equal(slow.ids['v-other-f'].loads, 0, 'branches must not compete with the opening frame');
slow.decode();
slow.frame();
assert.equal(slow.ids.stage.classList.contains('media-ready'), false);
slow.frame();
assert.equal(slow.ids.stage.classList.contains('media-ready'), true);
assert.equal(slow.ids.stage.classList.contains('media-waiting'), false);
slow.advance(1000);
['v-base-r', 'v-other-f', 'v-other-r'].forEach(id => {
  assert.equal(slow.ids[id].loads, 1);
  assert.equal(slow.ids[id].preload, 'auto');
  slow.decode(id);
});
assert.equal(slow.buttons.every(button => !button.disabled), true);

const cached = boot('', true);
cached.frame(); cached.frame();
assert.equal(cached.ids.stage.classList.contains('media-ready'), true, 'cached media needs no artificial delay');

const preview = boot('?loader=preview', true);
preview.advance(2599);
assert.equal(preview.ids.stage.classList.contains('media-ready'), false);
assert.equal(preview.ids['v-other-f'].loads, 0);
preview.advance(1);
assert.equal(preview.ids.stage.classList.contains('media-ready'), true);

const failed = boot();
failed.ids['v-base-f'].emit('error');
assert.equal(failed.ids.notice.classList.contains('is-on'), true);
assert.equal(failed.ids.stage.classList.contains('media-ready'), false);
failed.ids.retryBtn.emit('click');
assert.equal(failed.ids['v-base-f'].loads, 1);
failed.decode(); failed.frame(); failed.frame();
assert.equal(failed.ids.stage.classList.contains('media-ready'), true);
const timeout = boot();
timeout.advance(12000);
assert.equal(timeout.ids.stage.dataset.playback, 'error', 'opening cannot load forever');
assert.equal(timeout.ids.notice.classList.contains('is-on'), true);
timeout.ids.retryBtn.emit('click');
assert.equal(timeout.ids['v-base-f'].loads, 1, 'timeout retry reloads the opening clip');
timeout.decode(); timeout.frame(); timeout.frame();
assert.equal(timeout.ids.stage.classList.contains('media-ready'), true);
const presentedError = boot('', true);
presentedError.frame(); presentedError.frame();
presentedError.ids['v-base-f'].emit('error');
assert.equal(presentedError.ids['v-base-f'].classList.contains('is-visible'), false, 'failed opening layer gives way to the independent poster');
assert.equal(presentedError.ids.stage.classList.contains('media-ready'), false);
presentedError.ids.retryBtn.emit('click');
assert.equal(presentedError.ids['v-base-f'].loads, 1, 'visible media errors must not be excluded from retry');
presentedError.decode(); presentedError.frame(); presentedError.frame();
assert.equal(presentedError.ids.stage.classList.contains('media-ready'), true);
const pendingPaint = boot('', true);
pendingPaint.ids['v-base-f'].emit('error'); pendingPaint.frame(); pendingPaint.frame();
assert.equal(pendingPaint.ids.stage.classList.contains('media-ready'), false, 'stale paint callbacks cannot dismiss failure state');
pendingPaint.ids.explorePoster.emit('error');
assert.equal(pendingPaint.ids.explorePoster.hidden,true,'failed image must not show a broken-image icon');
pendingPaint.ids.explorePoster.emit('load');
assert.equal(pendingPaint.ids.explorePoster.hidden,false);
const css = fs.readFileSync('assets/css/app.css','utf8');
assert.match(css, /\.stage\{[^}]*background:#1b2427; color:#fff;/);
assert.match(css, /\.media-loading\{[^}]*background:transparent;/);
assert.match(css, /\.stage::after\{[^}]*pointer-events:none;/);
assert.ok(!css.includes('.stage:not(.media-ready){ color:#203039; }'));
const markup = fs.readFileSync('includes/partials/media.php','utf8');
assert.ok(markup.indexOf('class="media media-poster"') < markup.indexOf('<video'), 'poster stays below all video layers');
assert.match(markup, /fetchpriority="high"/);
assert.match(markup, /poster=/);
assert.ok(fs.statSync('assets/media/explore-opening-poster.jpg').size < 250000, 'fallback stays lightweight');
console.log('Homepage loading: cached/slow/preview, deferred clips, timeout, media errors before/after paint, safe retry and persistent poster contract passed.');
