import { selectionCopy } from './selection-copy.ts';
Deno.test('AI invented accessory copy is replaced without fabricating cultural score', () => {
  const result=selectionCopy({story:'AI claims sunglasses and tote were chosen',guardrail:'AI added sunglasses',genZTip:'AI says wear unselected tote',culturalScore:0,imagePrompt:'fixture',confidence:.4},
    {garmentSlug:'ao-tac',accessorySlugs:[]}, {garment:{slug:'ao-tac',name:'Áo tấc'},accessories:[{slug:'tote',name:'Tote'}]});
  if (![result.story,result.guardrail,result.genZTip].every(text => !text.includes('sunglasses') && !text.includes('tote'))
      || result.culturalScore!==0 || !result.story.includes('không thêm phụ kiện')) throw new Error('Invented accessories leaked into copy.');
});
