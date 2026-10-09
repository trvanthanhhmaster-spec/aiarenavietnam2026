const bridgeFailures: Record<string, number> = {
  PROVIDER_SESSION_EXPIRED: 503,
  PROVIDER_TIMEOUT: 504,
  PROVIDER_NO_IMAGE: 502,
  PROVIDER_UNAVAILABLE: 502,
  PROVIDER_BUSY: 429,
};

export async function providerError(response: Response, provider: string) {
  let detail = "";
  let code = "";
  try {
    const body = await response.clone().json();
    code = typeof body?.code === "string" ? body.code : "";
    detail = body?.error?.message || body?.message || "";
  } catch {
    detail = await response.text();
  }
  if (provider === "Gemini Web bridge") {
    // Persist only known bridge codes, not provider output, URLs or credentials.
    if (Object.hasOwn(bridgeFailures, code) && bridgeFailures[code] === response.status) {
      return new Error(`${code}: Gemini Web bridge returned HTTP ${response.status}.`);
    }
    return new Error(`PROVIDER_UNAVAILABLE: Gemini Web bridge returned HTTP ${response.status}.`);
  }
  if (response.status === 429 && /limit:\s*0|quota|billing/i.test(detail)) {
    return new Error(`${provider} has no available quota. Enable billing or use an API key with image/video quota.`);
  }
  if (response.status === 402 && /prepayment credits are depleted|billing/i.test(detail)) {
    return new Error(`${provider} has no prepaid Gemini API balance. Add billing credits in AI Studio or use Vertex AI billing.`);
  }
  return new Error(`${provider} returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 280)}` : "."}`);
}
