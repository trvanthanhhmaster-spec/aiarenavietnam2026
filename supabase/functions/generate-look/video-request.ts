export type VideoFirstFrame = {
  mimeType: string;
  data: string;
};

export function buildVideoRequest(
  model: string,
  prompt: string,
  firstFrame: VideoFirstFrame,
) {
  if (!firstFrame.data || !firstFrame.mimeType) {
    throw new Error("Veo requires an approved lookbook first frame.");
  }

  return {
    model,
    instances: [{
      prompt: `${prompt}\nCreate a restrained eight-second fashion film. Preserve the selected Vietnamese garment construction and subject identity from the supplied first frame. Use slow natural movement, stable camera motion, no text, no logo and no wardrobe morphing.`,
      image: {
        bytesBase64Encoded: firstFrame.data,
        mimeType: firstFrame.mimeType,
      },
    }],
    parameters: {
      aspectRatio: "9:16",
      durationSeconds: 8,
      sampleCount: 1,
    },
  };
}
