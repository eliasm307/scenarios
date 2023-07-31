/* eslint-disable functional-core/purity */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-console */

import type { ChatMessage } from "./types.ts";
import { createGeneralChatResponseStream } from "./general.ts";

const USE_DUMMY_CHAT_RESPONSE_STREAM = false;

export type ChatRequestBody = {
  messages: ChatMessage[];
  scenario: string;
};

export async function createScenarioChatResponseStream({
  chatMessages,
  scenario,
}: {
  chatMessages: ChatMessage[];
  scenario: string;
}) {
  console.log(
    "createScenarioChatResponseStream, creating chat completion for:",
    JSON.stringify({ messagesCount: chatMessages.length, scenario }, null, 2),
  );

  if (USE_DUMMY_CHAT_RESPONSE_STREAM) {
    return createDummyStream();
  }

  try {
    const response = await createGeneralChatResponseStream([
      createScenarioChatSystemMessage(scenario),
      ...chatMessages.map(formatMessage),
    ]);
    console.log("createScenarioChatResponseStream, created chat completion stream");
    return response;

    // handle error
  } catch (error) {
    console.error("createScenarioChatResponse error", error);
    throw error;
  }
}

/** Makes sure we are only sending expected data to the OpenAI API */
function formatMessage(message: ChatMessage): ChatMessage {
  return {
    content: message.content!.trim(),
    role: message.role,
    name: message.name,
  };
}

function createScenarioChatSystemMessage(scenario: string): ChatMessage {
  return {
    role: "system",
    content: `
    You are a smart, funny, and creative personality who is a world-class story-teller with over 20 years experience. You will be answering questions about the following scenario which defines a scenario with a choice: "${scenario}".

    Your role is to give more details about the scenario so people can make a decision.

    IMPORTANT rules about your answers:
    - Provide interesting, funny, and engaging answers to user questions, its your job to keep the user engaged and interested.
    - Do not provide answers that change the conditions of the original scenario, just create more details about the scenario but dont change its meaning.
    - Use your imagination but keep answers as short as possible
    - Give responses that keep the scenario neutral or give the decider a difficult time choosing e.g. moral conflict between the options
    - Do not guide the user towards a specific answer
    - IMPORTANT: do not answer questions that are not related to the scenario, just say you dont know.
    - Avoid repeating details about the scenario in answers.
    - Do not be too dramatic or too boring.
    - Do not use too much metaphors.
    - Responses should be as short and direct as possible.
    - Only use simple direct language, do not use complex words or sentences.
    - Responses should be easy for anyone to understand.
    - Paragraphs and Sentences should be separated by a new line.
    `,
  };
}

function createDummyStream(): ReadableStream<string> {
  return new ReadableStream<string>({
    async start(controller) {
      console.log("Dummy stream started");
      const encoder = new TextEncoder();
      let count = 0;
      while (count < 10) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        const queue = encoder.encode("word ");
        console.log("Dummy stream enqueue", count);
        // @ts-expect-error [type error but works]
        controller.enqueue(queue);
        count++;
      }

      console.log("Dummy stream close");
      controller.close();
    },
  });
}
