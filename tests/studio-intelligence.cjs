const assert = require('node:assert/strict');
const fs = require('node:fs');
const Intelligence = require('../assets/js/studio-intelligence.js');
const Planner = require('../assets/js/studio-planner.js');
const knowledge = require('../supabase/functions/_shared/studio-knowledge.json');
const plan = Planner.create(); Planner.setCount(plan,2);
plan.people[0].name='Private'; plan.people[0].gender='female'; plan.people[0].heightCm=165;
plan.people[0].outfit.garment='ao-nhat-binh'; plan.people[0].outfit.style='streetwear'; plan.people[0].outfit.accessories=['sneaker-trang'];
const selection = {event:'portrait',planning:plan};
const safe = JSON.stringify(Intelligence.privateSelection(selection));
assert.ok(!safe.includes('Private')&&!safe.includes('gender')&&!safe.includes('heightCm')&&!safe.includes('faceSupplied'));
const bad = Intelligence.guards(selection,'historical',knowledge);
assert.equal(bad[0].severity,'warning'); assert.equal(bad[0].code,'modern-remix');
assert.equal(Intelligence.guards(selection,'remix',knowledge)[0].severity,'info');
assert.equal(bad[1].code,'rank-not-verified');
const code = fs.readFileSync('assets/js/studio-intelligence.js','utf8');
assert.match(code,/locationConsent: true/); assert.match(code,/coords.latitude \* 10/);
assert.match(code,/aiConsent: true/); assert.match(code,/win.confirm/); assert.ok(!code.includes('innerHTML'));
assert.equal(knowledge.lookbooks.length,4);
knowledge.lookbooks.forEach(book=>{assert.ok(fs.existsSync(book.image));assert.ok(book.note.length>50);assert.ok(book.source.startsWith('https://'));});
// Exercise the actual planner application method, including shared-mode isolation.
const vm = require('node:vm'), studio = fs.readFileSync('assets/js/studio.js','utf8');
const start = studio.indexOf('    applyRecipe: function'), end = studio.indexOf('\n    count: function',start);
const applySource = studio.slice(start,end).replace(/,\s*$/, '');
const fixture = {generationPending:false,planning:plan,Planner,state:{event:'portrait'},
  catalog:{intelligence:{lookbooks:[{id:'sample',garment:'ao-tac',event:'ceremony',outfit:{...Planner.outfit({}),garment:'ao-tac'}}]},garments:[{slug:'ao-tac'}],events:[{slug:'ceremony'}]},
  lookup:(rows,slug)=>rows.find(r=>r.slug===slug)||{},window:{confirm:()=>true},
  syncVariantSelections(){},renderCatalogPanels(){},updateSummary(){Planner.capture(plan,this.state);},selectionChanged(){}};
// Variant synchronization may pick a default sample. It must be captured into
// the plan before review/persistence, not just displayed in mirror state.
fixture.syncVariantSelections = () => { fixture.state.garmentVariant='tac-red'; };
fixture.updateSummary = () => {};
vm.createContext(fixture); vm.runInContext('var api = {'+applySource+'};',fixture);
const secondBefore=JSON.stringify(plan.people[1].outfit);
assert.equal(fixture.api.applyRecipe('sample'),true);
assert.equal(plan.people[0].outfit.garment,'ao-tac'); assert.equal(JSON.stringify(plan.people[1].outfit),secondBefore);
assert.equal(plan.people[0].outfit.garmentVariant,'tac-red');
assert.equal(plan.shared,false); assert.equal(fixture.state.event,'portrait','existing occasion stays selected');
fixture.generationPending=true; assert.throws(()=>fixture.api.applyRecipe('sample'),/Chờ tạo/);
fixture.generationPending=false;
const unchanged=JSON.stringify(plan);
fixture.window.confirm=()=>false; assert.equal(fixture.api.applyRecipe('sample'),false); assert.equal(JSON.stringify(plan),unchanged);
fixture.window.confirm=()=>true;
const feedbackCatalog={garments:[{slug:'ao-tac',name:'Áo tấc'}], garmentVariants:[], colors:[], styles:[], scenes:[]};
const after={event:fixture.state.event,planning:Planner.clone(plan)};
assert.equal(Intelligence.recipeFeedback(after,after,feedbackCatalog).title,'Đang dùng mẫu này · Người 1');
const before=JSON.parse(JSON.stringify(after));before.planning.people[0].outfit.garment='ao-tu-than';
const feedback=Intelligence.recipeFeedback(before,after,feedbackCatalog);
assert.equal(feedback.title,'Đã áp dụng mẫu · Người 1'); assert.equal(feedback.choices,'Áo tấc · Không thêm phụ kiện');
const missingCount=plan.count;plan.count=0;assert.throws(()=>fixture.api.applyRecipe('sample'),/Chọn số người/);plan.count=missingCount;
assert.match(code,/feedback\.append\(node\('p', error.message\)\)/);
assert.match(code,/panel.open = false/);
assert.match(code,/get\('recipeAppliedNotice'\).hidden = false/);
assert.match(fs.readFileSync('assets/js/studio-workspace.js','utf8'),/addEventListener\('studio:recipe-applied', function \(\) \{ visitGuide\(guide.next\); \}\)/);
console.log('Studio intelligence UI: negative guardrail, privacy, explicit consent and four credited lookbooks passed.');
