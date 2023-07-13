/* eslint-disable no-console */
import "server-only";
import type { ChatCompletionRequestMessage, CreateChatCompletionResponse } from "openai-edge";
import { Configuration, OpenAIApi } from "openai-edge";

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openai = new OpenAIApi(config);

export async function generateScenarios(exampleScenarios: string[]): Promise<string[]> {
  console.log("generateScenarios, creating chat completion...");

  const messages: ChatCompletionRequestMessage[] = [
    {
      role: "system",
      content: [
        'You are a smart, funny, and creative personality who is a world-class story-teller with over 20 years experience. You will be provided with example scenarios separated with "---", please create exactly 3 new scenarios that are a similar format to the examples provided where a person needs to make a difficult personal choice. Each scenario should be a significantly different theme for variety. Make the scenarios such that a right answer is not obvious and subjective. The scenarios should be fun and lighthearted, do not create any scenarios involving mental or physical violence. Please do not copy the examples, but use them as inspiration. Provide the scenarios you suggest separated by "---" and dont include any other content other than the suggested scenarios.',
        "",
        ...exampleScenarios.flatMap((scenario) => ["---", scenario]),
      ].join("\n"),
    },
  ];

  console.log("generateScenarios, messages", messages);

  // Ask OpenAI for a streaming chat completion given the prompt
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages,
    temperature: 0.8,
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
