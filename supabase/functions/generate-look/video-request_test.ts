import { buildVideoRequest } from "./video-request.ts";

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

Deno.test("Veo request uses the generated lookbook as first frame", () => {
  const request = buildVideoRequest(
    "veo-3.1-fast-generate-001",
    "Áo Nhật Bình editorial portrait.",
    { mimeType: "image/png", data: "ZmFrZS1sb29rYm9vaw==" },
  );

  assert(request.instances[0].image.mimeType === "image/png", "First-frame MIME type should be preserved.");
  assert(request.instances[0].image.bytesBase64Encoded === "ZmFrZS1sb29rYm9vaw==", "First-frame bytes should be preserved.");
  assert(request.instances[0].prompt.includes("supplied first frame"), "Prompt must anchor identity to the first frame.");
  assert(request.parameters.aspectRatio === "9:16", "Veo output must stay portrait.");
  assert(request.parameters.durationSeconds === 8, "Audition video should remain eight seconds.");
});

Deno.test("Veo request rejects a missing first frame", () => {
  assertThrows(
    () => buildVideoRequest("veo", "prompt", { mimeType: "image/png", data: "" }),
    "approved lookbook first frame",
  );
});
