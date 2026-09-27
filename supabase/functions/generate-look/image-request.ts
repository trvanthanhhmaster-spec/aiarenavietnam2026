export type ImageInput = {
  mimeType: string;
  data: string;
};

export function buildImageRequest(
  prompt: string,
  variant: string,
  inputImage?: ImageInput,
) {
  const parts: Record<string, unknown>[] = [{
    text: `${prompt}
Create variation ${variant}. Keep the same selected garment, styling and person identity across the lookbook. Compose a strictly vertical portrait on a 9:16 canvas, never landscape or horizontal. Show the full garment silhouette with enough headroom and foot room for a 9:16 lookbook frame.`,
  }];
  if (inputImage) {
    parts.push({
      inline_data: {
        mime_type: inputImage.mimeType,
        data: inputImage.data,
      },
    });
  }
  return {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio: "9:16" },
    },
  };
}
