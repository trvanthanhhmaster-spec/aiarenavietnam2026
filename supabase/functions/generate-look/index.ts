const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const storageBucket = "generated-lookbooks";

type LookRequest = {
  eventSlug?: string;
  garmentSlug?: string;
  accessorySlugs?: string[];
  colorSlug?: string;
  styleSlug?: string;
  inputImage?: { mimeType: string; data: string };
};

type PromptVersion = {
  id: string;
  version: number;
  model: string;
  system_prompt: string;
};

type GeneratedAsset = {
  path: string;
  url: string;
  mimeType: string;
  index: number;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function serviceConfig() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server configuration is incomplete.");
  return { url, key };
}

function isSafeImage(image: LookRequest["inputImage"]) {
  return !image
    || (["image/jpeg", "image/png", "image/webp"].includes(image.mimeType)
      && image.data.length <= 8_000_000);
}

async function rest(path: string, init: RequestInit = {}) {
  const { url, key } = serviceConfig();
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`Supabase REST returned HTTP ${response.status}.`);
  return response;
}

async function selectCatalog(table: string, filter: string) {
  const response = await rest(`${table}?${filter}`);
  return response.json();
}

async function activePrompt(): Promise<PromptVersion> {
  const rows = await selectCatalog(
    "studio_prompt_versions",
    "slug=eq.outfit-image&is_active=eq.true&select=id,version,model,system_prompt&limit=1",
  );
  if (!rows.length) throw new Error("No active Studio prompt version is configured.");
  return rows[0] as PromptVersion;
}

async function createJob(input: LookRequest, promptVersionId: string) {
  const response = await rest("generation_jobs", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify({
      status: "queued",
      input,
      prompt_version_id: promptVersionId,
    }),
  });
  const rows = await response.json();
  if (!rows[0]?.id) throw new Error("Unable to create generation job.");
  return rows[0] as { id: string };
}

async function updateJob(jobId: string, status: string, output: unknown, errorMessage?: string) {
  await rest(`generation_jobs?id=eq.${encodeURIComponent(jobId)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      output: output || {},
      error_message: errorMessage || null,
      completed_at: status === "completed" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }),
  });
}

async function getJob(jobId: string) {
  const rows = await selectCatalog(
    "generation_jobs",
    `id=eq.${encodeURIComponent(jobId)}&select=id,status,output,error_message,created_at,updated_at,completed_at&limit=1`,
  );
  return rows[0] || null;
}

async function askGemini(
  request: LookRequest,
  catalog: Record<string, unknown>,
  promptVersion: PromptVersion,
) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.0-flash";
  if (!apiKey) throw new Error("Gemini is not configured for this environment.");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const prompt = [
    promptVersion.system_prompt,
    "Return JSON with keys: story, guardrail, genZTip, imagePrompt, confidence.",
    `Selected event: ${JSON.stringify(request.eventSlug)}`,
    `Selected garment: ${JSON.stringify(request.garmentSlug)}`,
    `Selected accessories: ${JSON.stringify(request.accessorySlugs || [])}`,
    `Selected color: ${JSON.stringify(request.colorSlug)}`,
    `Selected style: ${JSON.stringify(request.styleSlug)}`,
    `Catalog facts: ${JSON.stringify(catalog)}`,
  ].join("\n");
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (request.inputImage) {
    parts.push({
      inline_data: {
        mime_type: request.inputImage.mimeType,
        data: request.inputImage.data,
      },
    });
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.35 },
    }),
  });
  if (!response.ok) throw new Error(`Gemini returned HTTP ${response.status}.`);
  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned an empty response.");
  return JSON.parse(text);
}

function fallbackImagePrompt(request: LookRequest, catalog: Record<string, any>) {
  const event = catalog.event?.label || request.eventSlug || "a Vietnamese cultural event";
  const garment = catalog.garment?.name || request.garmentSlug || "Vietnamese traditional clothing";
  const color = catalog.options?.find((item: any) => item.slug === request.colorSlug)?.label || "";
  const style = catalog.options?.find((item: any) => item.slug === request.styleSlug)?.label || "";
  return [
    `Editorial full-body fashion portrait for ${event}.`,
    `${garment}, preserve its Vietnamese silhouette, collar, panels, buttons and sleeve construction.`,
    `Palette: ${color}. Styling direction: ${style}.`,
    "Contemporary accessories may be subtle, but the traditional garment remains the visual centre.",
    "Natural light, respectful cultural context, clean background, portrait composition, no text, no logo, no watermark.",
  ].join(" ");
}

async function generateImages(prompt: string): Promise<{ bytes: string; mimeType: string }[]> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  const model = Deno.env.get("GEMINI_IMAGE_MODEL") || "imagen-3.0-generate-002";
  if (!apiKey) throw new Error("Gemini image generation is not configured.");

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:predict?key=${encodeURIComponent(apiKey)}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: {
        sampleCount: 4,
        aspectRatio: "9:16",
        personGeneration: "allow_adult",
      },
    }),
  });
  if (!response.ok) throw new Error(`Gemini image model returned HTTP ${response.status}.`);
  const body = await response.json();
  const predictions = Array.isArray(body?.predictions) ? body.predictions : [];
  const images = predictions.map((prediction: any) => ({
    bytes: prediction.bytesBase64Encoded || prediction.image?.bytesBase64Encoded || "",
    mimeType: prediction.mimeType || prediction.image?.mimeType || "image/png",
  })).filter((image: { bytes: string }) => image.bytes);
  if (!images.length) throw new Error("Gemini image model returned no images.");
  return images;
}

async function ensureStorageBucket() {
  const { url, key } = serviceConfig();
  const response = await fetch(`${url}/storage/v1/bucket`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id: storageBucket, name: storageBucket, public: false }),
  });
  if (!response.ok && response.status !== 400 && response.status !== 409) {
    throw new Error(`Unable to prepare image storage (HTTP ${response.status}).`);
  }
}

async function uploadImage(path: string, bytes: string, mimeType: string) {
  const { url, key } = serviceConfig();
  const binary = Uint8Array.from(atob(bytes), (character) => character.charCodeAt(0));
  const response = await fetch(`${url}/storage/v1/object/${storageBucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body: binary,
  });
  if (!response.ok) throw new Error(`Unable to store generated image (HTTP ${response.status}).`);
}

async function signedUrl(path: string) {
  const { url, key } = serviceConfig();
  const response = await fetch(`${url}/storage/v1/object/sign/${storageBucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expiresIn: 86_400 }),
  });
  if (!response.ok) throw new Error(`Unable to sign generated image (HTTP ${response.status}).`);
  const body = await response.json();
  const relative = body.signedURL || body.signedUrl;
  if (!relative) throw new Error("Storage returned no signed URL.");
  return relative.startsWith("http") ? relative : `${url}/storage/v1${relative}`;
}

async function storeLookbook(jobId: string, images: { bytes: string; mimeType: string }[]): Promise<GeneratedAsset[]> {
  await ensureStorageBucket();
  const assets: GeneratedAsset[] = [];
  for (let index = 0; index < images.length; index += 1) {
    const extension = images[index].mimeType.includes("jpeg") ? "jpg" : "png";
    const path = `${jobId}/look-${index + 1}.${extension}`;
    await uploadImage(path, images[index].bytes, images[index].mimeType);
    assets.push({
      path,
      url: await signedUrl(path),
      mimeType: images[index].mimeType,
      index: index + 1,
    });
  }
  return assets;
}

async function processLook(job: { id: string }, input: LookRequest, promptVersion: PromptVersion) {
  await updateJob(job.id, "processing", {});
  const [event, garment, accessories, options] = await Promise.all([
    selectCatalog("studio_events", `slug=eq.${encodeURIComponent(input.eventSlug || "")}&is_active=eq.true&select=slug,label,description,cultural_context`),
    selectCatalog("studio_garments", `slug=eq.${encodeURIComponent(input.garmentSlug || "")}&is_active=eq.true&select=slug,name,category,description,origin_note,significance_note`),
    selectCatalog("studio_accessories", `${input.accessorySlugs?.length ? `slug=in.(${input.accessorySlugs.map(encodeURIComponent).join(",")})&` : ""}is_active=eq.true&select=slug,name,description`),
    selectCatalog("studio_options", "is_active=eq.true&select=option_type,slug,label,value,prompt_hint"),
  ]);
  if (!event.length || !garment.length) throw new Error("Selection is not in the approved catalog.");

  const catalog = { event: event[0], garment: garment[0], accessories, options };
  const copy = await askGemini(input, catalog, promptVersion);
  const imagePrompt = copy.imagePrompt || fallbackImagePrompt(input, catalog);
  const generated = await generateImages(imagePrompt);
  const assets = await storeLookbook(job.id, generated);
  return {
    ...copy,
    promptVersion: { id: promptVersion.id, version: promptVersion.version, model: promptVersion.model },
    imagePrompt,
    imageUrl: assets[0]?.url || null,
    lookbook: {
      aspectRatio: "9:16",
      items: assets,
    },
  };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(request.url);
  if (request.method === "GET") {
    const jobId = url.searchParams.get("jobId");
    if (!jobId) return json({ error: "jobId is required." }, 400);
    try {
      const job = await getJob(jobId);
      return job ? json({ jobId: job.id, ...job }) : json({ error: "Job not found." }, 404);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Unable to read job." }, 502);
    }
  }
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

  let job: { id: string } | null = null;
  try {
    const promptVersion = await activePrompt();
    job = await createJob(input, promptVersion.id);
    const output = await processLook(job, input, promptVersion);
    await updateJob(job.id, "completed", output);
    return json({ jobId: job.id, status: "completed", output });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    if (job) {
      try {
        await updateJob(job.id, "failed", {}, message);
      } catch {
        // Preserve the original provider error in the HTTP response.
      }
    }
    return json({ jobId: job?.id || null, status: "failed", error: message }, 502);
  }
});
