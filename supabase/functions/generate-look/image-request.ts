export type ImageInput = {
  mimeType: string;
  data: string;
};

export type ImageRequestOptions = {
  aspectRatio?: string;
  targetResolution?: string;
  operation?: "base" | "edit" | "group";
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
  const editInstruction = operation === 'group'
    ? 'Create ONE new photograph with the exact number of people and their assigned outfits in the plan. Any supplied image is a numbered face reference sheet, not the output composition. Use the corresponding face reference for each person; never reproduce the sheet or its labels. Do not force a single subject or preserve the sheet layout.'
    : operation === "edit"
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
