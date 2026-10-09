import { verifyGateway } from '../generate-look/gateway-auth.ts';
import { advicePrompt, parseAdvice } from './schema.ts';
const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status, headers: {'Content-Type': 'application/json', 'Cache-Control': 'no-store'}});
Deno.serve(async request => {
  if (request.method !== 'POST') return reply({error: 'Method not allowed.'}, 405);
  if (!await verifyGateway(request, Deno.env.get('VREMIX_GATEWAY_SECRET'), Date.now(), 'studio-advisor')) return reply({error: 'Invalid gateway.'}, 403);
  try {
    const text = await request.text();
    if (text.length > 24000) return reply({error: 'Payload too large.'}, 413);
    const input = JSON.parse(text);
    if (!input.selection || !Array.isArray(input.recipes) || input.recipes.length > 3 || !Array.isArray(input.guards)) return reply({error: 'Invalid advice request.'}, 422);
    const url = Deno.env.get('GEMINI_WEB_BRIDGE_URL')?.replace(/\/+$/, ''), secret = Deno.env.get('GEMINI_WEB_BRIDGE_SECRET');
    if (!url || !secret) return reply({error: 'Text stylist not configured.'}, 503);
    const response = await fetch(`${url}/v1/images/generate`, {method: 'POST', signal: AbortSignal.timeout(45000),
      headers: {'Content-Type': 'application/json', 'x-vremix-bridge-secret': secret},
      body: JSON.stringify({operation: 'review', prompt: advicePrompt(input)})});
    if (!response.ok) return reply({error: 'Text stylist unavailable.'}, 503);
    const body = await response.json();
    if (typeof body.text !== 'string' || body.text.length > 20000) throw new Error('Missing advice.');
    return reply(parseAdvice(body.text, input.recipes.map((r: {id: string}) => r.id)));
  } catch { return reply({error: 'Text stylist unavailable. No automatic retry.'}, 503); }
});
