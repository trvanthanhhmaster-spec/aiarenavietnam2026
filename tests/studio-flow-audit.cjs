const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Planner = require('../assets/js/studio-planner.js');
const source = fs.readFileSync('assets/js/studio.js', 'utf8');
function fn(name, next) {
  const start = source.indexOf('  function ' + name + '(');
  return source.slice(start, source.indexOf(next, start));
}
const catalog = Object.fromEntries(['events', 'garments', 'garmentVariants', 'colors', 'patterns', 'styles', 'scenes', 'accessories', 'accessoryVariants'].map(k => [k, []]));
catalog.events = [{ slug: 'school' }]; catalog.garments = [{ slug: 'ao-tac' }, { slug: 'ao-tu-than' }];
const plan = Planner.create(); Planner.setCount(plan, 2); plan.period = Planner.period('unspecified');
Planner.capture(plan, { garment: 'ao-tac', accessories: ['tote'] });
plan.activePerson = 2; Planner.capture(plan, { garment: 'ao-tu-than', color: '', accessories: [] });
let catalogRenders = 0;
const context = { Planner, planning: null, state: { locks: {} }, catalog,
  lookup(items, slug) { return (items || []).find(i => i.slug === slug) || {}; },
  selectedEvent(slug) { return catalog.events.find(i => i.slug === slug) || {}; },
  syncVariantSelections() { context.state.garmentVariant = context.state.garment ? context.state.garment + '-variant' : ''; }, updateSummary() {}, renderCatalogPanels() { catalogRenders++; }, canvasAspect: null, targetResolution: null, generationMode: null };
vm.createContext(context);
vm.runInContext(fn('restoreSelection', '  function prepareResultCopy'), context);
context.restoreSelection({ event: 'school', garment: 'ao-tac', accessories: ['tote'], planning: plan });
assert.equal(context.state.garment, 'ao-tu-than', 'restore the active person, not Person 1 summary fields');
assert.equal(catalogRenders, 1, 'restored choices also update the visible checked cards');
assert.equal(context.planning.people[0].outfit.garment, 'ao-tac');
assert.equal(context.planning.people[1].outfit.garmentVariant, 'ao-tu-than-variant', 'displayed variant and per-person request stay synchronized');
assert.equal(plan.activePerson, 2, 'restoration never mutates the saved record');
context.restoreSelection({ event: 'school', garment: 'ao-tac' });
assert.equal(context.planning.count, 1, 'legacy single looks gain an editable planner');
assert.equal(context.state.garment, 'ao-tac');
context.restoreSelection({ event: '', planning: Planner.create() });
assert.equal(context.state.event, ''); assert.equal(context.state.garment, '', 'empty drafts must clear old controls');
vm.runInContext(fn('requireImageOutput', '  function applyOutput'), context);
for (const output of [undefined, {}, { lookbook: { items: [] } }, { lookbook: { items: [{ url: '' }] } }]) {
  assert.throws(() => context.requireImageOutput(output), /chưa trả ảnh/);
}
assert.doesNotThrow(() => context.requireImageOutput({ lookbook: { items: [{ url: 'fixture.png' }] } }));
const ui = fs.readFileSync('assets/js/studio-planner-ui.js', 'utf8');
const profileStart = ui.indexOf('  function commitProfile()'), profileEnd = ui.indexOf('  function render()', profileStart);
let writes = 0;
const nodes = { personName: { value: 'Linh' }, personHeight: { value: '1' }, personWeight: { value: '' }, personGender: { value: '' } };
const p = { name: 'Linh', heightCm: null, weightKg: null };
const profile = { id: k => nodes[k], api: { get: () => ({ people: [p], activePerson: 1 }), profile(name, h) {
  writes++; if (Number(h) < 50) throw new Error('invalid'); p.heightCm = Number(h);
} }, action(callback) { try { callback(); return true; } catch { return false; } } };
vm.createContext(profile); vm.runInContext(ui.slice(profileStart, profileEnd), profile);
assert.equal(profile.commitProfile(), false, 'invalid profile blocks Continue instead of using stale values');
nodes.personHeight.value = '170'; assert.equal(profile.commitProfile(), true);
assert.equal(profile.commitProfile(), true); assert.equal(writes, 2, 'unchanged valid fields do not trigger another render');
assert.match(ui, /stopImmediatePropagation/);
const library = fs.readFileSync('assets/js/studio-library.js', 'utf8');
assert.match(library, /version !== loadVersion \|\| !dialog.open/);
assert.match(library, /openImage.disabled = true/);
assert.match(source, /!look.image_url && !edit/);
assert.match(source, /editable.planning = Planner.restore\(editable\)/);
const css = fs.readFileSync('assets/css/studio-workspace.css', 'utf8');
assert.match(css, /\[data-guide-step='review'\] \.studio-toolbox \{ height: auto; overflow: visible;/);
assert.match(css, /\[data-guide-step='review'\] #plannerGenerate \{ position: static;/);
console.log('Studio flow audit: active-person restore, legacy/empty drafts, invalid profile, missing outputs and unavailable library media passed.');
