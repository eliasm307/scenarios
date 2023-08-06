/* eslint-disable no-console */
import { createGeneralChatResponse } from "./general.ts";
import type { ChatMessage } from "./types.ts";

export const EXAMPLE_GOOD_IMAGE_PROMPTS_PROMPT = [
  `Here are some example prompt formats in different contexts, that you can take inspiration from. The prompts are separated by "---" but your prompt should not have this, it should just be the prompt text only:`,
  "",
  "---",
  "Captivating and contemplative high-resolution image of a scientist, cradling the antidote for a rare disease, held juxtaposed against a vague outline of the controversial procedure, driving discussion across academia and trending on artstation.",
  "---",
  "dreamlikeart, 3d render of futuristic military cyborg, cyberpunk, wolf, warframe, stealth, armored, neon lights, background explosion, character design, hard surface, smooth, detailed face, highly detailed, intricate details, symmetrical, volumetric lighting, ambient light, real-time, vfx, digital 3d, uhd, hdr",
  "---",
  "((extreme detail)),(ultra-detailed), create a superhero named Orion. Orion is male, he has messy brown hair, muscular, purple bodysuit, a simple domino mask on face, full body image, best quality, real face, white cape,   8k resolution concept art portrait by Greg Rutkowski, Artgerm, WLOP, Alphonse Mucha dynamic lighting hyperdetailed intricately detailed Splash art trending on Artstation triadic colors",
  "---",
  "high resolution photography interior design, interior design magazine, minimalist design, cosy atmosphere, open plan, mission style home, design kitchen room, modular black and brown furnitures, wooden floor, brick walls, high ceiling, large steel windows with a city view, skyline in the background, warehouse style, industrial style",
  "---",
  "High resolution Robot, 8k, intricate detail, photorealistic, realistic light, wide angle, kinkfolk photography",
  "((Best quality, masterpiece):1.2), An incredibly detailed and stunning artwork with dynamic composition, breathtaking lighting, and vibrant colors. High resolution and flawless execution.  ",
  "---",
  "realistic portrait of very beautiful girl with boy, a young supermodel girl and boy,face to face, romantic, asian market backgroud,shop neon signs, night city lights, green yeys, full body photo, photo realistic,perfect fitness body, long legs, beautiful perfect symmetrical face, expressive eyes, doe eyes, beautiful freckles on face, high cheekbones, long hair, long beautiful flowing ink like hair, delicate makeup, aperture 1.8,bokeh, lens flare, melancholy expression, extradimensional,ultra hd, hdr, 8k, cinematic lights, extremely high details, asian market backgroud,shop neon signs, night city lights",
  "---",
  "High-resolution and emotionally stirring image of a conflicted singer, torn between the sparkle of an enticing record deal and the looming shadow of artistry's compromise, sparking heated debates on music forums and rising rapidly on Artstation's trending list.",
].join("\n");

export async function createScenarioImagePrompt(scenario: string): Promise<string> {
  console.log("createScenarioImagePrompt, creating chat completion for scenario:", scenario);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        `You are a world class, creative, and talented artist with over 20 years of experience who has been tasked with creating a prompt for a relevant image to represent the following scenario that will be given to a text-to-image AI.`,
        "Choose the best prompt format to produce the most interesting and best quality image for the given scenario",
        "",
        EXAMPLE_GOOD_IMAGE_PROMPTS_PROMPT,
      ].join("\n"),
    },
    {
      role: "system",
      content: `Please generate a relevant image prompt that represents this scenario and only reply with the prompt to feed into the text-to-image AI: ${scenario}`,
    },
  ];

  const imagePrompt = await createGeneralChatResponse(messages);
  console.log("createScenarioImagePrompt, result imagePrompt", imagePrompt);

  return imagePrompt;
}
