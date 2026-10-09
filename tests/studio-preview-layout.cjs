const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const js = fs.readFileSync(path.join(__dirname, '../assets/js/studio.js'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '../assets/css/studio-workspace.css'), 'utf8');
const helper = js.match(/  function setPreviewAspect\(width, height\) \{[\s\S]*?\n  \}/)[0];
let ratio;
const plane = { style: { setProperty(key, value) {
  assert.equal(key, '--studio-preview-ratio'); ratio = Number(value);
} } };
const context = { document: { getElementById: () => plane } };
vm.createContext(context);
vm.runInContext(helper, context);
for (const [width, height] of [[1920, 1080], [1024, 1024], [1080, 1920], [1600, 900]]) {
  context.setPreviewAspect(width, height);
  assert.equal(ratio, width / height, 'use actual dimensions for landscape, square and portrait');
}
const previous = ratio;
for (const [width, height] of [[0, 0], [NaN, 100], [100, -1], [Infinity, 100]]) {
  context.setPreviewAspect(width, height);
  assert.equal(ratio, previous, 'unloaded/invalid dimensions keep the current ratio');
}
assert.match(js, /setPreviewAspect\(previewImage.naturalWidth, previewImage.naturalHeight\)/);
assert.match(js, /classList.toggle\('has-preview-variants', items.length > 1\)/);
assert.match(css, /:not\(\.has-preview-variants\) \.studio-preview/);
assert.match(css, /has-generated-output \.studio-preview \{\s*height: auto;\s*align-self: start;/);
assert.match(css, /aspect-ratio: var\(--studio-preview-ratio/);
assert.match(css, /\.studio-preview-image \{[^}]*object-fit: contain/);
assert.match(css, /\.studio-preview-image \{[^}]*width: auto; height: auto; max-width: 100%; max-height: 100%;[^}]*border-radius: 16px/,
  'round the actual fitted bitmap instead of a letterboxed image box, without cropping');
assert.match(css, /\.studio-frame\.has-ai-preview \.studio-idle-poster \{ opacity: 0; \}/,
  'fitted output margins must not reveal the unrelated idle poster behind the image');
assert.match(js, /notifyHistory\(true\);[\s\S]*bounds\.bottom <= 0 \|\| bounds\.top >= window\.innerHeight/,
  'version switching uses local history and does not scroll an already visible preview');
assert.match(css, /has-history:not\(\.has-generated-output\) \.studio-plane \{\s*align-self: stretch;/,
  'history must not collapse the idle video frame to zero height');
assert.match(css, /\.studio-history-strip \{[^}]*display: flex;[^}]*overflow-x: auto;[^}]*overflow-y: hidden/,
  'narrow screens use a horizontal scrolling version strip');
assert.match(css, /\.studio-history-strip \{[^}]*scrollbar-width: none/,
  'version strips retain scrolling without a visible scrollbar');
assert.match(css, /\.studio-history-strip::-webkit-scrollbar \{ display: none; width: 0; height: 0;/,
  'WebKit browsers also hide the overlay scrollbar');
assert.match(css, /@media \(min-width: 1024px\) \{[\s\S]*--history-rail-width:[\s\S]*grid-template-areas: '\. canvas' '\. status' '\. advanced'/,
  'wide screens keep versions beside the preview');
assert.match(css, /\.studio-history \{\s*grid-area: auto; position: absolute; inset: 7px auto 7px 7px;/,
  'the desktop rail is bounded by the preview rather than the number of versions');
assert.match(css, /flex-direction: column;\s*overflow-x: hidden; overflow-y: auto/,
  'long desktop lists scroll inside the side rail');
assert.match(css, /\.studio-history-item img \{[^}]*object-fit: contain/,
  'landscape thumbnails must show the entire group');
assert.match(css, /\.studio-history-item strong \{[^}]*background: transparent;[^}]*font-size: 11px/,
  'version labels stay light without a white card footer');
assert.match(css, /\.history-save-state:not\(\.is-saved\) \{ display: none;/,
  'unsaved versions do not show decorative status dots');
assert.match(css, /\.studio-history-item\.is-active \{ box-shadow: none;/,
  'selected versions do not get nested outline frames');
assert.match(css, /has-generated-output \.studio-workbench \{ height: auto;/,
  'generated content must remain in document flow above result information');
assert.match(css, /\.studio-toolbox, \.studio-insights \{[^}]*overflow-y: auto; overscroll-behavior: auto;/,
  'catalog and information panels must pass boundary scrolling to the page, including non-overflowing generated layouts');
assert.match(js, /resultDetails\.open\) \{ result.hidden = false; renderResultInfo\(\);/,
  'restored results reveal information when expanded');
console.log('Studio preview layout: OK');
