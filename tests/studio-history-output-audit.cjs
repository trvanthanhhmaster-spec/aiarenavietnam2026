// Regression: history-open preserves original copy and refreshes the image URL only.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Planner = require('../assets/js/studio-planner.js');
const source = fs.readFileSync('assets/js/studio.js', 'utf8');
const start = source.indexOf('    open: function (look, edit) {', source.indexOf('  experience.resultsApi ='));
const end = source.indexOf('\n    persist: persistStudio', start);
assert.ok(start >= 0 && end > start);
let displayed;
const context = { Planner, generationPending: false, createRequestId: () => 'fixture',
  applyOutput: output => { displayed = output; }, saveLookButton: {}, setStatus() {},
  persistStudio() {}, notifyHistory() {}, window: { innerHeight: 900 },
  document: { querySelector: () => ({ getBoundingClientRect: () => ({ top: 20, bottom: 600 }) }) } };
vm.createContext(context);
vm.runInContext('var api = {\n' + source.slice(start, end) + '\n};', context);
context.api.open({ saved: false, jobId: 'fixture', image_url: '/fixture.png',
  selection: { event: 'ceremony', planning: Planner.create() },
  output: { story: 'Original story', guardrail: 'Original cultural guidance', genZTip: 'Original styling' }
}, false);
assert.equal(displayed.story, 'Original story');
assert.equal(displayed.guardrail, 'Original cultural guidance');
assert.equal(displayed.genZTip, 'Original styling');
assert.equal(displayed.lookbook.items[0].url, '/fixture.png');
context.api.open({ saved: true, id: 'legacy', image_url: '/legacy.png', selection: { event: 'ceremony', planning: Planner.create() } }, false);
assert.equal(displayed.story, undefined, 'legacy records must not fabricate a cultural story');
console.log('History result copy: original story/guardrail/tip preserved; fresh URLs and empty legacy copy passed.');
