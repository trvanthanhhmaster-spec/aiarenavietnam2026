const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// CSS contract regression checks, not a substitute for browser screenshots.
// The mobile controller must not composite a backdrop blur over video, even
// for the hidden desktop hover layer or the collapsed reset button.
const css = fs.readFileSync(path.join(__dirname, '../assets/css/app.css'), 'utf8');
const start = css.indexOf('@media (max-width:700px){');
const end = css.indexOf('/* Short phones:', start);
assert.ok(start >= 0 && end > start);
const mobile = css.slice(start, end);
function rule(selector) {
  const index = mobile.indexOf(selector + '{');
  assert.ok(index >= 0, 'missing mobile rule ' + selector);
  return mobile.slice(index, mobile.indexOf('}', index));
}
for (const selector of ['.track', '.capsule']) {
  const declarations = rule(selector);
  assert.match(declarations, /-webkit-backdrop-filter:\s*none;/);
  assert.match(declarations, /(?:^|;)\s*backdrop-filter:\s*none;/);
  assert.ok(!declarations.includes('blur('));
}
assert.match(rule('.track'), /height:\s*100%;/, 'surface follows dynamic branch rows');
assert.match(rule('.track'), /overflow:\s*hidden;/);
assert.match(rule('.track'), /box-shadow:\s*inset[^;]*;/, 'no outward shadow on mobile');
assert.match(rule('.capsule'), /box-shadow:\s*none;/);
assert.match(rule('.capsule'), /visibility:\s*hidden;/);
assert.match(rule('.controller.collapsed .capsule'), /visibility:\s*visible;/);
assert.ok(!rule('.controller.collapsed .capsule').includes('blur('));
assert.match(css.slice(0, start), /backdrop-filter:\s*blur\(9px\)/, 'desktop glass remains unchanged');
console.log('Mobile controller CSS contract: no backdrop blur/outer shadow, hidden hover layer, reset visibility and desktop glass passed.');
