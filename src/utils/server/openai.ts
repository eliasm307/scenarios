/* eslint-disable no-console */
import "server-only";
import type {
  // ChatCompletionRequestMessage,
  CreateChatCompletionRequest,
  // CreateChatCompletionResponse,
} from "openai-edge";
import { Configuration, OpenAIApi } from "openai-edge";
import { getSeverEnvVariable } from "./general";

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: getSeverEnvVariable("OPENAI_API_KEY"),
});

export const openai = new OpenAIApi(config);

// const SYSTEM_MESSAGE_TEMPLATES = [
//   "You are a smart, funny, and creative personality who is a world-class story-teller with over 20 years experience. Each scenario should be a significantly different theme for variety.",
//   "As an accomplished raconteur of two decades, you're tasked to compose three unique yarns each posing a tough choice for the protagonist. Every story must vary in theme and open up engaging dialogues. Provided examples should serve as your muse. Your narratives, separated by '---', should follow a similar format.",
//   "You're an experienced weaver of tales gifted in creating captivating plots. Craft three remarkable stories where the characters wrestle with complex dilemmas. Each should be distinctive in tone and ambiguous in its resolution. Use the provided examples as stimulation for the format, but be original. Use '---' to separate your stories.",
//   "As a story-teller with a reputation for evocative tales, generate three stories with deep, thought-provoking dilemmas. Every scenario should vary greatly in theme and warrant consideration. Draw inspiration from the sample scenarios but don't explicitly replicate them. Distinguish each story with '---'.",
//   "Being a seasoned narrator with a zest for dramatic narratives, articulate three different stories where protagonists grapple with perplexing choices. Each tale must provoke intrigue and be open-ended. The given samples are just guides, not templates. Separate your stories with '---'",
// ];

export const DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG = {
  model: "gpt-4-1106-vision-preview",
  temperature: 1,
  frequency_penalty: 0.5,
  presence_penalty: 0.5,
} satisfies Partial<CreateChatCompletionRequest>;
