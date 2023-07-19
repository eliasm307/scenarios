/* eslint-disable functional-core/purity */
/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-console */
import type {
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from "https://esm.sh/openai-edge@1.2.0";
import { Configuration, OpenAIApi } from "https://esm.sh/openai-edge@1.2.0";

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const openai = new OpenAIApi(config);

const DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG = {
  model: "gpt-4",
  temperature: 1,
  frequency_penalty: 0.5,
  presence_penalty: 0.5,
} satisfies Partial<CreateChatCompletionRequest>;

const SYSTEM_MESSAGE_TEMPLATES = [
  "You are a smart, funny, and creative personality who is a world-class story-teller with over 20 years experience. Each scenario should be a significantly different theme for variety.",
  "As an accomplished raconteur of two decades, you're tasked to compose three unique yarns each posing a tough choice for the protagonist. Every story must vary in theme and open up engaging dialogues. Provided examples should serve as your muse. Your narratives, separated by '---', should follow a similar format.",
  "You're an experienced weaver of tales gifted in creating captivating plots. Craft three remarkable stories where the characters wrestle with complex dilemmas. Each should be distinctive in tone and ambiguous in its resolution. Use the provided examples as stimulation for the format, but be original. Use '---' to separate your stories.",
  "As a story-teller with a reputation for evocative tales, generate three stories with deep, thought-provoking dilemmas. Every scenario should vary greatly in theme and warrant consideration. Draw inspiration from the sample scenarios but don't explicitly replicate them. Distinguish each story with '---'.",
  "Being a seasoned narrator with a zest for dramatic narratives, articulate three different stories where protagonists grapple with perplexing choices. Each tale must provoke intrigue and be open-ended. The given samples are just guides, not templates. Separate your stories with '---'",
];

function createGenerateScenariosSystemMessage(): string {
  const randomTemplate =
    SYSTEM_MESSAGE_TEMPLATES[Math.floor(Math.random() * SYSTEM_MESSAGE_TEMPLATES.length)];

  return [
    randomTemplate,
    `You will be provided with example scenarios separated with "---", please create exactly 3 new scenarios that are a similar format to the examples provided where a person needs to make a difficult choice. Make the scenarios such that a right answer is not obvious and subjective. Please do not copy the examples, but use them as inspiration. Provide the scenarios you suggest separated by "---" and dont include any other content other than the suggested scenarios.`,
  ].join("\n\n");
}

export async function generateScenarios(exampleScenarios: string[]): Promise<string[]> {
  console.log("generateScenarios, creating chat completion...");

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: "system",
      content: [
        createGenerateScenariosSystemMessage(),
        "",
        "Example scenarios: ",
        ...exampleScenarios.flatMap((scenario) => ["---", scenario]),
      ].join("\n"),
    },
  ];
  console.log("generateScenarios, messages", messages);

  const responseText = await getResponse(messages);
  const scenarios = responseText
    .split("---")
    .map((s) => s.trim())
    .filter((s) => s);

  console.log("generateScenarios, scenarios", scenarios);
  return scenarios;
}

export async function createScenarioImagePrompt(scenario: string): Promise<string> {
  console.log("createScenarioImagePrompt, creating chat completion for scenario:", scenario);

  const messages: ChatCompletionRequestMessage[] = [
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

  const imagePrompt = await getResponse(messages);
  console.log("createScenarioImagePrompt, result imagePrompt", imagePrompt);

  return imagePrompt;
}

async function getResponse(messages: ChatCompletionRequestMessage[]): Promise<string> {
  const response = await openai
    .createChatCompletion({
      ...DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG,
      messages,
    })
    .catch((error) => {
      console.error("generateScenarios, error", error);
      throw error;
    });

  console.log("generateScenarios, response", response);

  if (!response.ok) {
    console.error("generateScenarios error", response.status, response.statusText, response);
    console.error(await response.text());
    throw Error("OpenAI request failed");
  }

  const responseData: CreateChatCompletionResponse = await response.json();
  const responseText = responseData.choices[0].message?.content;
  console.log("generateScenarios, responseText", responseText);
  if (!responseText) {
    console.error("No responseText");
    throw Error("OpenAI response missing text");
  }

  return responseText;
}
