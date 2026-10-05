export type GeminiCopy = {
  story: string;
  guardrail: string;
  genZTip: string;
  culturalScore: number;
  imagePrompt: string;
  confidence: number;
};

const limits: Record<"story" | "guardrail" | "genZTip" | "imagePrompt", [number, number]> = {
  story: [20, 1_200],
  guardrail: [20, 800],
  genZTip: [10, 500],
  imagePrompt: [40, 3_000],
};

function requiredText(
  value: unknown,
  field: "story" | "guardrail" | "genZTip" | "imagePrompt",
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
  const scoreValue = record.culturalScore ?? record.cultural_score;
  const culturalScore = typeof scoreValue === "number" || (typeof scoreValue === "string" && scoreValue.trim() !== "")
    ? Number(scoreValue)
    : NaN;
  if (!Number.isFinite(culturalScore) || culturalScore < 0 || culturalScore > 100) {
    throw new Error('Gemini output field "culturalScore" must be between 0 and 100.');
  }

  return {
    story: requiredText(record.story, "story"),
    guardrail: requiredText(record.guardrail ?? record.guardrails, "guardrail"),
    genZTip: requiredText(record.genZTip ?? record.gen_z_tip, "genZTip"),
    culturalScore: Math.round(culturalScore * 100) / 100,
    imagePrompt: requiredText(record.imagePrompt ?? record.image_prompt, "imagePrompt"),
    confidence,
  };
}
