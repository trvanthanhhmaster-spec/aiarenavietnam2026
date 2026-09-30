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

Deno.test("Veo request uses source A and destination as first and last frames", () => {
  const request = buildVideoRequest(
    "veo-3.1-fast-generate-001",
    "Áo Nhật Bình editorial portrait.",
    { mimeType: "image/png", data: "ZmFrZS1sb29rYm9vaw==" },
    { mimeType: "image/png", data: "ZmFrZS1kZXN0aW5hdGlvbg==" },
  );

  assert(request.instances[0].image.mimeType === "image/png", "First-frame MIME type should be preserved.");
  assert(request.instances[0].image.bytesBase64Encoded === "ZmFrZS1sb29rYm9vaw==", "First-frame bytes should be preserved.");
  assert(request.instances[0].lastFrame.bytesBase64Encoded === "ZmFrZS1kZXN0aW5hdGlvbg==", "Last-frame bytes should be preserved.");
  assert(request.instances[0].prompt.includes("source frame A"), "Prompt must anchor the transition to source A.");
  assert(request.parameters.aspectRatio === "16:9", "Veo output must stay landscape.");
  assert(request.parameters.durationSeconds === 8, "Audition video should remain eight seconds.");
});

Deno.test("Veo request rejects a missing first frame", () => {
  assertThrows(
    () => buildVideoRequest("veo", "prompt", { mimeType: "image/png", data: "" }),
    "approved lookbook first frame",
  );
});
