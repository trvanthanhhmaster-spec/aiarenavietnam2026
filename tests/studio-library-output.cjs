const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('assets/js/studio.js','utf8');
const start = source.indexOf('    async openLook(look) {');
const end = source.indexOf('\n    async start()',start);
let opened;
const original = {story:'Original saved version',guardrail:'Original guidance',genZTip:'Original tip'};
const context = {draftEdited:false,collectionReady:true,generationPending:false,
  readActiveJob:()=>null,persistStudio:async()=>{},
  catalog:{historyEndpoint:'/history',lookCsrf:'fixture'},
  window:{VRemixSession:{retry:async()=>{}}},
  collections:{list:()=>[{id:'collection',record:{jobId:'job'}}]},
  experience:{resultsApi:{open:look=>{opened=look;}}},
  fetch:async()=>({ok:true,json:async()=>({items:[{jobId:'job',output:original},{jobId:'other',output:{story:'Other version'}}]})}),
  Date,encodeURIComponent};
vm.createContext(context);
vm.runInContext('var api = { open:async()=>{},\n'+source.slice(start,end)+'\n};',context);
(async()=>{
  await context.api.openLook({id:'saved',generation_job_id:'job',image_url:'/fixture.png',selection:{}});
  assert.equal(opened.output.story,original.story);
  assert.equal(opened.output.guardrail,original.guardrail);
  assert.equal(opened.output.genZTip,original.genZTip);
  console.log('Saved library: restore matching version copy without another version overwriting it passed.');
})().catch(error=>{console.error(error);process.exitCode=1;});
