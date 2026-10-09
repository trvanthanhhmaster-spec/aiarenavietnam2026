const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Planner = require('../assets/js/studio-planner.js');
const source = fs.readFileSync('assets/js/studio.js', 'utf8');
const start = source.indexOf('  function renderResultInfo()');
const end = source.indexOf('  var resultDetails', start);
function node() {
  return { children: [], parentElement: {}, textContent: '',
    append(...children) { this.children.push(...children); },
    appendChild(child) { this.children.push(child); },
    replaceChildren() { this.children = []; } };
}
const ids = Object.fromEntries(['resultSelectionInfo', 'resultStory', 'resultGuardrail', 'resultGenZTip','resultVerification','resultCopySource'].map(id => [id, node()]));
const plan = Planner.create(); Planner.setCount(plan, 1);
plan.period = Planner.period('unspecified'); plan.customOccasion = 'Đi biển';
plan.people[0].outfit.garment = 'ao';
const context = { Planner, currentResultSelection: { event: 'custom', planning: plan },
  currentOutput: {}, resultCulturalScore: node(), catalog: { garments: [{ slug: 'ao', name: 'Áo ngũ thân' }], garmentVariants: [] },
  selectedEvent: (_, p) => ({ label: p.customOccasion }),
  lookup: (items, slug) => items.find(item => item.slug === slug) || {},
  document: { getElementById: id => ids[id], createElement: node } };
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('  function resultChoiceRows('), source.indexOf('  function requireImageOutput(')), context);
vm.runInContext(source.slice(start, end), context);
context.renderResultInfo();
const rows = () => ids.resultSelectionInfo.children.map(group => group.children.map(child => child.textContent).join(': '));
assert.deepEqual(rows(), ['Dịp mặc: Đi biển', 'Số người: 1 người', 'Thời gian: Chưa xác định', 'Người 1: Áo ngũ thân · Phụ kiện: Không thêm']);
assert.equal(ids.resultStory.parentElement.hidden, true, 'empty cultural content stays hidden');
assert.equal(context.resultCulturalScore.parentElement.hidden, true);
context.currentResultSelection.planning.period = { kind: 'custom' };
context.renderResultInfo();
assert.equal(rows()[2], 'Thời gian: Chưa xác định', 'incomplete legacy dates must not crash information');
context.currentResultSelection = { event: 'custom', garment: 'ao' };
context.renderResultInfo();
assert.ok(rows().some(row => row.startsWith('Người 1: Áo ngũ thân')), 'legacy single looks retain outfit information');
context.currentOutput={culturalScore:0,culturalScoreSource:'gemini-selection-assessment',copySource:'gemini',imageAssessment:{status:'mismatch'}};
context.renderResultInfo();assert.equal(context.resultCulturalScore.parentElement.hidden,false);assert.match(context.resultCulturalScore.textContent,/0\/100/);
assert.match(ids.resultVerification.textContent,/chưa khớp/);
context.catalog.colors=[{slug:'red',label:'Đỏ son'}];context.catalog.accessories=[{slug:'tote',name:'Tote',id:'bag'}];
const custom=Planner.create();Planner.setCount(custom,1);custom.period=Planner.period('unspecified');custom.people[0].outfit={...custom.people[0].outfit,garment:'ao',color:'red',accessories:[]};
const repaired=context.safeCatalogCopy({copySource:'catalog-fallback',story:'Sneaker Tote not selected',culturalScore:100},{event:'custom',planning:custom});
assert.match(repaired.story,/Đỏ son/);assert.ok(!repaired.story.includes('Sneaker'));assert.equal(repaired.culturalScore,null);
console.log('Studio result information: snapshot rows, legacy looks, safe dates and absent content passed.');
