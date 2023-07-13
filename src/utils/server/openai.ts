/* eslint-disable no-console */
import "server-only";
import type {
  ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from "openai-edge";
import { Configuration, OpenAIApi } from "openai-edge";

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openai = new OpenAIApi(config);

const SYSTEM_MESSAGE_TEMPLATES = [
  "You are a smart, funny, and creative personality who is a world-class story-teller with over 20 years experience. Each scenario should be a significantly different theme for variety.",
  "As an accomplished raconteur of two decades, you're tasked to compose three unique yarns each posing a tough choice for the protagonist. Every story must vary in theme and open up engaging dialogues. Provided examples should serve as your muse. Your narratives, separated by '---', should follow a similar format.",
  "You're an experienced weaver of tales gifted in creating captivating plots. Craft three remarkable stories where the characters wrestle with complex dilemmas. Each should be distinctive in tone and ambiguous in its resolution. Use the provided examples as stimulation for the format, but be original. Use '---' to separate your stories.",
  "As a story-teller with a reputation for evocative tales, generate three stories with deep, thought-provoking dilemmas. Every scenario should vary greatly in theme and warrant consideration. Draw inspiration from the sample scenarios but don't explicitly replicate them. Distinguish each story with '---'.",
  "Being a seasoned narrator with a zest for dramatic narratives, articulate three different stories where protagonists grapple with perplexing choices. Each tale must provoke intrigue and be open-ended. The given samples are just guides, not templates. Separate your stories with '---'",
];

function createSystemMessage(): string {
  const randomTemplate =
    SYSTEM_MESSAGE_TEMPLATES[Math.floor(Math.random() * SYSTEM_MESSAGE_TEMPLATES.length)];

  return [
    randomTemplate,
    `You will be provided with example scenarios separated with "---", please create exactly 3 new scenarios that are a similar format to the examples provided where a person needs to make a difficult choice. Make the scenarios such that a right answer is not obvious and subjective. Please do not copy the examples, but use them as inspiration. Provide the scenarios you suggest separated by "---" and dont include any other content other than the suggested scenarios.`,
  ].join("\n\n");
}

export const DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG = {
  model: "gpt-4",
  temperature: 1,
  frequency_penalty: 0.5,
  presence_penalty: 0.5,
} satisfies Partial<CreateChatCompletionRequest>;

export async function generateScenarios(exampleScenarios: string[]): Promise<string[]> {
  console.log("generateScenarios, creating chat completion...");

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: "system",
      content: [
        createSystemMessage(),
        "",
        "Example scenarios: ",
        ...exampleScenarios.flatMap((scenario) => ["---", scenario]),
      ].join("\n"),
    },
  ];

  console.log("generateScenarios, messages", messages);

  // Ask OpenAI for a streaming chat completion given the prompt
  const response = await openai.createChatCompletion({
    ...DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG,

    messages,
  });

  if (!response.ok) {
    console.error(await response.text());
    throw Error("OpenAI request failed");
  }

  const responseData: CreateChatCompletionResponse = await response.json();
  const responseText = responseData.choices[0].message?.content;
  if (!responseText) {
    console.error("No responseText");
    throw Error("OpenAI response missing text");
  }

  const scenarios = responseText
    .split("---")
    .map((s) => s.trim())
    .filter((s) => s);

  console.log("generateScenarios, scenarios", scenarios);
  return scenarios;
}
