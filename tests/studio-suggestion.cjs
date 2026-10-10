const assert = require('node:assert/strict');
const fs = require('node:fs');
const {build} = require('../assets/js/studio-suggestion.js');
const c = {events:[{slug:'ceremony',label:'Dự lễ'}], garments:[{id:'g',slug:'tac',name:'Áo tấc',image_url:'assets/tac.png'}],
  garmentVariants:[{garment_id:'g',slug:'sample',name:'Mẫu đỏ',source_url:'https://example.com/source'}],
  accessories:[{slug:'tote',name:'Tote'}],colors:[{slug:'blue',label:'Xanh'}],styles:[],patterns:[],scenes:[],
  intelligence:{heritage:{tac:{origin:'Nguồn gốc',meaning:'Ý nghĩa',structure:'Tay rộng',sources:[{publisher:'Huế',url:'https://example.com/heritage'}]}}}};
const s = {event:'ceremony',planning:{count:2,people:[{id:1,name:'private name',faceImage:'private pixels',outfit:{garment:'tac',garmentVariant:'sample',color:'blue',accessories:[]}},
  {id:2,outfit:{garment:'tac',accessories:['tote']}}]}};
const before = JSON.stringify(s), model = build(s,c);
assert.equal(model.people.length,2); assert.equal(model.people[0].origin,'Nguồn gốc');
assert.deepEqual(model.people[0].choices,['Màu: Xanh','Phụ kiện: Không thêm phụ kiện']);
assert.deepEqual(model.people[1].choices,['Phụ kiện: Tote']);
assert.equal(JSON.stringify(s),before,'read-only result never changes the plan');
assert.ok(!JSON.stringify(model).includes('private'));
assert.throws(()=>build({...s,event:''},c));
assert.throws(()=>build(s,{...c,garments:[]}));
assert.throws(()=>build(s,{...c,garmentVariants:[{slug:'sample',garment_id:'wrong'}]}));
const js = fs.readFileSync('assets/js/studio-suggestion.js','utf8');
assert.doesNotMatch(js,/fetch\(|localStorage|sessionStorage|\.persist\(|generateLook\(/,'suggestion view cannot consume quota or overwrite saved AI output');
const html = fs.readFileSync('studio.php','utf8');
assert.match(html,/data-show-suggestion/); assert.match(html,/pas d'image AI|không phải ảnh AI/);
console.log('Suggestion result: per-person selections, sourced heritage, no invented image/score, no faces, no provider or persistence writes.');
