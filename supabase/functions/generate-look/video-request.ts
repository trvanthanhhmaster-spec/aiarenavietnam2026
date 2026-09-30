export type VideoFirstFrame = {
  mimeType: string;
  data: string;
};

export function buildVideoRequest(
  model: string,
  prompt: string,
  firstFrame: VideoFirstFrame,
  lastFrame?: VideoFirstFrame,
  aspectRatio = "16:9",
) {
  if (!firstFrame.data || !firstFrame.mimeType) {
    throw new Error("Veo requires an approved lookbook first frame.");
  }

  const instance: any = {
    prompt: `${prompt}\nCreate a restrained eight-second transition from the supplied source frame A to the supplied destination frame. Preserve camera geometry and use a single continuous transformation. No text, logo, cuts or unrelated wardrobe morphing.`,
    image: {
      bytesBase64Encoded: firstFrame.data,
      mimeType: firstFrame.mimeType,
    },
  };
  if (lastFrame?.data && lastFrame.mimeType) {
    instance.lastFrame = {
      bytesBase64Encoded: lastFrame.data,
      mimeType: lastFrame.mimeType,
    };
  }

  return {
    model,
    instances: [instance],
    parameters: {
      aspectRatio,
      durationSeconds: 8,
      sampleCount: 1,
    },
  };
}
