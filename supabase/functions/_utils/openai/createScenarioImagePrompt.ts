/* eslint-disable no-console */
import { createGeneralChatResponse } from "./general.ts";
import type { ChatMessage } from "./types.ts";

export async function createScenarioImagePrompt(scenario: string): Promise<string> {
  console.log("createScenarioImagePrompt, creating chat completion for scenario:", scenario);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        `You are a world class, creative, and talented artist with over 20 years of experience who has been tasked with creating a prompt for a relevant image to represent the following scenario that will be given to a text-to-image AI.`,
        "Choose the best prompt format to produce the most interesting and best quality image for the given scenario",
        "Here are some example prompt formats in different contexts:",
        "---",
        "Captivating and contemplative high-resolution image of a scientist, cradling the antidote for a rare disease, held juxtaposed against a vague outline of the controversial procedure, driving discussion across academia and trending on artstation.",
        "---",
        "High-resolution and emotionally stirring image of a conflicted singer, torn between the sparkle of an enticing record deal and the looming shadow of artistry's compromise, sparking heated debates on music forums and rising rapidly on Artstation's trending list.",
        "---",
        "dreamlikeart, 3d render of futuristic military cyborg, cyberpunk, wolf, warframe, stealth, armored, neon lights, background explosion, character design, hard surface, smooth, detailed face, highly detailed, intricate details, symmetrical, volumetric lighting, ambient light, real-time, vfx, digital 3d, uhd, hdr",
        "---",
        "((extreme detail)),(ultra-detailed), create a superhero named Orion. Orion is male, he has messy brown hair, muscular, purple bodysuit, a simple domino mask on face, full body image, best quality, real face, white cape,   8k resolution concept art portrait by Greg Rutkowski, Artgerm, WLOP, Alphonse Mucha dynamic lighting hyperdetailed intricately detailed Splash art trending on Artstation triadic colors",
        "---",
        "high resolution photography interior design, interior design magazine, minimalist design, cosy atmosphere, open plan, mission style home, design kitchen room, modular black and brown furnitures, wooden floor, brick walls, high ceiling, large steel windows with a city view, skyline in the background, warehouse style, industrial style",
        "High resolution Robot, 8k, intricate detail, photorealistic, realistic light, wide angle, kinkfolk photography",
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
