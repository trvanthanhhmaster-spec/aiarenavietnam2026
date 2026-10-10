// Offline display contract; fixtures do not prove model accuracy on real images.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const Assessment = require('../assets/js/studio-assessment.js');
const knowledge = JSON.parse(fs.readFileSync('supabase/functions/_shared/studio-knowledge.json'));
const garments = Object.keys(knowledge.heritage);
const catalog = { garments: garments.map(slug => ({slug,name:slug})), colors:[{slug:'red',label:'Đỏ'}], accessories:[{id:'bag',slug:'tote',name:'Tote'}], accessoryVariants:[{slug:'tote-be',accessory_id:'bag',name:'Tote be'}], intelligence:{heritage:knowledge.heritage} };
const selection = {event:'ceremony',planning:{count:4,people:garments.map((garment,i)=>({id:i+1,outfit:{garment,color:'red',accessories:i===1?['tote']:[],accessoryVariants:i===1?['tote-be']:[]}}))}};
function output() { return {reviewStatus:'completed',imageAssessment:{source:'ai-image-review',status:'matched',observedPeopleCount:4,
  people:selection.planning.people.map(p=>({personId:p.id,checks:{garment:'match',color:'match',accessories:'match',scene:'match'}})),
  constructionChecks:selection.planning.people.map(p=>({personId:p.id,status:'match',reason:'Phom dáng và đặc trưng nhìn thấy khớp mẫu.'}))}}; }
assert.equal(Assessment.build(selection,output(),catalog).status,'matched');
let value=output();value.imageAssessment.people[1].checks.color='mismatch';
let report=Assessment.build(selection,value,catalog);
assert.equal(report.status,'mismatch');assert.equal(report.groups[1].rows.find(r=>r.field==='color').status,'mismatch');
assert.equal(report.groups[0].rows.find(r=>r.field==='color').status,'match','another person must not inherit the mismatch');
assert.equal(report.groups[1].rows.find(r=>r.field==='accessories').expected,'Tote be','concrete accessory sample retained');
value=output();value.imageAssessment.constructionChecks[1]={personId:2,status:'uncertain',reason:'Tay áo bị che nên chưa thể xác nhận độ rộng.'};
assert.equal(Assessment.build(selection,value,catalog).status,'uncertain');
value=output();value.imageAssessment.constructionChecks=[];
assert.equal(Assessment.build(selection,value,catalog).status,'uncertain','missing structure cannot pass');
value=output();value.imageAssessment.people[0].checks.garment='not-requested';
assert.equal(Assessment.build(selection,value,catalog).status,'uncertain','required garment cannot be waived');
value=output();value.imageAssessment.observedPeopleCount=3;
assert.equal(Assessment.build(selection,value,catalog).status,'mismatch');
value=output();value.imageAssessment.people[1]=value.imageAssessment.people[0];
assert.equal(Assessment.build(selection,value,catalog).status,'uncertain','duplicate assignments cannot pass');
value=output();delete value.imageAssessment.observedPeopleCount;
assert.equal(Assessment.build(selection,value,catalog).status,'uncertain');
value=output();value.reviewStatus='provider-session-expired';
assert.equal(Assessment.build(selection,value,catalog).status,'not-assessed','failed review must not reuse pass data');
value=output();delete value.imageAssessment.source;
assert.equal(Assessment.build(selection,value,catalog).status,'not-assessed','legacy unsupported pass is not proof');
assert.equal(Assessment.build(null,output(),catalog).groups.length,0);
assert.ok(report.groups.every(g=>g.structure&&g.sources.length),'all four garments carry claim-scoped sources');
function node(tag) { return {tag,children:[],hidden:false,append(...children){this.children.push(...children)},appendChild(child){this.children.push(child)},replaceChildren(){this.children=[]}}; }
const doc={createElement:node},container=node('section');
value=output();value.imageAssessment.constructionChecks[0].reason='<img src=x onerror=alert(1)> hidden sleeve';
Assessment.render(container,Assessment.build(selection,value,catalog),doc);
function flatten(n){return [n,...n.children.flatMap(flatten)]}
const nodes=flatten(container);
assert.equal(nodes.filter(n=>n.tag==='table').length,4);
assert.ok(nodes.some(n=>n.textContent===value.imageAssessment.constructionChecks[0].reason),'untrusted text remains text');
assert.equal(nodes.filter(n=>n.tag==='img').length,0,'model text cannot inject an image');
const malicious=structuredClone(catalog);malicious.intelligence.heritage[garments[0]].sources[0].url='javascript:alert(1)';
assert.equal(Assessment.build(selection,output(),malicious).groups[0].sources.length,0);
const proof=JSON.parse(fs.readFileSync('assets/data/audition-proof.json'));
assert.equal(Assessment.build(proof.selection,{reviewStatus:proof.reviewStatus,imageAssessment:proof.assessment},catalog).status,'matched');
const crypto=require('node:crypto');assert.equal(crypto.createHash('sha256').update(fs.readFileSync(proof.image)).digest('hex'),proof.imageSha256,'public image must be unchanged original');
assert.equal(proof.scope.expertCertified,false);assert.equal(proof.scope.allCatalogValidated,false);
console.log('Assessment: four garments, separate people, mismatch, occlusion, incomplete/failed/legacy review, safe sources/text and original production evidence passed offline.');
