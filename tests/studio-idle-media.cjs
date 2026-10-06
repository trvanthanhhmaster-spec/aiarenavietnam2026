const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '../assets/js/studio.js'), 'utf8');
const start = source.indexOf('  function prepareMedia() {');
const end = source.indexOf("  imageInput.addEventListener('change'", start);
assert.ok(start >= 0 && end > start);
const implementation = source.slice(start, end);

function run({ reduced = false, cached = true, video = 'video.mp4', withPoster = true } = {}) {
  const classes = new Set(withPoster ? ['has-idle-poster'] : []);
  const posterEvents = {};
  const mediaEvents = {};
  const poster = { complete: cached, naturalWidth: cached ? 1600 : 0,
    addEventListener(name, fn) { posterEvents[name] = fn; } };
  let plays = 0;
  const context = {
    document: { getElementById: () => withPoster ? poster : null },
    frame: { classList: { add: name => classes.add(name), remove: name => classes.delete(name) } },
    media: { addEventListener(name, fn) { mediaEvents[name] = fn; },
      play() { plays++; return Promise.resolve(); } },
    catalog: { baseMedia: video, basePoster: withPoster ? 'poster.png' : '' },
    window: { matchMedia: () => ({ matches: reduced }) },
    generationPending: false, state: { event: '' }, setStatus() {}
  };
  vm.runInNewContext(implementation + '\nprepareMedia();', context);
  return { context, classes, poster, posterEvents, mediaEvents, plays };
}

let result = run();
assert.ok(result.classes.has('is-ready'), 'cached poster shows without waiting for video');
assert.equal(result.context.media.src, 'video.mp4');
assert.equal(result.context.media.poster, 'poster.png');
assert.equal(result.context.media.muted, true);
assert.equal(result.context.media.loop, true);
assert.equal(result.plays, 1);
assert.ok(!result.classes.has('is-video-ready'));
result.mediaEvents.loadeddata();
assert.ok(result.classes.has('is-video-ready'));
result.mediaEvents.error();
assert.ok(!result.classes.has('is-video-ready'));
assert.ok(result.classes.has('has-idle-poster'), 'video error keeps the image fallback');
assert.equal(result.poster.hidden, undefined);
assert.equal(result.context.media.hidden, true);

result = run({ reduced: true });
assert.equal(result.plays, 0);
assert.equal(result.context.media.src, undefined, 'reduced motion does not download video');
assert.ok(result.classes.has('is-ready'));
result = run({ cached: false });
assert.ok(!result.classes.has('is-ready'));
result.posterEvents.load();
assert.ok(result.classes.has('is-ready'));
result.posterEvents.error();
assert.equal(result.poster.hidden, true);
assert.ok(!result.classes.has('has-idle-poster'));
result.mediaEvents.canplay();
assert.ok(result.classes.has('is-video-ready'), 'video works even if poster failed');
result = run({ video: '', withPoster: false });
assert.equal(result.plays, 0, 'unconfigured media leaves onboarding functional');
console.log('Studio idle media: poster-first, looping muted video, failed media and reduced motion passed without AI calls.');
