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
assert.match(css, /has-history:not\(\.has-generated-output\) \.studio-plane \{\s*align-self: stretch;/,
  'history must not collapse the idle video frame to zero height');
console.log('Studio preview layout: OK');
