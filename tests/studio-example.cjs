const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source=fs.readFileSync('assets/js/studio-example.js','utf8');
function boot(hash='') {
  const events={},links={},example={open:false,scrolls:0,scrollIntoView(){this.scrolls++},addEventListener(k,fn){events[k]=fn}};
  const proof=JSON.parse(fs.readFileSync('assets/data/audition-proof.json'));
  const data={textContent:JSON.stringify({selection:proof.selection,output:{reviewStatus:proof.reviewStatus,imageAssessment:proof.assessment},catalog:{}})};
  const panel={},ids={studioExample:example,studioExampleAssessment:panel,studioExampleData:data};
  let renders=0;
  const selection=Object.freeze({event:'street',garment:'ao-tu-than'});
  const context={document:{getElementById:id=>ids[id],querySelectorAll:()=>[{addEventListener(k,fn){links[k]=fn}}]},
    window:{location:{hash},addEventListener(k,fn){events[k]=fn},VRemixAssessment:{build(s,o,c){assert.equal(s.planning.people[0].outfit.garment,'ao-tac');return {status:'matched'}},render(){renders++}}},
    fetch(){throw new Error('Opening an example must never call an endpoint')},userSelection:selection};
  vm.runInNewContext(source,context);
  return {example,events,links,context,renders:()=>renders,selection};
}
const normal=boot();assert.equal(normal.example.open,false);assert.equal(normal.renders(),0,'collapsed example renders lazily');
normal.links.click();assert.equal(normal.example.open,true);assert.equal(normal.renders(),1);
normal.events.toggle();assert.equal(normal.renders(),1,'reopening never repeats work or starts AI');
normal.example.open=false;normal.links.click();assert.equal(normal.example.open,true,'same-hash click still reopens');
assert.deepEqual(normal.context.userSelection,normal.selection,'sample must not change active draft');
const deep=boot('#studioExample');assert.equal(deep.example.open,true);assert.equal(deep.example.scrolls,1);assert.equal(deep.renders(),1);
const other=boot('#studioStage');assert.equal(other.example.open,false);
other.context.window.location.hash='#studioExample';other.events.hashchange();assert.equal(other.example.open,true);
console.log('Studio example: inline reveal, deep link, lazy one-time render, same-hash reopen and no endpoint/draft changes passed.');
