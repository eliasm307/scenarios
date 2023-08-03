/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable import/no-unresolved */
import { HfInference } from "https://esm.sh/@huggingface/inference@2.6.1";

const inference = new HfInference(Deno.env.get("HUGGING_FACE_ACCESS_TOKEN"));

// "stabilityai/stable-diffusion-xl-base-0.9", // inference api has issues atm
// "stabilityai/stable-diffusion-2-1" // slow and not great results
export const ACTIVE_TEXT_TO_IMAGE_MODEL_ID = "prompthero/openjourney";

export async function createImageFromPrompt(prompt: string): Promise<Blob> {
  console.log("generateImageFromPrompt:", prompt);
  try {
    // see https://huggingface.co/docs/huggingface.js/inference/classes/HfInference#texttoimage
    const blob = await inference.textToImage(
      {
        model: ACTIVE_TEXT_TO_IMAGE_MODEL_ID,
        inputs: prompt,
        // "High-resolution and emotionally stirring image of a conflicted singer, torn between the sparkle of an enticing record deal and the looming shadow of artistry's compromise, sparking heated debates on music forums and rising rapidly on Artstation's trending list.",
        parameters: {
          negative_prompt: "blurry",
        },
      },
      // these were causing errors somehow
      // {
      //   retry_on_error: true,
      //   use_cache: false,
      // },
    );

    console.log("generateImageFromPrompt, blob", blob);
    return blob;
  } catch (error) {
    console.error("generateImageFromPrompt, error", error instanceof Error ? error.message : error);
    throw error;
  }
}
