const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const Choices = require('../assets/js/studio-catalog-choices.js');
const catalog = {
  garments: [{id:'tac',slug:'ao-tac',name:'Áo tấc',default_colors:['red']}, {id:'tu',slug:'tu-than',default_colors:['green']}],
  garmentVariants: [{garment_id:'tac',slug:'tac-red',name:'Áo tấc đỏ',pattern_notes:'Trơn',color_palette:['red','ivory'],image_url:'assets/media/catalog/garment-ao-tac.webp',source_url:'https://commons.wikimedia.org/?curid=1'}, {garment_id:'tu',slug:'tu-green',name:'Tứ thân',color_palette:['green']}],
  colors: ['red','green','ivory','old'].map(slug => ({slug,label:slug})),
  scenes: [{slug:'temple'}], patterns:[{slug:'cloud',label:'Vân mây'}]
};
assert.deepEqual(Choices.samples(catalog,'ao-tac').map(x=>x.slug), ['tac-red']);
assert.deepEqual(Choices.samples(catalog,'missing'), []);
assert.deepEqual(Choices.colors(catalog,'ao-tac','').map(x=>x.slug), ['red','ivory']);
assert.deepEqual(Choices.colors(catalog,'tu-than','').map(x=>x.slug), ['green']);
const retained = Choices.colors(catalog,'ao-tac','old').find(x=>x.slug==='old');
assert.equal(retained.legacyOverride,true);
assert.equal(catalog.colors[3].legacyOverride,undefined,'rendering must not mutate shared catalog');
const state = {garment:'ao-tac',garmentVariant:'tac-red',color:'old',pattern:'cloud'};
assert.equal(Choices.selectSample(state,catalog,'tu-green'),false,'reject a child sample of another garment');
assert.equal(state.color,'old');
assert.equal(Choices.selectSample(state,catalog,'tac-red'),true);
assert.equal(state.color,''); assert.equal(state.pattern,'');
assert.equal(Choices.sourceUrl('javascript:alert(1)'), '');
assert.equal(Choices.sourceUrl('https://commons.wikimedia.org/?curid=1'),'https://commons.wikimedia.org/?curid=1');
for (const scene of ['campus','old-quarter','temple','citadel','studio']) assert.ok(fs.existsSync(Choices.sceneImage(scene)));
assert.equal(Choices.sceneImage('unknown'),'');

// Exercise the actual renderer, including source escaping and one/zero-sample states.
const source = fs.readFileSync('assets/js/studio.js','utf8');
function extract(name,next) { return source.slice(source.indexOf('  function '+name+'('),source.indexOf('  function '+next+'(')); }
const context = { CatalogChoices: Choices, catalog, state, lookup:(rows,slug)=>(rows||[]).find(row=>row.slug===slug)||{} };
vm.createContext(context);
vm.runInContext(extract('variantsForGarment','variantsForAccessories')+extract('escapeHtml','buildHotspots')+extract('catalogImageUrl','renderInspirationStrip')+extract('variantCards','renderVariantPanels'),context);
let html = context.garmentSampleCards();
assert.match(html,/Ảnh|Mẫu/); assert.match(html,/data-option-value="tac-red"/);
assert.match(html,/Xem nguồn ảnh/); assert.ok(!html.includes('tu-green'));
catalog.garmentVariants[0].source_url='javascript:alert(1)';
assert.ok(!context.garmentSampleCards().includes('href="javascript:'));
context.state.garment='missing'; assert.match(context.garmentSampleCards(),/Chưa có mẫu/);
const markup = fs.readFileSync('studio.php','utf8');
assert.match(markup,/<details class="studio-scene-customize">/,'background override is closed by default');
assert.ok(!markup.includes('Chọn nơi xuất hiện'));
assert.ok(!/kind: 'pattern', items: catalog.patterns/.test(source),'no shared generic motif strip');
assert.match(source,/if \(kind === 'scene'\) planning.people.forEach/,'one image background is applied to all people');
assert.ok(markup.includes('studio-catalog-choices.js'));
console.log('Studio catalog choices: garment-scoped references and colors, retained overrides, atomic sample reset, source escaping, real scene assets, optional shared background passed.');
