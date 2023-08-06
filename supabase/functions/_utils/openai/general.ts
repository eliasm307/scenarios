/* eslint-disable functional-core/purity */
/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-console */

// todo migrate to OpenAI v4 when it's out of beta and supports esm.sh (npm: doesn't work for supabase, see https://github.com/openai/openai-node/discussions/182#discussioncomment-6442002)
// import OpenAI from "npm:openai@4.0.0-beta.4";
import type {
  CreateChatCompletionRequest,
  CreateChatCompletionResponse,
} from "https://esm.sh/openai-edge@1.2.0";
import { Configuration, OpenAIApi } from "https://esm.sh/openai-edge@1.2.0";
import { OpenAIStream } from "https://esm.sh/ai@2.1.28";
import type { ChatMessage } from "./types.ts";

export { OpenAIStream };

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const openai = new OpenAIApi(config);

export const ACTIVE_OPENAI_MODEL = "gpt-3.5-turbo"; // "gpt-4"

const DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG = {
  // todo revert to gpt-4 when done testing
  model: ACTIVE_OPENAI_MODEL, // "gpt-4",
  temperature: 0.9,
  /*
  This parameter is used to discourage the model from repeating the same words or phrases too frequently within the generated text.
  It is a value that is added to the log-probability of a token each time it occurs in the generated text.
  A higher frequency_penalty value will result in the model being more conservative in its use of repeated tokens.

  @see https://community.openai.com/t/difference-between-frequency-and-presence-penalties/2777/3
  */
  frequency_penalty: 0.5,
  /*
  This parameter is used to encourage the model to include a diverse range of tokens in the generated text.
  It is a value that is subtracted from the log-probability of a token each time it is generated.
  A higher presence_penalty value will result in the model being more likely to generate tokens that have
  not yet been included in the generated text.

  @see https://community.openai.com/t/difference-between-frequency-and-presence-penalties/2777/3
  */
  presence_penalty: 0.5,
} satisfies Partial<CreateChatCompletionRequest>;

const STREAM_TIMEOUT_MS = 10_000;

/**
 * @remark Yields the latest full message on each iteration.
 */
export async function createGeneralChatResponseStream(
  messages: ChatMessage[],
): Promise<AsyncIterable<string>> {
  console.log("createGeneralChatResponseStream, creating chat completion...");
  const response = await openai.createChatCompletion({
    ...DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG,
    stream: true,
    messages,
  });

  const stream = OpenAIStream(response);
  const streamReader = stream.getReader();
  const decoder = new TextDecoder();

  console.log("createGeneralChatResponseStream, stream", stream);

  function handleTimeout() {
    console.error(
      `createGeneralChatResponseStream, timeout after ${STREAM_TIMEOUT_MS}ms: request config`,
      JSON.stringify(DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG, null, 2),
      "input messages",
      JSON.stringify(messages, null, 2),
    );
    streamReader.releaseLock();
    stream.cancel();

    throw Error(`createGeneralChatResponseStream, timeout after ${STREAM_TIMEOUT_MS}ms`);
  }

  let content = "";
  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<string, string>> {
          const timeoutId = setTimeout(handleTimeout, STREAM_TIMEOUT_MS);

          const { value: rawChunk, done } = await streamReader.read();

          clearTimeout(timeoutId);

          if (done) {
            console.log("createGeneralChatResponseStream, done", content);
            streamReader.releaseLock();
          }
          content += decoder.decode(rawChunk);
          return { value: content, done };
        },
        throw(error: Error): Promise<never> {
          console.error("createGeneralChatResponseStream, error", error);
          streamReader.releaseLock();
          stream.cancel();
          throw error;
        },
        return(): Promise<IteratorResult<string, string>> {
          console.log("createGeneralChatResponseStream, return");
          streamReader.releaseLock();
          return Promise.resolve({ value: content, done: true });
        },
      };
    },
  };
}

export async function createGeneralChatResponse(messages: ChatMessage[]): Promise<string> {
  const response = await openai
    .createChatCompletion({
      ...DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG,
      messages,
    })
    .catch((error) => {
      console.error("generateScenarios, error", JSON.stringify(error, null, 2));
      throw error;
    });

  console.log("generateScenarios, response", JSON.stringify(response, null, 2));

  if (!response.ok) {
    console.error("generateScenarios error", response.status, response.statusText, response);
    console.error("error response text:", await response.text());
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
