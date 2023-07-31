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
        "Here are some example prompts:",
        "---",
        "Captivating and contemplative high-resolution image of a scientist, cradling the antidote for a rare disease, held juxtaposed against a vague outline of the controversial procedure, driving discussion across academia and trending on artstation.",
        "---",
        "High-resolution and emotionally stirring image of a conflicted singer, torn between the sparkle of an enticing record deal and the looming shadow of artistry's compromise, sparking heated debates on music forums and rising rapidly on Artstation's trending list.",
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
