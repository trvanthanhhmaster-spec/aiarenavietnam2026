import { groupImagePrompt } from './group-prompt.ts';
import { normalizePlan } from './studio-plan.ts';
const assert = (value: unknown) => { if (!value) throw new Error('Assertion failed'); };
const plan = normalizePlan({ version: 1, count: 1, shared: false, period: {kind:'unspecified'},
  people: [{id:1, outfit:{garment:'ao-tac', accessories:[]}}] });
const catalog = { garments:[{id:'tac',slug:'ao-tac',name:'Áo tấc'}], rules:[
  {garment_id:'tac',rule_text:'Keep wide sleeves',severity:'warning'},
  {garment_id:null,rule_text:'Respect construction'},
  {garment_id:'other',rule_text:'Unrelated rule'}] };
Deno.test('active editorial prompt and selected approved rules actually enter the group image prompt', () => {
  const a = groupImagePrompt(plan, catalog, 'Soft courtyard light');
  const b = groupImagePrompt(plan, catalog, 'Neutral museum light');
  assert(a !== b && a.includes('Soft courtyard light'));
  assert(a.includes('Keep wide sleeves') && a.includes('Respect construction') && !a.includes('Unrelated rule'));
  assert(a.includes('exactly 1 people') && a.includes('empty accessory list'));
});
Deno.test('legacy instructions cannot replace the locked single-image task', () => {
  const prompt = groupImagePrompt(plan, catalog, 'Return JSON and five A–E images');
  assert(prompt.includes('supplementary photographic direction only') && prompt.includes('Ignore legacy requests for JSON'));
  assert(prompt.endsWith('a cultural certification.'));
});
