import { providerError } from "./provider-error.ts";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("bridge failures preserve safe codes without upstream details", async () => {
  for (const [code, status] of Object.entries({
    PROVIDER_SESSION_EXPIRED: 503, PROVIDER_TIMEOUT: 504,
    PROVIDER_NO_IMAGE: 502, PROVIDER_UNAVAILABLE: 502, PROVIDER_BUSY: 429,
  })) {
    const response = new Response(JSON.stringify({ code, error: "private-cookie fixture", message: "private-prompt fixture" }), { status });
    const error = await providerError(response, "Gemini Web bridge");
    assert(error.message.startsWith(code + ":"), "code lost");
    assert(!/private-/.test(error.message), "private detail leaked");
  }
});

Deno.test("unknown bridge codes and non-JSON errors fail safely", async () => {
  for (const response of [
    new Response(JSON.stringify({ code: "PRIVATE_SECRET", message: "private fixture" }), { status: 502 }),
    new Response("private cookie fixture", { status: 503 }),
    new Response(JSON.stringify({ code: "PROVIDER_SESSION_EXPIRED" }), { status: 502 }),
  ]) {
    const error = await providerError(response, "Gemini Web bridge");
    assert(error.message.startsWith("PROVIDER_UNAVAILABLE:"), "unexpected code accepted");
    assert(!/private/i.test(error.message), "private detail leaked");
  }
});

Deno.test("official provider billing errors retain existing semantics", async () => {
  const error = await providerError(new Response(JSON.stringify({ error: { message: "quota limit: 0" } }), { status: 429 }), "Gemini");
  assert(error.message.includes("no available quota"), "quota classification lost");
});
