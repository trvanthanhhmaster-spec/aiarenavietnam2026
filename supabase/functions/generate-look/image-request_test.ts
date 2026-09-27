import { buildImageRequest } from "./image-request.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("Gemini image request locks the lookbook to vertical 9:16", () => {
  const request = buildImageRequest("Vietnamese ao tac editorial.", "front-facing editorial hero");
  assert(request.generationConfig.imageConfig.aspectRatio === "9:16", "Image aspect ratio must be 9:16.");
  assert(
    request.contents[0].parts[0].text.includes("strictly vertical portrait"),
    "Prompt must explicitly reject landscape output.",
  );
});

Deno.test("Gemini image request preserves the optional reference image", () => {
  const request = buildImageRequest(
    "Vietnamese ao tac editorial.",
    "full-body walking composition",
    { mimeType: "image/png", data: "ZmFrZQ==" },
  );
  const reference = request.contents[0].parts[1].inline_data as { mime_type: string; data: string };
  assert(reference.mime_type === "image/png", "Reference MIME type must be preserved.");
  assert(reference.data === "ZmFrZQ==", "Reference bytes must be preserved.");
});
