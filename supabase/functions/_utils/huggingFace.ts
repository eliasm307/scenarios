/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable import/no-unresolved */
// @deno-types="https://esm.sh/@huggingface/inference@2.6.1"
import { HfInference } from "https://esm.sh/@huggingface/inference@2.6.1";

const inference = new HfInference(Deno.env.get("HUGGING_FACE_ACCESS_TOKEN"));

const usableTextToImageModelIds = [
  "prompthero/openjourney-v4",
  "prompthero/openjourney",
  "stabilityai/stable-diffusion-2-1", // slow and not great results
  // "stabilityai/stable-diffusion-xl-base-1.0", // very very slow and not great results
];

export async function createImageFromPrompt(
  prompt: string,
): Promise<{ blob: Blob; generatedByModelId: string }> {
  console.log("generateImageFromPrompt:", prompt);
  try {
    for (const modelId of usableTextToImageModelIds) {
      const blob = await tryCreatingImageUsingModel({ prompt, modelId });
      if (blob) {
        console.log(modelId, "generateImageFromPrompt, result", blob);
        return { blob, generatedByModelId: modelId };
      }
    }
  } catch (error) {
    console.error("generateImageFromPrompt, error", error instanceof Error ? error.message : error);
    throw error;
  }

  const modelIdsString = usableTextToImageModelIds.join(", ");
  const errorMessage = `generateImageFromPrompt, error: no model could generate an image for prompt: ${prompt} (tried models: ${modelIdsString})`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

async function tryCreatingImageUsingModel({
  prompt,
  modelId,
}: {
  modelId: string;
  prompt: string;
}): Promise<Blob | undefined> {
  console.log("tryCreatingImageUsingModel", JSON.stringify({ modelId, prompt }));
  const timerKey = `tryCreatingImageUsingModel: ${modelId}`;
  try {
    console.time(timerKey);

    // see https://huggingface.co/docs/huggingface.js/inference/classes/HfInference#texttoimage
    const blob = await inference.textToImage(
      {
        model: modelId,
        inputs: prompt,
        // "High-resolution and emotionally stirring image of a conflicted singer, torn between the sparkle of an enticing record deal and the looming shadow of artistry's compromise, sparking heated debates on music forums and rising rapidly on Artstation's trending list.",
        parameters: {
          // todo make ai generate these
          negative_prompt: `(costume), (((wide shot))), (cropped head), (long neck), bad framing, out of frame, deformed, cripple, old, fat, ugly, poor, missing arm, additional arms, additional legs, additional head, additional face, multiple faces, multiple heads, black and white, grayscale, watermark, dreamlikeart, cyberpunk, wolf, warframe, stealth, armored, neon lights, digital <by bad-artist:0.7>, <ng_deepnegative_v1_75t:0.7>, <EasyNegative:0.7>" ,<bad_prompt:0.7>, <badhandv4:0.7>, <by bad-artist-anime:0.7>, disfigured, kitsch, ugly, oversaturated, grain, low-res, Deformed, blurry, bad anatomy, poorly drawn face, mutation, mutated, extra limb, ugly, poorly drawn hands, missing limb, blurry, floating limbs, disconnected limbs, malformed hands, blur, out of focus, long neck, long body, disgusting, poorly drawn, childish, mutilated, mangled, surreal, text, blurry, b&w, monochrome, conjoined twins, multiple heads, extra legs, extra arms, (collage:1.25), meme, elongated, twisted, fingers, strabismus, heterochromia, closed eyes, blurred, watermark, lowres, error, cropped, worst quality, low quality, jpeg artifacts, out of frame, signature, face cut, head cut, extra fingers, bad proportions, cropped head, malformed limbs, mutated hands, fused fingers`,
        },
      },
      // these were causing errors somehow
      {
        retry_on_error: true,
        wait_for_model: true,
        // use_cache: true,
      },
    );

    console.timeEnd(timerKey);
    return blob;
  } catch (error) {
    console.error(
      "generateImageFromPrompt, error",
      error instanceof Error ? error.message : error,
      JSON.stringify({
        modelId,
        prompt,
      }),
    );
  }
}
