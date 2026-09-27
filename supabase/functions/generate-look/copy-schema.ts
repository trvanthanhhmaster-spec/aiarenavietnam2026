export type GeminiCopy = {
  story: string;
  guardrail: string;
  genZTip: string;
  imagePrompt: string;
  confidence: number;
};

const limits: Record<keyof Omit<GeminiCopy, "confidence">, [number, number]> = {
  story: [20, 1_200],
  guardrail: [20, 800],
  genZTip: [10, 500],
  imagePrompt: [40, 3_000],
};

function requiredText(
  value: unknown,
  field: keyof Omit<GeminiCopy, "confidence">,
) {
  if (typeof value !== "string") {
    throw new Error(`Gemini output field "${field}" must be text.`);
  }
  const normalized = value.trim();
  const [minimum, maximum] = limits[field];
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new Error(
      `Gemini output field "${field}" must contain ${minimum}-${maximum} characters.`,
    );
  }
  return normalized;
}

export function parseGeminiCopy(text: string): GeminiCopy {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error("Gemini returned invalid JSON.");
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Gemini output must be a JSON object.");
  }

  const record = value as Record<string, unknown>;
  const confidence = typeof record.confidence === "number"
    ? record.confidence
    : Number(record.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw new Error('Gemini output field "confidence" must be between 0 and 1.');
  }

  return {
    story: requiredText(record.story, "story"),
    guardrail: requiredText(record.guardrail ?? record.guardrails, "guardrail"),
    genZTip: requiredText(record.genZTip ?? record.gen_z_tip, "genZTip"),
    imagePrompt: requiredText(record.imagePrompt ?? record.image_prompt, "imagePrompt"),
    confidence,
  };
}
