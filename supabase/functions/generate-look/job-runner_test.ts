import { runClaimedJob } from './job-runner.ts';
const assert = (v: unknown) => { if (!v) throw new Error('Assertion failed'); };
Deno.test('claimed image job completes once and reports failure without provider replay', async () => {
  let calls = 0; const states: string[] = [];
  await runClaimedJob(async () => { calls++; return {imageUrl:'image'}; }, async (s) => { states.push(s); });
  assert(calls === 1 && states.join() === 'completed');
  await runClaimedJob(async () => { calls++; throw new Error('PROVIDER_TIMEOUT'); }, async (s, _o, e) => { states.push(s); assert(e === 'PROVIDER_TIMEOUT'); });
  assert(calls === 2 && states.join() === 'completed,failed');
});
Deno.test('background video remains processing and failed persistence does not trigger generation again', async () => {
  let calls = 0; let state = '';
  await runClaimedJob(async () => { calls++; return {providerOperation:'op'}; }, async (s) => { state = s; });
  assert(state === 'processing' && calls === 1);
  await runClaimedJob(async () => { calls++; return {}; }, async () => { throw new Error('storage unavailable'); });
  assert(calls === 2);
});
