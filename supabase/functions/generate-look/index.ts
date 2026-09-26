const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type LookRequest = {
  eventSlug?: string;
  garmentSlug?: string;
  accessorySlugs?: string[];
  colorSlug?: string;
  styleSlug?: string;
  inputImage?: { mimeType: string; data: string };
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function isSafeImage(image: LookRequest["inputImage"]) {
  if (!image) return true;
  return ["image/jpeg", "image/png", "image/webp"].includes(image.mimeType)
    && image.data.length <= 8_000_000;
}

async function selectCatalog(table: string, filter: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  const response = await fetch(`${url}/rest/v1/${table}?${filter}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!response.ok) throw new Error(`Catalog lookup failed for ${table}.`);
  return response.json();
}

async function createJob(input: LookRequest) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  const response = await fetch(`${url}/rest/v1/generation_jobs`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({ status: "processing", input }),
  });
  if (!response.ok) throw new Error("Unable to create generation job.");
  const rows = await response.json();
  return rows[0];
}

async function completeJob(jobId: string, status: string, output: unknown, errorMessage?: string) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/generation_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      status,
      output,
      error_message: errorMessage || null,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function askGemini(request: LookRequest, catalog: Record<string, unknown>) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.0-flash";
  if (!apiKey) throw new Error("Gemini is not configured for this environment.");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = [
    "You are V-Remix cultural styling assistant.",
    "Use only the supplied catalog facts. Never invent historical claims.",
    "Return JSON with keys: story, guardrail, genZTip, imagePrompt, confidence.",
    `Selected event: ${JSON.stringify(request.eventSlug)}`,
    `Selected garment: ${JSON.stringify(request.garmentSlug)}`,
    `Selected accessories: ${JSON.stringify(request.accessorySlugs || [])}`,
    `Selected color: ${JSON.stringify(request.colorSlug)}`,
    `Selected style: ${JSON.stringify(request.styleSlug)}`,
    `Catalog facts: ${JSON.stringify(catalog)}`,
  ].join("\n");
  const contents: Record<string, unknown>[] = [{ text: prompt }];
  if (request.inputImage) {
    contents.push({ inline_data: { mime_type: request.inputImage.mimeType, data: request.inputImage.data } });
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: contents }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.35 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}.`);
  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return JSON.parse(text);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);

  let input: LookRequest;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid JSON request." }, 400);
  }

  if (!input.eventSlug || !input.garmentSlug || !isSafeImage(input.inputImage)) {
    return json({ error: "A valid event, garment and optional image are required." }, 400);
  }

  let job: { id: string };
  try {
    const accessoriesFilter = input.accessorySlugs?.length
      ? `slug=in.(${input.accessorySlugs.map(encodeURIComponent).join(",")})&`
      : "";
    const [event, garment, accessories, options] = await Promise.all([
      selectCatalog("studio_events", `slug=eq.${encodeURIComponent(input.eventSlug)}&is_active=eq.true&select=slug,label,description,cultural_context`),
      selectCatalog("studio_garments", `slug=eq.${encodeURIComponent(input.garmentSlug)}&is_active=eq.true&select=slug,name,category,description,origin_note,significance_note`),
      selectCatalog("studio_accessories", `${accessoriesFilter}is_active=eq.true&select=slug,name,description`),
      selectCatalog("studio_options", `is_active=eq.true&select=option_type,slug,label,value,prompt_hint`),
    ]);
    if (!event.length || !garment.length) return json({ error: "Selection is not in the approved catalog." }, 422);
    job = await createJob(input);
    const output = await askGemini(input, { event: event[0], garment: garment[0], accessories, options });
    await completeJob(job.id, "completed", output);
    return json({ jobId: job.id, status: "completed", output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    return json({ error: message }, 502);
  }
});
