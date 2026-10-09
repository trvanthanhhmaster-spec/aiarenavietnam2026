// Regression cases from the selection audit. No provider calls or pixel claims.
import { fallbackCopy } from '../supabase/functions/generate-look/fallback-copy.ts';
import { normalizePlan, planPrompt } from '../supabase/functions/generate-look/studio-plan.ts';
const catalog = {
  event: { label: 'Dự lễ' }, garment: { name: 'Áo tấc', slug: 'ao-tac' },
  garmentVariant: { name: 'Áo tấc đỏ son', color_palette: ['red'] },
  garments: [{ id: 'g1', slug: 'ao-tac', name: 'Áo tấc' }, { id: 'g2', slug: 'ao-tu-than', name: 'Áo tứ thân' }],
  garmentVariants: [], accessoryVariants: [],
  accessories: [{ id: 'a1', slug: 'tote', name: 'Tote canvas be' }, { id: 'a2', slug: 'sneaker', name: 'Sneaker trắng' }], options: [],
};
const plan = normalizePlan({ version: 1, count: 2, shared: false, period: { kind: 'unspecified' },
  people: [{ id: 1, outfit: { garment: 'ao-tac', accessories: [] } }, { id: 2, outfit: { garment: 'ao-tu-than', accessories: ['tote'] } }] });
const fallback = fallbackCopy({ garmentSlug: 'ao-tac', accessorySlugs: [], planning: plan }, catalog);
if (fallback.story.includes('Sneaker trắng') || !fallback.story.includes('Áo tứ thân') || !fallback.story.includes('không thêm phụ kiện') || !fallback.story.includes('Tote canvas be')) throw new Error('Selected per-person fallback regression.');
if (fallback.story.includes('màu trung tính') || fallback.story.includes('tối giản hiện đại')) throw new Error('Invented optional choices.');
console.log('Fallback: selected accessories only, all people and no invented palette/style passed.');
const prompt = planPrompt(plan, catalog);
if (!prompt.includes('exactly 2 people') || !prompt.includes('Áo tứ thân') || prompt.includes('Sneaker trắng')) throw new Error('Group image prompt fidelity regression.');
console.log('CONTROL: actual image prompt resolves selected per-person garments/accessories, unlike fallback copy.');
console.log('Payload/prompt/copy checks only; image fidelity still requires a real authorized test.');
