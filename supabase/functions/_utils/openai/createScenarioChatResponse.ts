/* eslint-disable functional-core/purity */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-console */

import type { ChatCompletionFunction, ChatMessage } from "./types.ts";
import { createGeneralChatResponseStream } from "./general.ts";
import { createImageFromPrompt } from "../huggingFace.ts";
import { supabaseAdminClient } from "../supabase.ts";
import { mimeTypeToFileExtension } from "../pure.ts";
import { EXAMPLE_GOOD_IMAGE_PROMPTS_PROMPT } from "./createScenarioImagePrompt.ts";

const USE_DUMMY_CHAT_RESPONSE_STREAM = false;

export type ChatRequestBody = {
  messages: ChatMessage[];
  scenario: string;
};

const GENERATE_IMAGE_FUNCTION: ChatCompletionFunction = {
  definition: {
    name: "generate_image",
    description: `Generates an image from a given prompt and returns the image URL.`,
    parameters: {
      type: "object",
      properties: {
        prompt: {
          type: "string",
          description: `The prompt to generate an image from. ${EXAMPLE_GOOD_IMAGE_PROMPTS_PROMPT}`,
        },
      },
      required: ["prompt"],
    },
  },
  async handler({ prompt }: { prompt: string }) {
    try {
      console.log("generate_image function called with prompt:", prompt);

      const image = await createImageFromPrompt(prompt);
      console.log("image created by:", image.generatedByModelId, "\nblob:", image.blob);

      const fileExtension = mimeTypeToFileExtension(image.blob.type);
      const path = `session_chat_images/${crypto.randomUUID()}.${fileExtension}`;
      console.log("uploading image with path:", path);

      const uploadImageResponse = await supabaseAdminClient.storage
        .from("images")
        .upload(path, image.blob, {
          upsert: false,
          contentType: image.blob.type,
        });

      if (uploadImageResponse.error) {
        console.error(
          `Upload image error: ${uploadImageResponse.error.message} (${uploadImageResponse.error.name}) \nCause: ${uploadImageResponse.error.cause} \nStack: ${uploadImageResponse.error.stack}`,
        );
        throw uploadImageResponse.error;
      }

      const imageUrl = supabaseAdminClient.storage
        .from("images")
        // using the response path, not sure if they could be different
        .getPublicUrl(uploadImageResponse.data.path);

      console.log("uploaded image! Public imageUrl:", imageUrl);

      return { imageUrl };
    } catch (error) {
      console.error("generate_image function error: ", error);
      // ? should we let the AI know about errors so it can retry? could end up being expensive if the AI keeps retrying
      throw error;
    }
  },
};

export async function createScenarioChatResponseStream({ messages, scenario }: ChatRequestBody) {
  console.log(
    "createScenarioChatResponseStream, creating chat completion for:",
    JSON.stringify({ messagesCount: messages.length, scenario }, null, 2),
  );

  if (USE_DUMMY_CHAT_RESPONSE_STREAM) {
    return createDummyStream();
  }

  try {
    const stream = await createGeneralChatResponseStream(
      [createScenarioChatSystemMessage(scenario), ...messages.map(formatMessage)],
      {
        availableFunctions: [GENERATE_IMAGE_FUNCTION],
      },
    );
    console.log("createScenarioChatResponseStream, created chat completion stream");
    return stream;

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

    # IMPORTANT rules and information about your answers:
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
    - You will be speaking with multiple users at the same time so you can refer to users by name when responding to their questions to make it clear who you are addressing.
    - You can use the available functions to enhance responses where appropriate e.g. generating images to visualise what you mean.
    - If you describe anything visual you should also provide a generated image to help the user understand what you mean.
    - Responses can use markdown to format text e.g. for images you can embed them using the following format in your response: ![Alt text](https://somewhere/some-image-link.png "image title")
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
