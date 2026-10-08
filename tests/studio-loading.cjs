const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../assets/js/studio-loading.js'), 'utf8');
function setup(reduced = false) {
  const events = {}, videoEvents = {}, docEvents = {}, motionEvents = {};
  const overlay = { hidden: true }, fallback = { hidden: true };
  const toggle = { addEventListener: (n, fn) => events[n] = fn, setAttribute() {} };
  let plays = 0, pauses = 0, rejection;
  const video = { dataset: { src: 'loading.mp4' }, currentTime: 0,
    getAttribute: () => video.src, removeAttribute: () => { delete video.src; }, load() {},
    play() { plays++; return { catch(fn) { rejection = fn; } }; },
    pause() { pauses++; }, addEventListener: (n, fn) => videoEvents[n] = fn };
  const motion = { matches: reduced, addEventListener: (n, fn) => motionEvents[n] = fn };
  const document = { hidden: false,
    getElementById: id => ({ previewGenerationStatus: overlay, studioLoadingVideo: video,
      studioLoadingToggle: toggle, studioLoadingFallback: fallback })[id],
    addEventListener: (n, fn) => docEvents[n] = fn };
  const window = { matchMedia: () => motion };
  vm.runInNewContext(source, { document, window });
  return { api: window.VRemixLoading, overlay, fallback, toggle, video, events, videoEvents,
    document, docEvents, motion, motionEvents, plays: () => plays, pauses: () => pauses,
    reject: () => rejection() };
}
let app = setup();
assert.equal(app.video.src, undefined, 'idle Studio must not fetch the loading clip');
app.api.setBusy(true);
assert.equal(app.overlay.hidden, false);
assert.equal(app.video.src, 'loading.mp4');
assert.equal(app.video.muted, true);
assert.equal(app.plays(), 1);
app.video.currentTime = 5;
app.api.setBusy(true);
assert.equal(app.plays(), 1, 'polling does not restart playback');
assert.equal(app.video.currentTime, 5);
app.events.click();
assert.equal(app.toggle.textContent, 'Phát video');
app.api.setBusy(true);
assert.equal(app.plays(), 1, 'polling honors manual pause');
app.events.click();
assert.equal(app.plays(), 2);
app.document.hidden = true; app.docEvents.visibilitychange();
assert.equal(app.toggle.textContent, 'Phát video');
app.document.hidden = false; app.docEvents.visibilitychange();
assert.equal(app.plays(), 3);
app.reject();
assert.equal(app.toggle.textContent, 'Phát video', 'autoplay rejection permits manual retry');
app.events.click();
assert.equal(app.plays(), 4);
app.api.setBusy(false);
assert.equal(app.overlay.hidden, true, 'success or failure removes the overlay');
app.api.setBusy(true);
assert.equal(app.video.currentTime, 0, 'new generation starts a fresh loop');
app.videoEvents.error();
assert.equal(app.fallback.hidden, false, 'media failure still communicates progress');
assert.equal(app.toggle.hidden, true);
app.api.setBusy(false);
assert.equal(app.fallback.hidden, true);
app = setup(true);
app.api.setBusy(true);
assert.equal(app.overlay.hidden, false, 'reduced motion retains a static poster');
assert.equal(app.video.src, undefined, 'reduced motion avoids downloading the video');
assert.equal(app.plays(), 0);
assert.equal(app.toggle.hidden, true);
app.motion.matches = false; app.motionEvents.change();
assert.equal(app.plays(), 1);
app.motion.matches = true; app.motionEvents.change();
assert.equal(app.toggle.hidden, true);
const html = fs.readFileSync(path.join(__dirname, '../studio.php'), 'utf8');
assert.match(html, /id="studioLoadingVideo" muted loop playsinline preload="none"/);
assert.match(html, /studio-loading\.js[\s\S]*src="assets\/js\/studio\.js/);
for (const asset of ['studio-loading-loop.mp4', 'studio-loading-poster.jpg']) {
  assert.ok(fs.statSync(path.join(__dirname, '../assets/media', asset)).size > 1000);
}
console.log('Studio loading video: lazy media, lifecycle, pause, autoplay failure, reduced motion and polling passed. No AI calls.');
