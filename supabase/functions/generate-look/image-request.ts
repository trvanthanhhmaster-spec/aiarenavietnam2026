export type ImageInput = {
  mimeType: string;
  data: string;
};

export type ImageRequestOptions = {
  aspectRatio?: string;
  targetResolution?: string;
  operation?: "base" | "edit" | "group" | "group-edit";
  changeScope?: string;
  references?: ImageInput[];
  garmentReferences?: ImageInput[];
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
  const editInstruction = operation === 'group-edit'
    ? `The first attachment is the previous photograph to edit. Preserve unchanged people, faces, pose, camera and composition unless the requested scope explicitly changes the scene or framing. Apply this requested change: ${options.changeScope || variant}. Additional attachments are numbered face references only, except the final garment samples identified in the prompt; do not reproduce their labels or layout. If the number of people changes, add/remove only the required people while retaining existing identities where possible.`
    : operation === 'group'
    ? 'Create ONE new photograph with the exact number of people and their assigned outfits in the plan. The source image, if supplied, is a numbered face reference sheet, not the output composition. Final garment samples are separate and mapped in the prompt. Use the corresponding face reference for each person; never reproduce the sheet or its labels. Do not force a single subject or preserve the sheet layout.'
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
  for (const reference of options.references || []) {
    parts.push({ inline_data: { mime_type: reference.mimeType, data: reference.data } });
  }
  for (const reference of options.garmentReferences || []) {
    parts.push({ inline_data: { mime_type: reference.mimeType, data: reference.data } });
  }
  return {
    contents: [{ role: "user", parts }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: { aspectRatio },
    },
  };
}
