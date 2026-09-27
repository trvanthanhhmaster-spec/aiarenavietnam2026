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
  generationType?: "image" | "video" | "both";
  inputImage?: { mimeType: string; data: string };
};

type GenerationOutput = Record<string, any> & {
  generationType?: "image" | "video" | "both";
  providerOperation?: string;
  video?: { path: string; url: string; mimeType: string } | null;
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

type ProviderConfig = {
  apiKey: string;
  vertex: boolean;
  project?: string;
  location?: string;
};

function providerConfig(video = false): ProviderConfig {
  const vertex = (Deno.env.get("GOOGLE_AI_PROVIDER") || "").toLowerCase() === "vertex";
  const apiKey = Deno.env.get(vertex ? "GOOGLE_VERTEX_API_KEY" : "GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error(vertex
      ? "Vertex AI is not configured for this environment."
      : "Gemini is not configured for this environment.");
  }
  if (!vertex) return { apiKey, vertex: false };
  const project = Deno.env.get("GOOGLE_CLOUD_PROJECT");
  const location = Deno.env.get(video ? "GOOGLE_CLOUD_VIDEO_LOCATION" : "GOOGLE_CLOUD_LOCATION") || "global";
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is missing for Vertex AI.");
  return { apiKey, vertex: true, project, location };
}

function modelEndpoint(config: ProviderConfig, model: string, method: string) {
  if (config.vertex) {
    return `https://aiplatform.googleapis.com/v1/projects/${encodeURIComponent(config.project || "")}/locations/${encodeURIComponent(config.location || "global")}/publishers/google/models/${encodeURIComponent(model)}:${method}?key=${encodeURIComponent(config.apiKey)}`;
  }
  return `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:${method}?key=${encodeURIComponent(config.apiKey)}`;
}

function operationEndpoint(config: ProviderConfig, operationName: string) {
  const base = config.vertex
    ? "https://aiplatform.googleapis.com/v1/"
    : "https://generativelanguage.googleapis.com/v1beta/";
  return `${base}${operationName}?key=${encodeURIComponent(config.apiKey)}`;
}

async function providerError(response: Response, provider: string) {
  let detail = "";
  try {
    const body = await response.clone().json();
    detail = body?.error?.message || body?.message || "";
  } catch {
    detail = await response.text();
  }
  if (response.status === 429 && /limit:\s*0|quota|billing/i.test(detail)) {
    return new Error(`${provider} has no available quota. Enable billing or use an API key with image/video quota.`);
  }
  if (response.status === 402 && /prepayment credits are depleted|billing/i.test(detail)) {
    return new Error(`${provider} has no prepaid Gemini API balance. Add billing credits in AI Studio or use Vertex AI billing.`);
  }
  return new Error(`${provider} returned HTTP ${response.status}${detail ? `: ${detail.slice(0, 280)}` : "."}`);
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
  const model = Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.5-flash";
  const config = providerConfig();
  const endpoint = modelEndpoint(config, model, "generateContent");
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
  if (!response.ok) throw await providerError(response, "Gemini");
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

async function generateImages(
  prompt: string,
  inputImage?: LookRequest["inputImage"],
): Promise<{ bytes: string; mimeType: string }[]> {
  const model = Deno.env.get("GEMINI_IMAGE_MODEL") || "gemini-2.5-flash-image";
  const config = providerConfig();
  const endpoint = modelEndpoint(config, model, "generateContent");
  const variants = [
    "front-facing editorial hero",
    "three-quarter fashion portrait",
    "full-body walking composition",
    "detail-led lookbook composition",
  ];
  const images: { bytes: string; mimeType: string }[] = [];
  for (let index = 0; index < variants.length; index += 1) {
    const variant = variants[index];
    const parts: Record<string, unknown>[] = [{
      text: `${prompt}\nCreate variation ${index + 1}: ${variant}. Keep the same selected garment, styling and person identity across the lookbook.`,
    }];
    if (inputImage) {
      parts.push({
        inline_data: {
          mime_type: inputImage.mimeType,
          data: inputImage.data,
        },
      });
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: { aspectRatio: "9:16" },
        },
      }),
    });
    if (!response.ok) {
      const error = await providerError(response, "Gemini image model");
      // Preserve a usable first look when later lookbook variants hit provider limits.
      if (images.length > 0 && /no available quota|resource exhausted/i.test(error.message)) break;
      throw error;
    }
    const body = await response.json();
    const imagePart = body?.candidates?.[0]?.content?.parts?.find((part: any) =>
      part.inlineData?.data || part.inline_data?.data
    );
    const image = imagePart?.inlineData || imagePart?.inline_data;
    if (!image?.data) throw new Error("Gemini image model returned no image.");
    images.push({
      bytes: image.data,
      mimeType: image.mimeType || image.mime_type || "image/png",
    });
  }
  return images;
}

async function startVideoOperation(prompt: string, inputImage?: LookRequest["inputImage"]) {
  const model = Deno.env.get("GEMINI_VIDEO_MODEL") || "veo-3.1-fast-generate-preview";
  const config = providerConfig(true);

  const instance: Record<string, unknown> = {
    prompt: `${prompt}\nCreate a restrained eight-second fashion film. Preserve the selected Vietnamese garment construction and subject identity. Use slow natural movement, stable camera motion, no text, no logo and no wardrobe morphing.`,
  };
  if (inputImage) {
    instance.image = {
      bytesBase64Encoded: inputImage.data,
      mimeType: inputImage.mimeType,
    };
  }
  const endpoint = modelEndpoint(config, model, "predictLongRunning");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      instances: [instance],
      parameters: {
        aspectRatio: "9:16",
        durationSeconds: 8,
        sampleCount: 1,
      },
    }),
  });
  if (!response.ok) throw await providerError(response, "Veo");
  const body = await response.json();
  if (!body?.name) throw new Error("Veo returned no operation id.");
  return String(body.name);
}

async function readVideoOperation(operationName: string) {
  const response = await fetch(operationEndpoint(providerConfig(true), operationName));
  if (!response.ok) throw await providerError(response, "Veo operation");
  return response.json();
}

function findVideoUri(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of ["uri", "gcsUri", "videoUri"]) {
    if (typeof record[key] === "string") return record[key] as string;
  }
  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findVideoUri(item);
        if (found) return found;
      }
    } else {
      const found = findVideoUri(child);
      if (found) return found;
    }
  }
  return null;
}

async function downloadVideo(uri: string) {
  const config = providerConfig(true);
  const response = await fetch(uri, { headers: { "x-goog-api-key": config.apiKey } });
  if (!response.ok) throw await providerError(response, "Veo video download");
  return {
    bytes: await response.arrayBuffer(),
    mimeType: response.headers.get("content-type") || "video/mp4",
  };
}

async function storeVideo(jobId: string, uri: string) {
  await ensureStorageBucket();
  const video = await downloadVideo(uri);
  const path = `${jobId}/lookbook-video.mp4`;
  await uploadBytes(path, video.bytes, video.mimeType);
  return {
    path,
    url: await signedUrl(path),
    mimeType: video.mimeType,
  };
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

async function uploadBytes(path: string, body: BodyInit, mimeType: string) {
  const { url, key } = serviceConfig();
  const response = await fetch(`${url}/storage/v1/object/${storageBucket}/${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": mimeType,
      "x-upsert": "true",
    },
    body,
  });
  if (!response.ok) throw new Error(`Unable to store generated asset (HTTP ${response.status}).`);
}

async function uploadImage(path: string, bytes: string, mimeType: string) {
  const binary = Uint8Array.from(atob(bytes), (character) => character.charCodeAt(0));
  await uploadBytes(path, binary, mimeType);
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
  const generationType = input.generationType || "image";
  let assets: GeneratedAsset[] = [];
  if (generationType === "image" || generationType === "both") {
    const generated = await generateImages(imagePrompt, input.inputImage);
    assets = await storeLookbook(job.id, generated);
  }

  const output: GenerationOutput = {
    ...copy,
    generationType,
    promptVersion: { id: promptVersion.id, version: promptVersion.version, model: promptVersion.model },
    imagePrompt,
    imageUrl: assets[0]?.url || null,
    lookbook: {
      aspectRatio: "9:16",
      items: assets,
    },
  };
  if (generationType === "video" || generationType === "both") {
    output.providerOperation = await startVideoOperation(imagePrompt, input.inputImage);
  }
  return output;
}

async function refreshVideoJob(job: Record<string, any>) {
  const output: GenerationOutput = { ...(job.output || {}) };
  if (job.status !== "processing" || !output.providerOperation) return job;

  const operation = await readVideoOperation(output.providerOperation);
  if (operation.error) {
    const message = operation.error.message || "Veo generation failed.";
    await updateJob(job.id, "failed", output, message);
    return await getJob(job.id);
  }
  if (!operation.done) return job;

  const uri = findVideoUri(operation.response);
  if (!uri) {
    await updateJob(job.id, "failed", output, "Veo completed without a video asset.");
    return await getJob(job.id);
  }
  output.video = await storeVideo(job.id, uri);
  delete output.providerOperation;
  await updateJob(job.id, "completed", output);
  return await getJob(job.id);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(request.url);
  if (request.method === "GET") {
    const jobId = url.searchParams.get("jobId");
    if (!jobId) return json({ error: "jobId is required." }, 400);
    try {
      const current = await getJob(jobId);
      const job = current ? await refreshVideoJob(current) : null;
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

  const generationType = input.generationType || "image";
  if (!["image", "video", "both"].includes(generationType)) {
    return json({ error: "generationType must be image, video or both." }, 400);
  }
  input.generationType = generationType;
  if (!input.eventSlug || !input.garmentSlug || !isSafeImage(input.inputImage)) {
    return json({ error: "A valid event, garment and optional image are required." }, 400);
  }

  let job: { id: string } | null = null;
  try {
    const promptVersion = await activePrompt();
    job = await createJob(input, promptVersion.id);
    const output = await processLook(job, input, promptVersion);
    if (output.providerOperation) {
      await updateJob(job.id, "processing", output);
      return json({ jobId: job.id, status: "processing", output }, 202);
    }
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
