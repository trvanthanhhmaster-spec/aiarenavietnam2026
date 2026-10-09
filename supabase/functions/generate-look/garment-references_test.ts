import { normalizePlan } from './studio-plan.ts';
import { allowedReferenceUrl, referenceCandidates, loadGarmentReferences, garmentReferenceInstructions } from './garment-references.ts';
import { buildImageRequest } from './image-request.ts';
function assert(value: unknown, message = 'Assertion failed') { if (!value) throw new Error(message); }
const plan = normalizePlan({version:1,count:2,shared:true,period:{kind:'unspecified'},people:[1,2].map(id => ({id,outfit:{garment:'ao-tac',garmentVariant:'red'}}))});
const catalog = {garments:[{id:'g',slug:'ao-tac',image_url:'https://upload.wikimedia.org/wikipedia/commons/a/parent.jpg'}],garmentVariants:[{garment_id:'g',slug:'red',image_url:'https://upload.wikimedia.org/wikipedia/commons/b/sample.jpg'}]};
Deno.test('garment samples resolve from catalog, dedupe and retain person assignments', () => {
  const candidates = referenceCandidates(plan,catalog);
  assert(candidates.length === 1 && candidates[0].personIds.join(',') === '1,2');
  assert(candidates[0].url.endsWith('sample.jpg'));
  const invalid = structuredClone(catalog); invalid.garmentVariants[0].garment_id = 'different';
  let failed=false;try { referenceCandidates(plan,invalid); } catch { failed=true; } assert(failed);
});
Deno.test('reference URL allowlist rejects SSRF, external hosts, credentials and insecure redirects', () => {
  for (const url of ['http://127.0.0.1/x','https://localhost/x','https://upload.wikimedia.org.evil.test/x','https://user:pass@upload.wikimedia.org/wikipedia/a.jpg','https://test.supabase.co/rest/v1/users','https://upload.wikimedia.org:8443/wikipedia/a.jpg']) {
    let failed=false;try {allowedReferenceUrl(url,'https://test.supabase.co');}catch{failed=true;}assert(failed,url);
  }
  assert(allowedReferenceUrl('https://test.supabase.co/storage/v1/object/public/samples/a.jpg','https://test.supabase.co'));
  assert(allowedReferenceUrl('assets/media/catalog/garment-ao-tac.webp','https://test.supabase.co').href==='https://v-remix.vietnamsir.com/assets/media/catalog/garment-ao-tac.webp');
  for (const url of ['.env','assets/media/catalog/../../../.env','https://v-remix.vietnamsir.com/admin.php','assets/media/catalog/a.jpg?redirect=localhost']) {
    let failed=false;try{allowedReferenceUrl(url,'https://test.supabase.co');}catch{failed=true;}assert(failed);
  }
});
Deno.test('binary sample bytes, MIME sniffing, mapping and attachment order reach model request', async () => {
  let calls=0;
  const bytes=new Uint8Array([255,216,255,224,0,1]);
  const refs=await loadGarmentReferences(plan,catalog,'https://test.supabase.co',((url,opts) => {
    calls++;assert(String(url).endsWith('sample.jpg'));assert((opts as RequestInit)?.redirect === 'manual');
    return Promise.resolve(new Response(bytes,{headers:{'content-type':'text/plain'}}));
  }) as typeof fetch);
  assert(calls===1 && refs[0].mimeType==='image/jpeg' && atob(refs[0].data).charCodeAt(0)===255);
  const request=buildImageRequest(garmentReferenceInstructions(refs),'Look',{mimeType:'image/png',data:'previous'},
    {operation:'group-edit',references:[{mimeType:'image/jpeg',data:'face'}],garmentReferences:refs});
  const parts=request.contents[0].parts;
  assert(parts.length===4 && parts[1].inline_data.data==='previous' && parts[2].inline_data.data==='face' && parts[3].inline_data.data===refs[0].data);
  assert(parts[0].text.includes('Never copy the sample model identity') && parts[0].text.includes('explicitly overrides'));
});
Deno.test('invalid references fail before model: HTML, redirects, oversized and failed response', async () => {
  for (const response of [new Response('html'),new Response(null,{status:302,headers:{location:'http://localhost'}}),new Response(null,{status:403}),new Response('x',{headers:{'content-length':'2000001'}}),new Response(new Uint8Array(2_000_001))]) {
    let failed=false;try{await loadGarmentReferences(plan,catalog,'https://test.supabase.co',(() => Promise.resolve(response)) as typeof fetch);}catch{failed=true;}assert(failed);
  }
});
