import { verifyGateway } from './gateway-auth.ts';
const secret = 'fixture-'.repeat(8);
const now = 1800000000000;
function request(overrides: Record<string, string> = {}, body = '{"planning":true}', url = 'https://fixture/functions/v1/generate-look') {
  return new Request(url, { method: 'POST', body, headers: {
    'x-vremix-timestamp': '1800000000',
    'x-vremix-signature': '04a00e512820c0f157c6ebf7a2c3459bc9b985d0a15663ecb8b9db0ddb671c83',
    'x-vremix-owner': 'owner-fixture', 'x-vremix-user': 'user-fixture', ...overrides,
  }});
}
Deno.test('PHP fixed HMAC vector verifies in Edge; tampering fails closed', async () => {
  if (!await verifyGateway(request(), secret, now)) throw new Error('PHP fixture rejected');
  for (const req of [
    request({'x-vremix-owner': 'other'}), request({'x-vremix-user': 'other'}),
    request({'x-vremix-timestamp': '1800000001'}), request({'x-vremix-signature': '0'.repeat(64)}),
    request({}, '{}'), request({}, undefined, 'https://fixture/generate-look?jobId=other'),
    request({}, undefined, 'https://fixture/other'),
    new Request('https://fixture/generate-look', {headers: request().headers}),
  ]) if (await verifyGateway(req, secret, now)) throw new Error('Tampered request accepted');
  for (const stamp of [now - 181000, now + 181000]) {
    if (await verifyGateway(request(), secret, stamp)) throw new Error('Expired/future request accepted');
  }
  if (await verifyGateway(request(), undefined, now) || await verifyGateway(request(), 'wrong'.repeat(8), now)) throw new Error('Missing/wrong secret accepted');
});
Deno.test('text advice signature is bound to its own function, not an image route', async () => {
  const advice = request({'x-vremix-signature':'b0d78f15da608cd1b075c215074fc4e5e8f11ceb0e42cb3ad3c323cc872058c6'}, '{"planning":true}', 'https://fixture/functions/v1/studio-advisor');
  if (!await verifyGateway(advice,secret,now,'studio-advisor')) throw new Error('Advice signature rejected');
  if (await verifyGateway(advice,secret,now) || await verifyGateway(request(),secret,now,'studio-advisor')) throw new Error('Signature crossed function boundaries');
});
