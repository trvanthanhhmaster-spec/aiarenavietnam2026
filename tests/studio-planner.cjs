const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Planner = require('../assets/js/studio-planner.js');
const p = Planner.create();
assert.equal(Planner.missing(p, ''), 'event');
assert.equal(Planner.missing(p, 'school'), 'people');
assert.equal(Planner.missing(p, 'custom'), 'event', 'a custom occasion needs a real label');
p.customOccasion = 'Đi biển';
assert.equal(Planner.missing(p, 'custom'), 'people', 'custom occasions do not need a catalog row');
p.customOccasion = '';
for (const bad of [0, -1, 13, 1.5, NaN]) assert.throws(() => Planner.setCount(p, bad));
Planner.setCount(p, 2);
assert.equal(Planner.missing(p, 'school'), 'time');
p.period = Planner.period('unspecified');
assert.equal(Planner.missing(p, 'school'), 'garment');
const s = { garment: 'ao-tac', garmentVariant: 'tac-do', color: 'red', accessories: ['tote'], accessoryVariants: [] };
Planner.capture(p, s);
assert.equal(Planner.missing(p, 'school'), 'review', 'style is optional');
assert.equal(p.people[1].outfit.garment, 'ao-tac', 'shared suggestion seeds uncustomized people');
p.activePerson = 2; Planner.capture(p, { garment: 'ao-tu-than', accessories: [] });
assert.equal(p.people[0].outfit.garment, 'ao-tac');
p.activePerson = 1; Planner.capture(p, { garment: 'ao-nhat-binh', accessories: ['loafer'] });
assert.equal(p.people[1].outfit.garment, 'ao-tu-than', 'individual override survives later common changes');
p.people[1].heightCm = 170; p.people[1].name = 'Linh';
Planner.setCount(p, 3); assert.equal(p.people[1].name, 'Linh');
assert.equal(p.people[2].outfit.garment, 'ao-nhat-binh');
Planner.setCount(p, 1); assert.equal(p.people.length, 1);
Planner.setCount(p, 2); Planner.setShared(p, false, s);
p.activePerson = 2; Planner.capture(p, { garment: 'ao-tac' });
assert.equal(p.people[0].outfit.garment, 'ao-nhat-binh');
const snapshot = Planner.clone(p); p.people[1].outfit.garment = 'changed';
assert.equal(snapshot.people[1].outfit.garment, 'ao-tac', 'confirmed request is immutable');
for (const [now, nextStart, nextEnd] of [['2026-10-05T12:00:00', '2026-10-12', '2026-10-18'], ['2026-10-07T12:00:00', '2026-10-12', '2026-10-18'], ['2026-10-11T12:00:00', '2026-10-12', '2026-10-18']]) {
  const period = Planner.period('next-week', '', '', new Date(now));
  assert.equal(period.start, nextStart); assert.equal(period.end, nextEnd);
}
assert.equal(Planner.period('this-week', '', '', new Date('2026-10-11T12:00:00')).end, '2026-10-11');
assert.equal(Planner.period('next-month', '', '', new Date('2026-12-31T12:00:00')).start, '2027-01-01');
assert.throws(() => Planner.period('custom', '2026-02-30', '', new Date('2026-01-01')));
assert.throws(() => Planner.period('custom', '2026-10-05', '', new Date('2026-10-07')));
assert.throws(() => Planner.period('custom', '2026-10-09', '2026-10-08', new Date('2026-10-07')));
assert.equal(Planner.periodLabel(Planner.period('unspecified')), 'Chưa xác định');
const source = fs.readFileSync(require.resolve('../assets/js/studio.js'), 'utf8');
assert.ok(!source.includes('scheduleAutoGeneration'));
assert.ok(!source.includes('autoGenerateTimer'));
assert.ok(source.includes('currentResultSelection = Planner.clone(currentRequestSelection)'));
assert.ok(source.includes('selection: currentResultSelection'), 'saving uses confirmed selection, not mutable controls');
assert.ok(source.includes("experience.dataset.guideStep !== 'review'"));
assert.ok(!source.includes('framePlan: {'), 'new Studio never sends legacy A-E generation plans');
const start = source.indexOf('  function selectionChanged()'), end = source.indexOf('  async function generateLook(', start);
let submits = 0;
vm.runInNewContext(source.slice(start, end) + '\nselectionChanged(); selectionChanged();', {
  saveLookButton: {}, compareLooksButton: {}, resultDownload: {}, currentLookbookItems: [], syncSubmitButton() {},
  draftEdited: false, currentResultSelection: null, persistStudio() {},
  generateLook() { submits++; }, setTimeout() { throw new Error('changes must not queue AI'); }
});
assert.equal(submits, 0);
console.log('Studio planner: 4 steps, shared/individual people, resize, optional style/time, week/month boundaries, immutable snapshots and no automatic generation passed.');
