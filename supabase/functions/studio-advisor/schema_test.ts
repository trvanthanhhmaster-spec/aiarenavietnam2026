import { advicePrompt, parseAdvice } from './schema.ts';
function assert(v: unknown) { if (!v) throw new Error('Advice assertion.'); }
Deno.test('stylist only accepts bounded text and approved recipes', () => {
  const valid = {summary: 'Bản phối của bạn phù hợp với hướng tối giản.', reasons: ['Giữ nguyên dáng áo đã chọn.'], recommendationIds: ['tac']};
  assert(parseAdvice(JSON.stringify(valid), ['tac']).source === 'ai-text-stylist');
  for (const data of [{...valid,recommendationIds:['unpublished']}, {...valid,summary:'short'}, {...valid,reasons:['x']}, {...valid,summary:'x'.repeat(601)}, {...valid,recommendationIds:[{},{}]}]) {
    let rejected = false; try { parseAdvice(JSON.stringify(data), ['tac']); } catch { rejected = true; } assert(rejected);
  }
  assert(advicePrompt(valid).includes('do not generate images'));
  assert(advicePrompt(valid).includes('untrusted data'));
});
Deno.test('daily probability cannot become an all-day rain assertion', () => {
  const prompt = advicePrompt({forecast:{precipitationProbability:100}});
  assert(prompt.includes('Precipitation probability is NOT rain duration'));
  assert(prompt.includes('Daily totals and temperature ranges do not establish hourly conditions'));
});
