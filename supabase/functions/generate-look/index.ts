import { parseGeminiCopy } from "./copy-schema.ts";
import { fallbackCopy, fallbackImagePrompt } from "./fallback-copy.ts";
import { buildImageRequest } from "./image-request.ts";
import { buildVideoRequest, type VideoFirstFrame } from "./video-request.ts";
import { normalizePlan, planPrompt, type StudioPlan } from "./studio-plan.ts";
import { verifyGateway } from "./gateway-auth.ts";
import { providerError } from "./provider-error.ts";
import { imageDimensions, parseImageAssessment, reviewPrompt, type ImageAssessment } from './image-assessment.ts';
import { loadGarmentReferences, garmentReferenceInstructions, type GarmentReference } from './garment-references.ts';
import { selectionCopy } from './selection-copy.ts';
import { groupImagePrompt } from './group-prompt.ts';
import { runClaimedJob } from './job-runner.ts';
import knowledge from '../_shared/studio-knowledge.json' with { type: 'json' };

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const storageBucket = "generated-lookbooks";
let runtimeSettingsCache: RuntimeSettings | null = null;
let runtimeSettingsCacheExpiresAt = 0;
const runtimeSettingsCacheTtlMs = 15_000;

type LookRequest = {
  recommendationContext?: Record<string, unknown>;
  planning?: StudioPlan;
  clientRequestId?: string;
  eventSlug?: string;
  location?: string;
  season?: string;
  weather?: string;
  audience?: string;
  garmentSlug?: string;
  garmentVariantSlug?: string;
  accessorySlugs?: string[];
  accessoryVariantSlugs?: string[];
  colorSlug?: string;
  patternSlug?: string;
  styleSlug?: string;
  sceneSlug?: string;
  locks?: Record<string, boolean>;
  generationType?: "image" | "video" | "both";
  inputImage?: { mimeType: string; data: string };
  faceReferenceImage?: { mimeType: string; data: string };
  referenceJobId?: string;
  collectionId?: string;
  referenceLookId?: string;
  history?: { rootJobId: string | null; rootLookId: string | null; parentJobId: string | null };
  editInstruction?: string;
  aspectRatio?: "16:9" | "1:1" | "9:16";
  targetResolution?: "720" | "1080" | "2160";
  generationMode?: "text-to-image" | "image-to-image";
  framePlan?: Record<string, { branch?: string; changeScope?: string; value?: unknown }>;
};

type GenerationOutput = Record<string, any> & {
  generationType?: "image" | "video" | "both";
  providerOperation?: string;
  videoStatus?: "processing" | "completed" | "failed";
  videoError?: string;
  video?: { path: string; url: string; mimeType: string } | null;
  videos?: Array<{ key: string; path: string; url: string; mimeType: string }>;
  providerOperations?: Array<{ key: string; name: string }>;
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
  width?: number;
  height?: number;
};

type RuntimeSettings = {
  generationEnabled: boolean;
  imageProvider: "env" | "gemini" | "vertex" | "webapi";
  videoProvider: "env" | "gemini" | "vertex";
  textModel: string;
  imageModel: string;
  videoModel: string;
  imageVariants: number;
  imageUnitCostVnd: number;
  videoUnitCostVnd: number;
  dailyBudgetVnd: number;
  monthlyBudgetVnd: number;
  geminiApiKey?: string;
};

type CostEstimate = {
  estimatedCostVnd: number;
  imageCount: number;
  videoCount: number;
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
  // Base64 expands binary input by roughly one third. The browser enforces
  // the 8 MB file limit, so validate the encoded payload against that same
  // limit instead of rejecting valid uploads after conversion.
  const maxBase64Chars = Math.ceil(8_000_000 / 3) * 4 + 8;
  return !image
    || (["image/jpeg", "image/png", "image/webp"].includes(image.mimeType)
      && typeof image.data === 'string' && image.data.length > 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(image.data)
      && image.data.length <= maxBase64Chars);
}

function isUuid(value: unknown) {
  return typeof value === "string"
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function persistedInput(input: LookRequest) {
  const { inputImage, faceReferenceImage, ...selection } = input;
  return {
    ...selection,
    faceReferenceImage: faceReferenceImage ? { mimeType: faceReferenceImage.mimeType, supplied: true } : null,
    inputImage: inputImage
      ? { mimeType: inputImage.mimeType, supplied: true }
      : null,
  };
}

type ProviderConfig = {
  apiKey: string;
  vertex: boolean;
  project?: string;
  location?: string;
  bridgeUrl?: string;
  bridgeSecret?: string;
};

function providerConfig(video = false, settings?: RuntimeSettings): ProviderConfig {
  const configuredProvider = video ? settings?.videoProvider : settings?.imageProvider;
  const provider = (
    configuredProvider && configuredProvider !== "env" && configuredProvider !== "webapi"
      ? configuredProvider
      : video
      ? Deno.env.get("GOOGLE_VIDEO_PROVIDER") || Deno.env.get("GOOGLE_AI_PROVIDER")
      : Deno.env.get("GOOGLE_AI_PROVIDER")
  )?.toLowerCase();
  const vertex = provider === "vertex";
  const apiKey = vertex
    ? Deno.env.get("GOOGLE_VERTEX_API_KEY")
    : settings?.geminiApiKey || Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new Error(vertex
      ? "Vertex AI is not configured for this environment."
      : "Gemini is not configured for this environment.");
  }
  if (!vertex) return { apiKey, vertex: false };
  const project = Deno.env.get("GOOGLE_CLOUD_PROJECT");
  const location = Deno.env.get(video ? "GOOGLE_CLOUD_VIDEO_LOCATION" : "GOOGLE_CLOUD_LOCATION") || "global";
  if (!project) throw new Error("GOOGLE_CLOUD_PROJECT is missing for Vertex AI.");
  const bridgeUrl = video && vertex ? Deno.env.get("VERTEX_VIDEO_BRIDGE_URL") : undefined;
  const bridgeSecret = video && vertex ? Deno.env.get("VERTEX_VIDEO_BRIDGE_SECRET") : undefined;
  if (bridgeUrl && !bridgeSecret) throw new Error("VERTEX_VIDEO_BRIDGE_SECRET is missing.");
  return { apiKey, vertex: true, project, location, bridgeUrl, bridgeSecret };
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

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

async function decryptGeminiApiKey(value: string | null | undefined) {
  const encodedKey = Deno.env.get("AI_CONFIG_ENCRYPTION_KEY");
  if (!value || !encodedKey) return undefined;
  try {
    const keyBytes = Uint8Array.from(atob(encodedKey), (character) => character.charCodeAt(0));
    if (keyBytes.length !== 32) return undefined;
    const [version, iv, tag, ciphertext] = value.split(".");
    if (version !== "v1" || !iv || !tag || !ciphertext) return undefined;
    const cryptoKey = await crypto.subtle.importKey("raw", keyBytes, "AES-GCM", false, ["decrypt"]);
    const cipherWithTag = new Uint8Array([...decodeBase64Url(ciphertext), ...decodeBase64Url(tag)]);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decodeBase64Url(iv), tagLength: 128 },
      cryptoKey,
      cipherWithTag,
    );
    return new TextDecoder().decode(plain);
  } catch {
    return undefined;
  }
}

async function runtimeSettings(): Promise<RuntimeSettings> {
  if (runtimeSettingsCache && Date.now() < runtimeSettingsCacheExpiresAt) {
    return runtimeSettingsCache;
  }
  const fallback: RuntimeSettings = {
    generationEnabled: true,
    imageProvider: "env",
    videoProvider: "env",
    textModel: Deno.env.get("GEMINI_TEXT_MODEL") || "gemini-2.5-flash",
    imageModel: Deno.env.get("GEMINI_IMAGE_MODEL") || "gemini-2.5-flash-image",
    videoModel: Deno.env.get("GEMINI_VIDEO_MODEL") || "veo-3.1-fast-generate-001",
    imageVariants: Math.min(5, Math.max(1, Number.parseInt(Deno.env.get("GEMINI_IMAGE_VARIANTS") || "5", 10))),
    imageUnitCostVnd: 0,
    videoUnitCostVnd: 0,
    dailyBudgetVnd: 0,
    monthlyBudgetVnd: 0,
  };
  try {
    const rows = await selectCatalog(
      "ai_runtime_settings",
      "id=eq.1&select=generation_enabled,image_provider,video_provider,text_model,image_model,video_model,image_variants,image_unit_cost_vnd,video_unit_cost_vnd,daily_budget_vnd,monthly_budget_vnd,encrypted_gemini_api_key&limit=1",
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    if (row) {
      fallback.generationEnabled = row.generation_enabled !== false;
      fallback.imageProvider = ["env", "gemini", "vertex", "webapi"].includes(String(row.image_provider))
        ? row.image_provider as RuntimeSettings["imageProvider"]
        : "env";
      fallback.videoProvider = ["env", "gemini", "vertex"].includes(String(row.video_provider))
        ? row.video_provider as RuntimeSettings["videoProvider"]
        : "env";
      fallback.textModel = String(row.text_model || fallback.textModel);
      fallback.imageModel = String(row.image_model || fallback.imageModel);
      fallback.videoModel = String(row.video_model || fallback.videoModel);
      fallback.imageVariants = Math.min(5, Math.max(1, Number(row.image_variants || fallback.imageVariants)));
      fallback.imageUnitCostVnd = Math.max(0, Number(row.image_unit_cost_vnd || 0));
      fallback.videoUnitCostVnd = Math.max(0, Number(row.video_unit_cost_vnd || 0));
      fallback.dailyBudgetVnd = Math.max(0, Number(row.daily_budget_vnd || 0));
      fallback.monthlyBudgetVnd = Math.max(0, Number(row.monthly_budget_vnd || 0));
      fallback.geminiApiKey = await decryptGeminiApiKey(row.encrypted_gemini_api_key as string | undefined);
    }
  } catch {
    // Keep the deployed Edge secret configuration until the migration exists.
  }
  runtimeSettingsCache = fallback;
  runtimeSettingsCacheExpiresAt = Date.now() + runtimeSettingsCacheTtlMs;
  return fallback;
}

async function activePrompt(): Promise<PromptVersion> {
  const rows = await selectCatalog(
    "studio_prompt_versions",
    "slug=eq.outfit-image&is_active=eq.true&select=id,version,model,system_prompt&limit=1",
  );
  if (!rows.length) throw new Error("No active Studio prompt version is configured.");
  return rows[0] as PromptVersion;
}

function costEstimate(input: LookRequest, settings: RuntimeSettings): CostEstimate {
  const generationType = input.generationType || "image";
  const imageCount = input.planning ? 1 : 5;
  const videoCount = generationType === "video" || generationType === "both" ? 4 : 0;
  return {
    imageCount,
    videoCount,
    estimatedCostVnd: imageCount * settings.imageUnitCostVnd + videoCount * settings.videoUnitCostVnd,
  };
}

async function estimatedUsageSince(isoDate: string) {
  const rows = await selectCatalog(
    "generation_jobs",
    `created_at=gte.${encodeURIComponent(isoDate)}&status=neq.cancelled&select=estimated_cost_vnd&limit=1000`,
  );
  return rows.reduce((total: number, row: Record<string, unknown>) =>
    total + Number(row.estimated_cost_vnd || 0), 0);
}

async function createJob(input: LookRequest, promptVersionId: string, settings: RuntimeSettings, owner: string, user: string | null) {
  const estimate = costEstimate(input, settings);
  const response = await rest("rpc/reserve_local_generation", {
    method: "POST",
    body: JSON.stringify({ p_request: input.clientRequestId, p_user: user, p_owner: owner,
      p_input: { ...persistedInput(input), _provider: "supabase-edge", _estimate: estimate.estimatedCostVnd } }),
  });
  const rows = await response.json();
  const reserved = rows[0];
  if (!reserved?.id) throw new Error("Unable to register generation.");
  if (reserved.deleted_at || (input.collectionId && reserved.collection_id && reserved.collection_id !== input.collectionId)) throw new Error('Generation does not belong to the active collection.');
  if (input.collectionId) await rest(`generation_jobs?id=eq.${encodeURIComponent(reserved.id)}&collection_id=is.null`, { method: 'PATCH', body: JSON.stringify({ collection_id: input.collectionId }) });
  if (reserved.status !== "queued") return { id: reserved.id as string, existing: true };
  const claimed = await rest(`generation_jobs?id=eq.${encodeURIComponent(reserved.id)}&status=eq.queued`, {
    method: "PATCH", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ status: "processing", prompt_version_id: promptVersionId,
      image_count: estimate.imageCount, video_count: estimate.videoCount }),
  });
  const updated = await claimed.json();
  return { id: reserved.id as string, existing: !updated.length };
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
    `id=eq.${encodeURIComponent(jobId)}&deleted_at=is.null&select=id,user_id,owner_session_hash,client_request_id,status,output,estimated_cost_vnd,image_count,video_count,error_message,created_at,updated_at,completed_at&limit=1`,
  );
  return rows[0] || null;
}

async function getJobByRequestId(requestId: string) {
  const rows = await selectCatalog(
    "generation_jobs",
    `client_request_id=eq.${encodeURIComponent(requestId)}&deleted_at=is.null&select=id,user_id,owner_session_hash,client_request_id,status,output,estimated_cost_vnd,image_count,video_count,error_message,created_at,updated_at,completed_at&limit=1`,
  );
  return rows[0] || null;
}

function jobResponse(job: Record<string, any>) {
  return {
    jobId: job.id,
    requestId: job.client_request_id,
    status: job.status,
    output: job.output || {},
    estimatedCostVnd: Number(job.estimated_cost_vnd || 0),
    usage: {
      imageCount: Number(job.image_count || 0),
      videoCount: Number(job.video_count || 0),
    },
    error: job.error_message || null,
    createdAt: job.created_at,
    updatedAt: job.updated_at,
    completedAt: job.completed_at,
  };
}

async function askGemini(
  request: LookRequest,
  catalog: Record<string, unknown>,
  promptVersion: PromptVersion,
  settings: RuntimeSettings,
) {
  const model = settings.textModel;
  const config = providerConfig(false, settings);
  const endpoint = modelEndpoint(config, model, "generateContent");
  const prompt = [
    promptVersion.system_prompt,
    "Return JSON with keys: story, guardrail, genZTip, culturalScore, imagePrompt, confidence.",
    `Selected event: ${JSON.stringify(request.eventSlug)}`,
    `Location: ${JSON.stringify(request.location)}`,
    `Season: ${JSON.stringify(request.season)}`,
    `Weather: ${JSON.stringify(request.weather)}`,
    `Audience/use case: ${JSON.stringify(request.audience)}`,
    `Selected garment: ${JSON.stringify(request.garmentSlug)}`,
    `Selected concrete garment variant: ${JSON.stringify(request.garmentVariantSlug)}`,
    `Selected accessories: ${JSON.stringify(request.accessorySlugs || [])}`,
    `Selected concrete accessory variants: ${JSON.stringify(request.accessoryVariantSlugs || [])}`,
    `Selected color: ${JSON.stringify(request.colorSlug)}`,
    `Selected pattern: ${JSON.stringify(request.patternSlug)}`,
    `Selected style: ${JSON.stringify(request.styleSlug)}`,
    `Selected scene: ${JSON.stringify(request.sceneSlug)}`,
    `Base look locks: ${JSON.stringify(request.locks || {})}`,
    `Catalog facts: ${JSON.stringify(selectedCatalog(request, catalog))}`,
    ...(request.planning ? [`Group wear plan: ${JSON.stringify(request.planning)}. Explain all selected garment types without inventing weather or historical facts.`] : []),
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
  return parseGeminiCopy(text);
}

function selectedCatalog(request: LookRequest, catalog: Record<string, any>) {
  const outfits = request.planning?.people.map(p => p.outfit) || [{ garment: request.garmentSlug, garmentVariant: request.garmentVariantSlug,
    color: request.colorSlug, pattern: request.patternSlug, style: request.styleSlug, scene: request.sceneSlug,
    accessories: request.accessorySlugs || [], accessoryVariants: request.accessoryVariantSlugs || [] }];
  const selected = (rows: any[], values: unknown[]) => (rows || []).filter(row => values.includes(row.slug));
  return { event: catalog.event,
    garments: selected(catalog.garments || [catalog.garment], outfits.map(o => o.garment)),
    garmentVariants: selected(catalog.garmentVariants || [catalog.garmentVariant].filter(Boolean), outfits.map(o => o.garmentVariant)),
    accessories: selected(catalog.accessories, outfits.flatMap(o => o.accessories)),
    accessoryVariants: selected(catalog.accessoryVariants, outfits.flatMap(o => o.accessoryVariants)),
    options: selected(catalog.options, outfits.flatMap(o => [o.color,o.pattern,o.style,o.scene])),
    rules: (catalog.rules || []).filter((rule: any) => !rule.context || rule.context === 'all' || rule.context === request.eventSlug) };
}

async function reviewImage(request: LookRequest, catalog: Record<string, any>, image: { bytes: string; mimeType: string }, settings: RuntimeSettings, garmentReferences: GarmentReference[] = []) {
  if (!request.planning) throw new Error('Review requires a normalized plan.');
  const selected = planPrompt(request.planning, catalog);
  const prompt = reviewPrompt(selected.slice(selected.indexOf('\n') + 1) + '\nCatalog facts: ' + JSON.stringify(selectedCatalog(request, catalog)))
    + '\nThe first attachment is the generated photograph to assess, not a sample. Compare garment construction with the final sample photographs.\n' + garmentReferenceInstructions(garmentReferences);
  let response: Response;
  if (settings.imageProvider === 'webapi') {
    const url = Deno.env.get('GEMINI_WEB_BRIDGE_URL')?.replace(/\/+$/, ''), secret = Deno.env.get('GEMINI_WEB_BRIDGE_SECRET');
    if (!url || !secret) throw new Error('Review bridge is not configured.');
    response = await fetch(`${url}/v1/images/generate`, { method: 'POST', signal: AbortSignal.timeout(45000),
      headers: { 'Content-Type':'application/json', 'x-vremix-bridge-secret':secret },
      body: JSON.stringify({ operation:'review', prompt, sourceImage:{ mimeType:image.mimeType,data:image.bytes }, garmentReferences }) });
  } else {
    const config = providerConfig(false, settings);
    response = await fetch(modelEndpoint(config, settings.textModel, 'generateContent'), { method:'POST', signal:AbortSignal.timeout(45000),
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({contents:[{role:'user',parts:[{text:prompt},{inline_data:{mime_type:image.mimeType,data:image.bytes}}, ...garmentReferences.map(r => ({inline_data:{mime_type:r.mimeType,data:r.data}}))]}],
        generationConfig:{responseMimeType:'application/json',temperature:0.1} }) });
  }
  if (!response.ok) throw await providerError(response, settings.imageProvider === 'webapi' ? 'Gemini Web bridge' : 'Gemini review');
  const body = await response.json();
  const text = settings.imageProvider === 'webapi' ? body.text : body?.candidates?.[0]?.content?.parts?.map((p: any) => p.text || '').join('');
  if (typeof text !== 'string') throw new Error('Empty review.');
  return { copy:selectionCopy(parseGeminiCopy(text), request, catalog), assessment:parseImageAssessment(JSON.parse(text).imageAssessment, request.planning, true, true) };
}

async function generateImages(
  prompt: string,
  inputImage: LookRequest["inputImage"],
  settings: RuntimeSettings,
  maximumVariants = settings.imageVariants,
  request?: LookRequest,
  garmentReferences: GarmentReference[] = [],
): Promise<{ bytes: string; mimeType: string }[]> {
  const model = settings.imageModel;
  const variants = request?.planning ? [{ key: 'Look', label: 'complete group composition', scope: 'all specified people and their assigned outfits in one photo' }] : [
    { key: "A", label: "locked source frame", scope: "fixed subject identity, face, pose, camera angle and composition" },
    { key: "B", label: "background and scene", scope: request?.framePlan?.B?.changeScope || "background and scene only" },
    { key: "C", label: "lighting and time of day", scope: request?.framePlan?.C?.changeScope || "lighting and time of day only" },
    { key: "D", label: "clothing and garment styling", scope: request?.framePlan?.D?.changeScope || "clothing only" },
    { key: "E", label: "subject identity", scope: request?.framePlan?.E?.changeScope || "subject identity only; preserve position and scale" },
  ];
  const images: { bytes: string; mimeType: string }[] = [];
  const variantCount = Math.min(variants.length, Math.max(1, maximumVariants));
  const aspectRatio = request?.aspectRatio || "16:9";
  const targetResolution = request?.targetResolution || "1080";
  const mode = request?.generationMode || (inputImage ? "image-to-image" : "text-to-image");
  let source = inputImage;
  for (let index = 0; index < variantCount; index += 1) {
    const variant = variants[index];
    let image: { data: string; mimeType: string } | null = null;
    let response: Response | null = null;
    if (settings.imageProvider === "webapi") {
      const bridgeUrl = Deno.env.get("GEMINI_WEB_BRIDGE_URL")?.replace(/\/+$/, "");
      const bridgeSecret = Deno.env.get("GEMINI_WEB_BRIDGE_SECRET");
      if (!bridgeUrl || !bridgeSecret) throw new Error("Gemini Web bridge is not configured.");
      response = await fetch(`${bridgeUrl}/v1/images/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-vremix-bridge-secret": bridgeSecret,
        },
        body: JSON.stringify({
          prompt,
          aspectRatio,
          targetResolution,
          changeScope: request?.editInstruction || (request?.planning ? 'Create ONE complete photo of the specified people and their chosen outfits. The supplied image is a face reference sheet, not a frame to preserve.' : variant.scope),
          operation: request?.editInstruction ? 'group-edit' : request?.planning ? 'group' : 'edit',
          sourceImage: source ? { mimeType: source.mimeType, data: source.data } : null,
          referenceImages: request?.faceReferenceImage ? [request.faceReferenceImage] : [],
          garmentReferences,
        }),
      });
      if (response.ok) {
        const body = await response.json();
        const first = body?.images?.[0];
        if (first?.data) image = {
          data: String(first.data),
          mimeType: String(first.mimeType || "image/png"),
        };
      }
    } else {
      const config = providerConfig(false, settings);
      const endpoint = modelEndpoint(config, model, "generateContent");
      response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildImageRequest(
          prompt,
          `${variant.key}: ${variant.label}`,
          source,
          {
            aspectRatio,
            targetResolution,
            operation: request?.editInstruction ? 'group-edit' : request?.planning ? 'group' : index === 0 && mode === "text-to-image" ? "base" : "edit",
            changeScope: request?.editInstruction || variant.scope,
            references: request?.faceReferenceImage ? [request.faceReferenceImage] : [],
            garmentReferences,
          },
        )),
      });
      if (response.ok) {
        const body = await response.json();
        const imagePart = body?.candidates?.[0]?.content?.parts?.find((part: any) =>
          part.inlineData?.data || part.inline_data?.data
        );
        const inline = imagePart?.inlineData || imagePart?.inline_data;
        if (inline?.data) image = {
          data: String(inline.data),
          mimeType: String(inline.mimeType || inline.mime_type || "image/png"),
        };
      }
    }
    if (!response?.ok || !image) {
      const error = response
        ? await providerError(response, settings.imageProvider === "webapi" ? "Gemini Web bridge" : "Gemini image model")
        : new Error("Image provider returned no response.");
      // Preserve every usable look when a later variant hits a transient or
      // provider limit. A failed first variant remains a real job failure.
      if (images.length > 0) break;
      throw error;
    }
    const generated = {
      bytes: image.data,
      mimeType: image.mimeType,
    };
    images.push(generated);
    // Every destination frame is edited from A, never from the previous edit.
    // This keeps camera geometry and subject identity anchored to the source.
    if (index === 0) source = { data: generated.bytes, mimeType: generated.mimeType };
  }
  return images;
}

async function startVideoOperation(
  prompt: string,
  firstFrame: VideoFirstFrame,
  lastFrame: VideoFirstFrame | undefined,
  settings: RuntimeSettings,
  aspectRatio = "16:9",
) {
  const config = providerConfig(true, settings);
  const model = settings.videoModel
    || (config.vertex ? "veo-3.1-fast-generate-001" : "veo-3.1-generate-preview");
  const requestBody = buildVideoRequest(model, prompt, firstFrame, lastFrame, aspectRatio);
  const response = config.bridgeUrl
    ? await fetch(`${config.bridgeUrl.replace(/\/+$/, "")}/v1/veo/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vremix-bridge-secret": config.bridgeSecret || "",
      },
      body: JSON.stringify(requestBody),
    })
    : await fetch(modelEndpoint(config, model, "predictLongRunning"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instances: requestBody.instances, parameters: requestBody.parameters }),
    });
  if (!response.ok) throw await providerError(response, "Veo");
  const responseBody = await response.json();
  if (!responseBody?.name) throw new Error("Veo returned no operation id.");
  return String(responseBody.name);
}

async function readVideoOperation(operationName: string, settings: RuntimeSettings) {
  const config = providerConfig(true, settings);
  const response = config.bridgeUrl
    ? await fetch(`${config.bridgeUrl.replace(/\/+$/, "")}/v1/veo/operation?name=${encodeURIComponent(operationName)}`, {
      headers: { "x-vremix-bridge-secret": config.bridgeSecret || "" },
    })
    : await fetch(operationEndpoint(config, operationName));
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

function findVideoBytes(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (typeof record.bytesBase64Encoded === "string") return record.bytesBase64Encoded;
  for (const child of Object.values(record)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const found = findVideoBytes(item);
        if (found) return found;
      }
    } else {
      const found = findVideoBytes(child);
      if (found) return found;
    }
  }
  return null;
}

async function downloadVideo(uri: string, settings: RuntimeSettings) {
  const config = providerConfig(true, settings);
  const response = config.bridgeUrl
    ? await fetch(`${config.bridgeUrl.replace(/\/+$/, "")}/v1/veo/download?uri=${encodeURIComponent(uri)}`, {
      headers: { "x-vremix-bridge-secret": config.bridgeSecret || "" },
    })
    : await fetch(uri, { headers: { "x-goog-api-key": config.apiKey } });
  if (!response.ok) throw await providerError(response, "Veo video download");
  return {
    bytes: await response.arrayBuffer(),
    mimeType: response.headers.get("content-type") || "video/mp4",
  };
}

async function storeVideo(jobId: string, uri: string, settings: RuntimeSettings, key = "lookbook") {
  await ensureStorageBucket();
  const video = await downloadVideo(uri, settings);
  const path = `${jobId}/${key}-video.mp4`;
  await uploadBytes(path, video.bytes, video.mimeType);
  return {
    path,
    url: await signedUrl(path),
    mimeType: video.mimeType,
  };
}

async function storeVideoBytes(jobId: string, bytes: string, mimeType = "video/mp4", key = "lookbook") {
  await ensureStorageBucket();
  const path = `${jobId}/${key}-video.mp4`;
  const binary = Uint8Array.from(atob(bytes), (character) => character.charCodeAt(0));
  await uploadBytes(path, binary, mimeType);
  return {
    path,
    url: await signedUrl(path),
    mimeType,
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
      ...(imageDimensions(images[index].bytes) || {}),
      path,
      url: await signedUrl(path),
      mimeType: images[index].mimeType,
      index: index + 1,
    });
  }
  return assets;
}

async function processLook(
  job: { id: string },
  input: LookRequest,
  promptVersion: PromptVersion,
  settings: RuntimeSettings,
) {
  await updateJob(job.id, "processing", { stage: 'catalog' });
  const [event, garment, garmentVariant, accessories, accessoryVariants, options, rules] = await Promise.all([
    input.eventSlug === 'custom' && input.planning?.customOccasion
      ? Promise.resolve([{ slug: 'custom', label: input.planning.customOccasion, description: 'User preference only; not reviewed cultural knowledge. Do not claim this occasion or outfit suitability is culturally verified.', cultural_context: 'Dịp tự nhập; cần kiểm tra độ phù hợp.', review_status: 'user-input', preset: {} }])
      : selectCatalog("studio_events", `slug=eq.${encodeURIComponent(input.eventSlug || "")}&is_active=eq.true&select=slug,label,description,cultural_context,preset`),
    selectCatalog("studio_garments", `${input.planning ? '' : `slug=eq.${encodeURIComponent(input.garmentSlug || "")}&`}is_active=eq.true&select=id,slug,name,category,description,origin_note,significance_note,image_url,prompt_descriptor,negative_descriptor`),
    selectCatalog("studio_garment_variants", `${input.planning ? '' : `slug=eq.${encodeURIComponent(input.garmentVariantSlug || "")}&`}is_active=eq.true&review_status=eq.published&select=id,garment_id,slug,name,description,silhouette,material,pattern_notes,color_palette,image_url,thumbnail_url,prompt_descriptor,negative_descriptor,source_url,source_provider`),
    selectCatalog("studio_accessories", `${input.planning ? '' : input.accessorySlugs?.length ? `slug=in.(${input.accessorySlugs.map(encodeURIComponent).join(",")})&` : "slug=eq.__none__&"}is_active=eq.true&select=id,slug,name,description,prompt_descriptor`),
    selectCatalog("studio_accessory_variants", `${input.planning ? '' : input.accessoryVariantSlugs?.length ? `slug=in.(${input.accessoryVariantSlugs.map(encodeURIComponent).join(",")})&` : "slug=eq.__none__&"}is_active=eq.true&review_status=eq.published&select=id,accessory_id,slug,name,description,material,color_palette,image_url,prompt_descriptor,source_url,source_provider`),
    selectCatalog("studio_options", "is_active=eq.true&select=option_type,slug,label,value,prompt_hint"),
    selectCatalog("cultural_rules", `is_active=eq.true&review_status=eq.approved&select=garment_id,rule_text,severity,context`),
  ]);
  if (!event.length || !garment.length) throw new Error("Selection is not in the approved catalog.");
  if (!input.planning && input.garmentVariantSlug && (!garmentVariant.length || garmentVariant[0].garment_id !== garment[0].id)) {
    throw new Error("Selected garment variant does not belong to the approved garment type.");
  }
  if (!input.planning && (input.accessoryVariantSlugs?.length || 0) !== accessoryVariants.length) {
    throw new Error("One or more accessory variants are not in the approved catalog.");
  }

  for (const item of garment) {
    const heritage = knowledge.heritage[item.slug as keyof typeof knowledge.heritage];
    if (heritage) { item.origin_note = heritage.origin; item.significance_note = heritage.meaning; item.heritage = heritage; }
  }
  const catalog = {
    event: event[0],
    garment: garment.find((g: any) => g.slug === input.garmentSlug) || garment[0],
    garmentVariant: garmentVariant.find((v: any) => v.slug === input.garmentVariantSlug) || null,
    garments: garment,
    garmentVariants: garmentVariant,
    accessories,
    accessoryVariants,
    options,
    rules: rules.filter((rule: Record<string, unknown>) => !rule.garment_id || (input.planning
      ? input.planning.people.some((person) => garment.some((g: any) => g.slug === person.outfit.garment && g.id === rule.garment_id))
      : rule.garment_id === garment[0].id)),
  };
  // Resolve every person's approved selection before calling any AI provider.
  const groupPrompt = input.planning ? groupImagePrompt(input.planning, catalog, promptVersion.system_prompt) : '';
  // Resolve binary samples server-side, before any quota-consuming provider call.
  let garmentReferences: GarmentReference[] = [];
  if (input.planning) {
    try { garmentReferences = await loadGarmentReferences(input.planning, catalog, serviceConfig().url, fetch,
      Deno.env.get('VREMIX_CATALOG_ORIGIN') || 'https://v-remix.vietnamsir.com'); }
    catch { throw new Error('CATALOG_REFERENCE_UNAVAILABLE: Selected garment sample could not be loaded. No image provider was called.'); }
  }
  let copy: Awaited<ReturnType<typeof askGemini>> | ReturnType<typeof fallbackCopy>;
  let copySource: "gemini" | "catalog-fallback" = "gemini";
  let copyWarning: string | undefined;
  try {
    // Web provider reviews the generated image and writes copy in ONE later text call.
    // Do not call an unrelated official API key before image generation.
    if (input.planning) {
      copy = fallbackCopy(input, catalog); copySource = 'catalog-fallback';
    } else copy = await askGemini(input, catalog, promptVersion, settings);
  } catch (error) {
    // Catalog facts are already approved, so they provide a truthful fallback
    // for the copy layer while the image provider can still finish the job.
    copy = fallbackCopy(input, catalog);
    copySource = "catalog-fallback";
    copyWarning = error instanceof Error
      ? `Gemini copy fallback: ${error.message}`
      : "Gemini copy fallback was used.";
  }
  const adviceContext = input.recommendationContext ? `\nDated advisory context (never override selected outfits, event or scene, never invent weather outside the forecast dates): ${JSON.stringify(input.recommendationContext)}\n` : '';
  const imagePrompt = input.planning ? groupPrompt + `\nEvent: ${JSON.stringify(event[0])}\n` + adviceContext + garmentReferenceInstructions(garmentReferences) : copy.imagePrompt || fallbackImagePrompt(input, catalog);
  const generationType = input.generationType || "image";
  let assets: GeneratedAsset[] = [];
  let imageSource: "gemini" | "catalog-fallback" = "gemini";
  let imageWarning: string | undefined;
  let videoFirstFrame: VideoFirstFrame | undefined;
  let videoFrames: Array<{ bytes: string; mimeType: string }> = [];
  let imageAssessment: ImageAssessment = {status:'not-assessed',source:'not-assessed'};
  let reviewStatus = 'not-requested';
  if (generationType === "image" || generationType === "video" || generationType === "both") {
    try {
      await updateJob(job.id, 'processing', { stage: 'generating' });
      const generated = await generateImages(
        imagePrompt,
        input.inputImage,
        settings,
        input.planning ? 1 : 5,
        input,
        garmentReferences,
      );
      assets = await storeLookbook(job.id, generated);
      if (input.planning && generated[0]) {
        try {
          await updateJob(job.id, 'processing', { stage: 'reviewing' });
          const review = await reviewImage(input, catalog, generated[0], settings, garmentReferences);
          copy = review.copy; copySource = 'gemini'; copyWarning = undefined;
          imageAssessment = review.assessment;
          reviewStatus = 'completed';
        } catch (error) {
          // Keep the usable image. Never replay a generation or fabricate a pass/score.
          imageAssessment = {status:'not-assessed',source:'not-assessed'};
          const message = error instanceof Error ? error.message : '';
          reviewStatus = /HTTP 403/.test(message) ? 'provider-forbidden' : /PROVIDER_SESSION_EXPIRED/.test(message) ? 'provider-session-expired' : 'unavailable';
        }
      }
      videoFrames = generated;
      if (generated[0]) {
        videoFirstFrame = {
          mimeType: generated[0].mimeType,
          data: generated[0].bytes,
        };
      }
    } catch (error) {
      if (input.planning) throw error; // A catalog photo is not a generated group photo.
      const url = typeof catalog.garment.image_url === "string"
        ? catalog.garment.image_url.trim()
        : "";
      if (!url) throw error;
      assets = [{
        path: `catalog/${catalog.garment.slug || "garment"}`,
        url,
        mimeType: "image/*",
        index: 1,
      }];
      imageSource = "catalog-fallback";
      imageWarning = error instanceof Error
        ? `Image fallback: ${error.message}`
        : "Catalog image fallback was used.";
    }
  }

  const output: GenerationOutput = {
    ...copy,
    generationType,
    copySource,
    ...(input.planning ? { narrativeSource: 'selected-catalog', promptPolicy: 'versioned-group-v2' } : {}),
    culturalScoreSource: copySource === "gemini" ? "gemini-selection-assessment" : "not-assessed",
    ...(copyWarning ? { copyWarning } : {}),
    imageSource,
    imageAssessment,
    reviewStatus,
    ...(input.planning ? { garmentReferences: { status: garmentReferences.length ? 'attached' : 'unavailable',
      items: garmentReferences.map(({data: _data, mimeType: _mime, ...mapping}) => mapping) }, copyPolicy: 'selected-catalog-only' } : {}),
    ...(imageWarning ? { imageWarning } : {}),
    promptVersion: { id: promptVersion.id, version: promptVersion.version, model: promptVersion.model },
    imagePrompt,
    ...(input.planning ? { planning: input.planning, workflowVersion: 'studio-group-v1' } : {}),
    costEstimate: costEstimate(input, settings),
    imageUrl: assets[0]?.url || null,
    lookbook: {
    aspectRatio: input.aspectRatio || "16:9",
      items: assets,
    },
  };
  if (generationType === "video" || generationType === "both") {
    try {
      if (!videoFirstFrame) {
        throw new Error("Veo was not started because no generated lookbook first frame is available.");
      }
      output.videoFirstFrame = {
        source: "generated-lookbook",
        path: assets[0]?.path || null,
        mimeType: videoFirstFrame.mimeType,
      };
      const destinations = videoFrames.slice(1, 5);
      const operations: Array<{ key: string; name: string }> = [];
      for (let index = 0; index < destinations.length; index += 1) {
        const key = ["B", "C", "D", "E"][index];
        const name = await startVideoOperation(
          `${imagePrompt}\nTransition branch ${key}: ${input.framePlan?.[key]?.changeScope || key}.`,
          videoFirstFrame,
          { mimeType: destinations[index].mimeType, data: destinations[index].bytes },
          settings,
          input.aspectRatio || "16:9",
        );
        operations.push({ key, name });
      }
      if (!operations.length) throw new Error("No destination frames were available for Veo.");
      output.providerOperations = operations;
      output.providerOperation = operations[0].name;
      output.videoStatus = "processing";
    } catch (error) {
      if (!assets.length) throw error;
      output.videoStatus = "failed";
      output.videoError = error instanceof Error ? error.message : "Unable to start Veo generation.";
    }
  }
  return output;
}

function hasLookbook(output: GenerationOutput) {
  return Array.isArray(output.lookbook?.items) && output.lookbook.items.length > 0;
}

async function completeWithoutVideo(jobId: string, output: GenerationOutput, message: string) {
  delete output.providerOperation;
  output.video = null;
  output.videoStatus = "failed";
  output.videoError = message;
  await updateJob(jobId, "completed", output);
  return await getJob(jobId);
}

async function refreshVideoJob(job: Record<string, any>, settings: RuntimeSettings) {
  const output: GenerationOutput = { ...(job.output || {}) };
  if (job.status !== "processing" || (!output.providerOperation && !output.providerOperations?.length)) return job;

  if (output.providerOperations?.length) {
    const videos = Array.isArray(output.videos) ? [...output.videos] : [];
    const errors: string[] = [];
    let pending = false;
    for (const providerOperation of output.providerOperations) {
      if (videos.some((video) => video.key === providerOperation.key)) continue;
      const operation = await readVideoOperation(providerOperation.name, settings);
      if (operation.error) {
        errors.push(`${providerOperation.key}: ${operation.error.message || "Veo generation failed."}`);
        continue;
      }
      if (!operation.done) {
        pending = true;
        continue;
      }
      const bytes = findVideoBytes(operation.response);
      const uri = bytes ? null : findVideoUri(operation.response);
      if (!bytes && !uri) {
        errors.push(`${providerOperation.key}: Veo completed without a video asset.`);
        continue;
      }
      const stored = bytes
        ? await storeVideoBytes(job.id, bytes, "video/mp4", providerOperation.key.toLowerCase())
        : await storeVideo(job.id, uri as string, settings, providerOperation.key.toLowerCase());
      videos.push({ key: providerOperation.key, ...stored });
    }
    output.videos = videos;
    output.video = videos[0] || null;
    if (pending) {
      if (errors.length) output.videoError = errors.join(" · ");
      await updateJob(job.id, "processing", output);
      return await getJob(job.id);
    }
    delete output.providerOperations;
    delete output.providerOperation;
    output.videoStatus = videos.length ? "completed" : "failed";
    if (errors.length) output.videoError = errors.join(" · ");
    else delete output.videoError;
    await updateJob(job.id, "completed", output);
    return await getJob(job.id);
  }

  const operation = await readVideoOperation(output.providerOperation as string, settings);
  if (operation.error) {
    const message = operation.error.message || "Veo generation failed.";
    if (hasLookbook(output)) return await completeWithoutVideo(job.id, output, message);
    await updateJob(job.id, "failed", output, message);
    return await getJob(job.id);
  }
  if (!operation.done) return job;

  const bytes = findVideoBytes(operation.response);
  const uri = bytes ? null : findVideoUri(operation.response);
  if (!bytes && !uri) {
    const message = "Veo completed without a video asset.";
    if (hasLookbook(output)) return await completeWithoutVideo(job.id, output, message);
    await updateJob(job.id, "failed", output, message);
    return await getJob(job.id);
  }
  try {
    output.video = bytes
      ? await storeVideoBytes(job.id, bytes)
      : await storeVideo(job.id, uri as string, settings);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to store Veo video.";
    if (hasLookbook(output)) return await completeWithoutVideo(job.id, output, message);
    throw error;
  }
  delete output.providerOperation;
  output.videoStatus = "completed";
  delete output.videoError;
  await updateJob(job.id, "completed", output);
  return await getJob(job.id);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  // All browser requests enter through the session/CSRF-protected PHP gateway.
  // Validate the server gateway independently of the platform's injected legacy
  // JWT representation. Never trust decoded JWT claims or caller headers alone.
  if (!await verifyGateway(request, Deno.env.get('VREMIX_GATEWAY_SECRET'))) return json({ error: 'Server gateway required.' }, 403);
  const owner = request.headers.get('x-vremix-owner') || '';
  const user = request.headers.get('x-vremix-user') || null;
  if (!/^[a-f0-9]{64}$/.test(owner) || (user !== null && !isUuid(user))) return json({ error: 'Invalid caller.' }, 403);

  const url = new URL(request.url);
  if (request.method === "GET") {
    const jobId = url.searchParams.get("jobId");
    const requestId = url.searchParams.get("requestId");
    if (!jobId && !requestId) return json({ error: "jobId or requestId is required." }, 400);
    if (requestId && !isUuid(requestId)) return json({ error: "requestId must be a UUID." }, 400);
    try {
      const settings = await runtimeSettings();
      const current = jobId
        ? await getJob(jobId)
        : await getJobByRequestId(requestId as string);
      if (current && !((user && current.user_id === user) || (current.user_id === null && current.owner_session_hash === owner))) return json({ error: 'Job not found.' }, 404);
      const job = current ? await refreshVideoJob(current, settings) : null;
      if (job?.status === 'completed') {
        for (const item of job.output?.lookbook?.items || []) if (item.path) item.url = await signedUrl(item.path);
      }
      return job ? json(jobResponse(job)) : json({ error: "Job not found." }, 404);
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
  if (!input || typeof input !== 'object' || Array.isArray(input)) return json({ error: 'Invalid request object.' }, 400);
  if (input.collectionId) {
    if (!isUuid(input.collectionId)) return json({ error: 'Invalid collection.' },400);
    const rows = await selectCatalog('studio_collections',`id=eq.${input.collectionId}&select=user_id,deleted_at&limit=1`);
    if (rows.length && (!user || rows[0].user_id !== user || rows[0].deleted_at)) return json({error:'Collection unavailable.'},403);
    if (user && !rows.length) return json({error:'Save collection before generating.'},400);
  }

  const generationType = input.generationType || "image";
  if (input.planning !== undefined) {
    try {
      input.planning = normalizePlan(input.planning);
      if (generationType !== 'image') throw new Error('Luồng bản phối chỉ tạo một ảnh; video được quản lý riêng.');
      if (input.planning.people.some((p) => p.faceSupplied) && !input.inputImage) throw new Error('Ảnh tham khảo chưa được gửi.');
      const outfit = input.planning.people[0].outfit;
      Object.assign(input, { garmentSlug: outfit.garment, garmentVariantSlug: outfit.garmentVariant, accessorySlugs: outfit.accessories, accessoryVariantSlugs: outfit.accessoryVariants, colorSlug: outfit.color, patternSlug: outfit.pattern, styleSlug: outfit.style, sceneSlug: outfit.scene });
    } catch (error) { return json({ error: error instanceof Error ? error.message : 'Bản phối không hợp lệ.' }, 400); }
  }
  if (!["image", "video", "both"].includes(generationType)) {
    return json({ error: "generationType must be image, video or both." }, 400);
  }
  input.generationType = generationType;
  if (input.aspectRatio && !["16:9", "1:1", "9:16"].includes(input.aspectRatio)) {
    return json({ error: "aspectRatio must be 16:9, 1:1 or 9:16." }, 400);
  }
  if (input.targetResolution && !["720", "1080", "2160"].includes(input.targetResolution)) {
    return json({ error: "targetResolution must be 720, 1080 or 2160." }, 400);
  }
  if (input.generationMode && !["text-to-image", "image-to-image"].includes(input.generationMode)) {
    return json({ error: "generationMode must be text-to-image or image-to-image." }, 400);
  }
  if (input.generationMode === "image-to-image" && !input.inputImage) {
    return json({ error: "Image-to-image mode requires a source image for frame A." }, 400);
  }
  if (!isUuid(input.clientRequestId)) {
    return json({ error: "clientRequestId must be a UUID." }, 400);
  }
  if (!input.eventSlug || !input.garmentSlug || !isSafeImage(input.inputImage) || !isSafeImage(input.faceReferenceImage)) {
    return json({ error: "A valid event, garment and optional image are required." }, 400);
  }
  if (input.eventSlug === 'custom' && !input.planning?.customOccasion) return json({ error: 'Nhập tên dịp của bạn để tiếp tục.' }, 400);

  let job: { id: string; existing: boolean } | null = null;
  try {
    const settings = await runtimeSettings();
    const promptVersion = await activePrompt();
    job = await createJob(input, promptVersion.id, settings, owner, user);
    if (job.existing) {
      const current = await getJob(job.id);
      const resumed = current ? await refreshVideoJob(current, settings) : null;
      if (!resumed) throw new Error("Existing generation job could not be loaded.");
      return json(jobResponse(resumed), resumed.status === "processing" || resumed.status === "queued" ? 202 : 200);
    }
    // Supabase keeps this promise alive after the HTTP 202. The PHP gateway no
    // longer has to wait for image creation plus review inside its 110s timeout.
    const runtime = (globalThis as unknown as { EdgeRuntime?: { waitUntil: (work: Promise<unknown>) => void } }).EdgeRuntime;
    if (input.planning && runtime?.waitUntil) {
      const current = await getJob(job.id);
      if (!current) throw new Error('Generation job could not be loaded.');
      const claimed = job;
      runtime.waitUntil(runClaimedJob(
        () => processLook(claimed, input, promptVersion, settings),
        (status, output, error) => updateJob(claimed.id, status, output, error),
      ));
      return json(jobResponse(current), 202);
    }
    const output = await processLook(job, input, promptVersion, settings);
    if (output.providerOperation) {
      await updateJob(job.id, "processing", output);
      const processing = await getJob(job.id);
      if (!processing) throw new Error("Generation job disappeared after starting.");
      return json(jobResponse(processing), 202);
    }
    await updateJob(job.id, "completed", output);
    const completed = await getJob(job.id);
    if (!completed) throw new Error("Generation job disappeared after completion.");
    return json(jobResponse(completed));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Generation failed.";
    if (job && !job.existing) {
      try {
        await updateJob(job.id, "failed", {}, message);
      } catch {
        // Preserve the original provider error in the HTTP response.
      }
    }
    return json({ jobId: job?.id || null, status: "failed", error: message }, 502);
  }
});
