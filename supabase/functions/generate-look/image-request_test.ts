import { buildImageRequest } from "./image-request.ts";

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

Deno.test("Gemini image request locks the source and lookbook to 16:9", () => {
  const request = buildImageRequest("Vietnamese ao tac editorial.", "A");
  assert(request.generationConfig.imageConfig.aspectRatio === "16:9", "Image aspect ratio must be 16:9.");
  assert(
    request.contents[0].parts[0].text.includes("locked source frame A"),
    "Prompt must establish a locked source frame.",
  );
});

 Deno.test("Gemini image-to-image request preserves the reference and scope", () => {
  const request = buildImageRequest(
    "Vietnamese ao tac editorial.",
    "B",
    { mimeType: "image/png", data: "ZmFrZQ==" },
    { aspectRatio: "16:9", targetResolution: "1080", operation: "edit", changeScope: "background only" },
  );
  const reference = request.contents[0].parts[1].inline_data as { mime_type: string; data: string };
  assert(reference.mime_type === "image/png", "Reference MIME type must be preserved.");
  assert(reference.data === "ZmFrZQ==", "Reference bytes must be preserved.");
  assert(request.contents[0].parts[0].text.includes("background only"), "Edit scope must be explicit.");
});
 Deno.test('group edits attach the previous composition before new face references', () => {
  const body = buildImageRequest('Approved plan', 'Look', { mimeType: 'image/png', data: 'previous' }, {
    operation: 'group-edit', changeScope: 'Only add a beige bag',
    references: [{ mimeType: 'image/jpeg', data: 'face' }],
  });
  const parts = body.contents[0].parts;
  assert(parts[1].inline_data.data === 'previous', 'Previous composition must be the first image');
  assert(parts[2].inline_data.data === 'face', 'Face references must be separate');
  assert(parts[0].text.includes('previous photograph to edit'), 'Group edit instruction missing');
  assert(parts[0].text.includes('Only add a beige bag'), 'Change scope missing');
 });
