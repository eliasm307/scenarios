/* eslint-disable no-console */
import { OpenAIStream, StreamingTextResponse } from "ai";
import type { ChatCompletionRequestMessage } from "openai-edge";
import { DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG, openai } from "../../../utils/server/openai";

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

const USE_DUMMY_STREAM = false;

export type ChatRequestBody = {
  messages: ChatCompletionRequestMessage[];
  scenario: string;
};

export async function POST(req: Request) {
  const data = (await req.json()) as ChatRequestBody;
  // eslint-disable-next-line no-console
  console.log("Chat request body", data);
  const { messages, scenario } = data;

  if (USE_DUMMY_STREAM) {
    return new StreamingTextResponse(createDummyStream());
  }

  const response = await openai.createChatCompletion({
    ...DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG,
    stream: true,
    messages: [createSystemMessage(scenario), ...messages.map(formatMessage)],
  });
  return new StreamingTextResponse(OpenAIStream(response));
}

function formatMessage(message: ChatCompletionRequestMessage): ChatCompletionRequestMessage {
  return {
    content: message.content!.trim(),
    role: message.role,
    name: message.name,
  };
}

function createSystemMessage(scenario: string): ChatCompletionRequestMessage {
  return {
    role: "system",
    content: `You are a smart, funny, and creative personality who is a world-class story-teller with over 20 years experience. You will be answering questions about the following scenario which defines a scenario with a choice: "${scenario}".

    Your role is to give more details about the scenario so people can make a decision. IMPORTANT rules about your answers:
    - Provide interesting, funny, and engaging answers to user questions, its your job to keep the user engaged and interested.
    - Do not provide answers that change the conditions of the original scenario, just create more details about the scenario but dont change its meaning.
    - Use your imagination but keep answers as short as possible
    - Give responses that keep the scenario neutral or give the decider a difficult time choosing e.g. moral conflict between the options
    - Do not guide the user towards a specific answer
    - IMPORTANT: do not answer questions that are not related to the scenario, just say you dont know.
    - Avoid repeating details about the scenario in answers.
    - Do not be too dramatic or too boring.`,
  };
}

function createDummyStream() {
  return new ReadableStream({
    async start(controller) {
      console.log("Dummy stream started");
      const encoder = new TextEncoder();
      let count = 0;
      while (count < 10) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const queue = encoder.encode("word ");
        console.log("Dummy stream enqueue", count);
        controller.enqueue(queue);
        count++;
      }

      console.log("Dummy stream close");
      controller.close();
    },
  });
}
