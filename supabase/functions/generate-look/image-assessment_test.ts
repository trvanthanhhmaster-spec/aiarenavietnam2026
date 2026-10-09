import { imageDimensions, parseImageAssessment } from './image-assessment.ts';
import { normalizePlan } from './studio-plan.ts';
const plan = normalizePlan({version:1,count:2,shared:false,period:{kind:'unspecified'},people:[
  {id:1,outfit:{garment:'ao-tac',garmentVariant:'red'}},{id:2,outfit:{garment:'ao-tu-than',color:'green',scene:'temple'}}]});
function assert(value: unknown) { if (!value) throw new Error('Assessment assertion'); }
function fixture() { return {observedPeopleCount:2,people:[1,2].map(personId=>({personId,checks:{garment:'match',variant:'match',color:'match',pattern:'match',accessories:'match',scene:'match'}}))}; }
Deno.test('vision status is derived from count and requested per-person checks',()=>{
  const value=fixture(); assert(parseImageAssessment(value,plan).status==='matched');
  value.people[1].checks.color='mismatch'; assert(parseImageAssessment(value,plan).status==='mismatch');
  value.people[1].checks.color='uncertain'; assert(parseImageAssessment(value,plan).status==='uncertain');
  value.observedPeopleCount=3; assert(parseImageAssessment(value,plan).status==='mismatch');
});
Deno.test('missing or duplicate assignment cannot certify an image',()=>{
  for (const broken of [{}, {...fixture(),people:[fixture().people[0],fixture().people[0]]}, {...fixture(),people:[]}]) {
    let rejected=false;try{parseImageAssessment(broken,plan);}catch{rejected=true;}assert(rejected);
  }
});
Deno.test('unrequested choices are not evaluated; variant color still must be checked',()=>{
  const value=fixture(); value.people[0].checks.scene='mismatch';
  assert(parseImageAssessment(value,plan).status==='matched');
  assert(parseImageAssessment(value,plan,true).status==='mismatch');
  value.people[0].checks.color='uncertain';assert(parseImageAssessment(value,plan).status==='uncertain');
});
Deno.test('dimensions reflect image bytes rather than requested resolution',()=>{
  const header=new Uint8Array(24);header.set([137,80,78,71,13,10,26,10],0);header.set([73,72,68,82],12);
  new DataView(header.buffer).setUint32(16,1376);new DataView(header.buffer).setUint32(20,768);
  const value=imageDimensions(btoa(String.fromCharCode(...header)));assert(value?.width===1376&&value?.height===768);
  assert(imageDimensions('invalid')===null);
});
Deno.test('wrong wide sleeves overrides a claimed overall pass; occlusion remains uncertain', () => {
  const value = {...fixture(), constructionChecks: [{personId:1,status:'mismatch',reason:'Áo tấc đang có tay chẽn thay vì tay rộng.'}, {personId:2,status:'match',reason:'Các vạt áo tứ thân vẫn nhìn thấy rõ.'}]};
  const result = parseImageAssessment(value, plan, true, true);
  assert(result.status === 'mismatch'); assert(result.people?.[0].checks.garment === 'mismatch');
  value.constructionChecks[0].status = 'uncertain'; assert(parseImageAssessment(value, plan, true, true).status === 'uncertain');
  let rejected = false; try { parseImageAssessment(fixture(), plan, true, true); } catch { rejected = true; } assert(rejected);
});
