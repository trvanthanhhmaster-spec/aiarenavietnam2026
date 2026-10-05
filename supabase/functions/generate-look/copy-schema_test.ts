import { parseGeminiCopy } from "./copy-schema.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function assertThrows(action: () => unknown, expected: string) {
  try {
    action();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    assert(message.includes(expected), `Expected "${expected}", received "${message}".`);
    return;
  }
  throw new Error(`Expected an error containing "${expected}".`);
}

Deno.test("parseGeminiCopy accepts the complete Studio contract", () => {
  const result = parseGeminiCopy(JSON.stringify({
    story: "Áo ngũ thân được đặt trong bối cảnh học đường hiện đại nhưng vẫn giữ cấu trúc nhận diện.",
    guardrail: "Giữ nguyên cổ áo, hàng cúc, các thân áo và không gán thêm chi tiết lịch sử chưa được kiểm chứng.",
    genZTip: "Chỉ dùng sneaker trắng làm điểm nhấn để dáng áo vẫn là trung tâm.",
    culturalScore: 92,
    imagePrompt: "Full-body editorial portrait, Vietnamese ao ngu than, preserved collar, panels and buttons, 9:16 composition.",
    confidence: 0.86,
  }));

  assert(result.confidence === 0.86, "Confidence should be preserved.");
  assert(result.culturalScore === 92, "Cultural score should be preserved.");
  assert(result.story.startsWith("Áo ngũ thân"), "Story should be normalized.");
});

Deno.test("parseGeminiCopy rejects missing cultural guardrails", () => {
  assertThrows(() => parseGeminiCopy(JSON.stringify({
    story: "Một bản phối có mô tả đủ dài để vượt qua kiểm tra tối thiểu.",
    genZTip: "Phối phụ kiện có tiết chế.",
    culturalScore: 88,
    imagePrompt: "A sufficiently detailed full-body Vietnamese fashion portrait prompt for a vertical lookbook.",
    confidence: 0.8,
  })), 'field "guardrail"');
});

Deno.test("parseGeminiCopy rejects confidence outside the contract", () => {
  assertThrows(() => parseGeminiCopy(JSON.stringify({
    story: "Một bản phối có mô tả đủ dài để vượt qua kiểm tra tối thiểu.",
    guardrail: "Giữ đúng cấu trúc trang phục và không bịa đặt thông tin lịch sử.",
    genZTip: "Phối phụ kiện có tiết chế.",
    culturalScore: 88,
    imagePrompt: "A sufficiently detailed full-body Vietnamese fashion portrait prompt for a vertical lookbook.",
    confidence: 4,
  })), "between 0 and 1");
});

Deno.test("parseGeminiCopy normalizes legacy prompt field aliases", () => {
  const result = parseGeminiCopy(JSON.stringify({
    story: "Một bản phối có mô tả đủ dài để vượt qua kiểm tra tối thiểu.",
    guardrails: "Giữ đúng cấu trúc trang phục và không bịa đặt thông tin lịch sử.",
    gen_z_tip: "Phối phụ kiện có tiết chế.",
    image_prompt: "A sufficiently detailed full-body Vietnamese fashion portrait prompt for a vertical lookbook.",
    cultural_score: "84",
    confidence: "0.75",
  }));

  assert(result.guardrail.startsWith("Giữ đúng"), "Guardrail alias should be normalized.");
  assert(result.confidence === 0.75, "Numeric confidence strings should be normalized.");
  assert(result.culturalScore === 84, "Numeric cultural score strings should be normalized.");
});

Deno.test("parseGeminiCopy rejects non-JSON provider output", () => {
  assertThrows(() => parseGeminiCopy("```json\n{}\n```"), "invalid JSON");
});
