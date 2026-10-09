const encoder = new TextEncoder();
const hex = (bytes: ArrayBuffer) => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');

export async function verifyGateway(request: Request, secret: string | undefined, now = Date.now(), functionName = 'generate-look'): Promise<boolean> {
  if (!secret || secret.length < 32) return false;
  const stamp = request.headers.get('x-vremix-timestamp') || '';
  const signature = request.headers.get('x-vremix-signature') || '';
  if (!/^\d{10}$/.test(stamp) || !/^[a-f0-9]{64}$/.test(signature)
    || Math.abs(now / 1000 - Number(stamp)) > 180) return false;
  const url = new URL(request.url);
  // The platform can prefix the function path with /functions/v1.
  if (!['generate-look', 'studio-advisor'].includes(functionName) || !url.pathname.endsWith('/' + functionName)) return false;
  const body = request.method === 'GET' ? new Uint8Array() : await request.clone().arrayBuffer();
  const canonical = ['v1', stamp, request.method, '/' + functionName + url.search,
    request.headers.get('x-vremix-owner') || '', request.headers.get('x-vremix-user') || '',
    hex(await crypto.subtle.digest('SHA-256', body))].join('\n');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  const bytes = Uint8Array.from(signature.match(/../g)!, byte => parseInt(byte, 16));
  return crypto.subtle.verify('HMAC', key, bytes, encoder.encode(canonical));
}
