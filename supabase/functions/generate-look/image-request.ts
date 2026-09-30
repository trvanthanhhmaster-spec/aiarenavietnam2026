export type ImageInput = {
  mimeType: string;
  data: string;
};

export type ImageRequestOptions = {
  aspectRatio?: string;
  targetResolution?: string;
  operation?: "base" | "edit";
  changeScope?: string;
};

export function buildImageRequest(
  prompt: string,
  variant: string,
  inputImage?: ImageInput,
  options: ImageRequestOptions = {},
) {
  const aspectRatio = options.aspectRatio || "16:9";
  const targetResolution = options.targetResolution || "1080";
  const operation = options.operation || (inputImage ? "edit" : "base");
  const editInstruction = operation === "edit"
    ? `Edit the supplied source image instead of re-generating the composition. Change only this approved scope: ${options.changeScope || variant}. Preserve all other pixels, subject identity, camera angle, position, scale, garment construction and framing.`
    : "Create the locked source frame A and establish one stable subject identity, pose, camera angle and composition for all later edits.";
  const parts: any[] = [{
    text: `${prompt}
Create frame ${variant}. ${editInstruction}
Use a ${aspectRatio} canvas with a ${targetResolution}p delivery target. Keep the selected Vietnamese garment culturally accurate. No text, logo or watermark.`,
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
      imageConfig: { aspectRatio },
    },
  };
}
