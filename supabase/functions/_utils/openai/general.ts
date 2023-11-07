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
import type { ChatCompletionFunction, ChatMessage, FunctionCallMessage } from "./types.ts";

export { OpenAIStream };

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

const openai = new OpenAIApi(config);

export const ACTIVE_OPENAI_MODEL = "gpt-4-1106-vision-preview"; // "gpt-3.5-turbo"

const DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG = {
  model: ACTIVE_OPENAI_MODEL,
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

// gpt 4 with function calling can take some time, this is a worst case scenario
const STREAM_TIMEOUT_MS = 60_000;

function createRawChatCompletionStream({
  messages,
  functions,
}: {
  messages: ChatMessage[];
  functions?: ChatCompletionFunction[];
}) {
  return openai.createChatCompletion({
    ...DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG,
    stream: true,
    messages,
    functions: functions?.map(({ definition }) => definition),
  });
}

function functionCallMessageToChatMessage(message: FunctionCallMessage): ChatMessage {
  const outputMessage: ChatMessage = {
    role: message.role,
    content: message.content,
    name: message.name,
  };
  if (message.role === "assistant" && message.function_call) {
    if (typeof message.function_call === "string") {
      outputMessage.function_call = {
        name: message.function_call,
      };
    } else {
      outputMessage.function_call = message.function_call;
    }
  }
  return outputMessage;
}

/**
 * @remark Yields the latest full message on each iteration.
 */
export async function createGeneralChatResponseStream(
  messages: ChatMessage[],
  options?: {
    availableFunctions?: ChatCompletionFunction[];
  },
): Promise<AsyncIterable<string>> {
  console.log("createGeneralChatResponseStream, creating chat completion...");
  const response = await createRawChatCompletionStream({
    messages,
    functions: options?.availableFunctions,
  });

  /**
   * The function call messages should be replaced on each function call, not concatenated, the ai util handles this for us
   */
  let functionCallMessages: ChatMessage[] | undefined;
  const stream = OpenAIStream(response, {
    /**
     * The AI will call functions to get more context before responding, and the context it gets from functions will be included in the streamed messages
     * We dont need to keep the function calls it makes as they are just to give it more context,
     *
     * there will only be one final streamed message
     */
    async experimental_onFunctionCall(functionCall, createFunctionCallMessages) {
      console.log("\nfunctionCallPayload", JSON.stringify(functionCall, null, 2));

      const functionHandler = options?.availableFunctions?.find(
        ({ definition }) => definition.name === functionCall.name,
      )?.handler;

      if (!functionHandler) {
        throw Error(
          `createGeneralChatResponseStream, no handler found for function "${functionCall.name}"`,
        );
      }

      const functionCallResult = await functionHandler(functionCall.arguments);
      functionCallMessages = createFunctionCallMessages(functionCallResult).map(
        functionCallMessageToChatMessage,
      );

      return createRawChatCompletionStream({
        messages: [...messages, ...functionCallMessages],
        functions: options?.availableFunctions,
      });
    },
  });
  const streamReader = stream.getReader();
  const decoder = new TextDecoder();

  console.log("createGeneralChatResponseStream, stream", stream);

  let bailError = "";
  function handleTimeout() {
    const errorMessage = `createGeneralChatResponseStream, timeout after ${STREAM_TIMEOUT_MS}ms: \nrequest config${JSON.stringify(
      DEFAULT_CHAT_COMPLETION_REQUEST_CONFIG,
      null,
      2,
    )}\ninput messages${JSON.stringify(messages, null, 2)}`;
    console.error(errorMessage);
    // streamReader.releaseLock();
    // stream.cancel();
    bailError = errorMessage;
  }

  let content = "";
  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<string, string>> {
          if (bailError) {
            throw Error(bailError);
          }

          const timeoutId = setTimeout(handleTimeout, STREAM_TIMEOUT_MS);

          const { value: rawChunk, done } = await streamReader.read();

          clearTimeout(timeoutId);

          if (bailError) {
            throw Error(bailError);
          }

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
          if (functionCallMessages?.length) {
            console.log(
              "createGeneralChatResponseStream, functionCallMessages:",
              JSON.stringify(functionCallMessages, null, 2),
            );
          }
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
