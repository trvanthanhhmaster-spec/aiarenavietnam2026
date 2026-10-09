import { normalizePlan, planPrompt } from './studio-plan.ts';
import { buildImageRequest } from './image-request.ts';
const assert = (v: unknown) => { if (!v) throw new Error('Assertion failed'); };
const base = () => ({ version: 1, count: 2, shared: false, period: { kind: 'unspecified', start: '', end: '' }, occasionNote: 'Chụp kỷ yếu',
  people: [{ id: 1, name: 'A', outfit: { garment: 'ao-tac', accessories: ['tote'] } }, { id: 2, outfit: { garment: 'ao-tu-than' } }] });
const catalog = { garments: [{ id: 'g1', slug: 'ao-tac', name: 'Áo tấc', prompt_descriptor: 'wide sleeves' }, { id: 'g2', slug: 'ao-tu-than', name: 'Áo tứ thân' }],
  garmentVariants: [], accessories: [{ id: 'a1', slug: 'tote', name: 'Túi tote' }], accessoryVariants: [], options: [] };
function rejects(value: unknown) { let rejected = false; try { normalizePlan(value); } catch { rejected = true; } assert(rejected); }
Deno.test('optional gender stays per person, supports legacy metadata and rejects arbitrary text', () => {
  assert(normalizePlan(base()).people[0].gender === '');
  const input = base() as any; input.people[0].gender = 'female'; input.people[1].gender = 'other';
  const plan = normalizePlan(input);
  assert(plan.people[0].gender === 'female' && plan.people[1].gender === 'other');
  const prompt = planPrompt(plan, catalog);
  assert(prompt.includes('"gender":"female"') && prompt.includes('"gender":"other"'));
  assert(prompt.includes('never infer it from names') && prompt.includes('Áo tấc'));
  for (const gender of ['invalid', 1, ['male']]) { input.people[0].gender = gender; rejects(input); }
  input.people[0].gender = ''; assert(planPrompt(normalizePlan(input), catalog).includes('"gender":null'));
});
Deno.test('group plan validates count, person IDs, dates, measurements and garments', () => {
  const p = normalizePlan(base()); assert(p.count === 2); assert(p.people[1].outfit.style === '');
  rejects({ ...base(), count: 0 }); rejects({ ...base(), count: 13 }); rejects({ ...base(), count: 1.5 });
  rejects({ ...base(), people: [{ id: 1, outfit: { garment: 'ao-tac' } }] });
  rejects({ ...base(), period: { kind: 'custom', start: '2026-02-30', end: '2026-03-01' } });
  rejects({ ...base(), period: { kind: 'custom', start: '2026-10-10', end: '2026-10-09' } });
  const bad = base() as any; bad.people[1].heightCm = 400; rejects(bad);
  bad.people[1].heightCm = null; bad.people[1].outfit.garment = ''; rejects(bad);
});
Deno.test('group prompt resolves each approved outfit and rejects unpublished or mismatched variants', () => {
  const p = normalizePlan(base()); const prompt = planPrompt(p, catalog);
  assert(prompt.includes('exactly 2 people')); assert(prompt.includes('Áo tấc')); assert(prompt.includes('Áo tứ thân')); assert(prompt.includes('No collage')); assert(prompt.includes('NOT live weather'));
  const bad = structuredClone(p); bad.people[1].outfit.garmentVariant = 'invalid';
  let rejected = false; try { planPrompt(bad, catalog); } catch { rejected = true; } assert(rejected);
});
Deno.test('source face pixels and unknown fields are not retained in normalized metadata', () => {
  const b = base() as any; b.people[0].faceImage = 'secret-pixels'; b.people[0].faceSupplied = true; b.inputImage = 'secret-pixels';
  const p = normalizePlan(b); assert(!JSON.stringify(p).includes('secret-pixels'));
  const request = buildImageRequest(planPrompt(p, catalog), 'Group photo', { mimeType: 'image/jpeg', data: 'reference' }, { operation: 'group' });
  assert(request.contents[0].parts[0].text.includes('not the output composition'));
  assert(!request.contents[0].parts[0].text.includes('establish one stable subject'));
});
Deno.test('custom occasions survive validation as preferences without becoming catalog facts', () => {
  const p = normalizePlan({ ...base(), customOccasion: 'Đi biển' });
  assert(p.customOccasion === 'Đi biển');
  const prompt = planPrompt(p, catalog);
  assert(prompt.includes('Đi biển') && prompt.includes('not reviewed cultural knowledge'));
  rejects({ ...base(), customOccasion: 'x' });
  rejects({ ...base(), customOccasion: { label: 'Đi biển' } });
});
