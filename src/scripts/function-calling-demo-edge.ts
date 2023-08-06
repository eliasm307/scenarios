/* eslint-disable functional-core/purity */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */
import type { JSONSchema7 } from "json-schema";

import type { CreateMessage, Message } from "ai";
import { OpenAIStream } from "ai";
import type { CreateChatCompletionRequest, ChatCompletionRequestMessage } from "openai-edge";
import { Configuration, OpenAIApi } from "openai-edge";

require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

// const openAI = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
// });

// declare const messages: OpenAI.Chat.CompletionCreateParams["messages"];

// declare const availableFunctions: Record<string, (args: any) => any>;

// const stream = await openAI.chat.completions.create({
//   messages,
//   model: "gpt-4",
//   stream: true,
// });

// for await (const part of stream) {
//   const responseMessage = part.choices[0].delta;
//   if (responseMessage.function_call) {
//     const functionName = responseMessage.function_call.name!;
//     const functionArgs = JSON.parse(responseMessage.function_call.arguments!);
//     const functionResult = availableFunctions[functionName](functionArgs);

//     messages.push(responseMessage);
//     messages.push({
//       role: "function",
//       name: functionName,
//       content: functionResult,
//     });
//   }
// }

async function main() {
  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
  });

  const openAI = new OpenAIApi(config);

  const functions = [
    {
      name: "send_scenarios" as const,
      description: "Save multiple scenarios at the same time",
      parameters: {
        type: "object",
        properties: {
          scenarios: {
            type: "array",
            description: "An array of scenarios to save simultaneously",
            items: {
              type: "object",
              properties: {
                text: {
                  type: "array",
                  description: "An array of strings that represent sentences of the scenario",
                  items: {
                    type: "string",
                    description: "A sentence of the scenario",
                  },
                },
              },
              required: ["text"],
            },
          },
        },
        required: ["scenarios"],
      } satisfies JSONSchema7,
    },
    {
      name: "generate_image" as const,
      description: "Generates an image from a given prompt and returns the image URL",
      parameters: {
        type: "object",
        properties: {
          prompt: {
            type: "string",
            description: "The prompt to generate an image from",
          },
        },
        required: ["prompt"],
      } satisfies JSONSchema7,
    },
  ] satisfies CreateChatCompletionRequest["functions"];

  type FunctionName = (typeof functions)[number]["name"];

  function getDummyFunctionCallResponse(functionName: FunctionName) {
    switch (functionName) {
      case "send_scenarios":
        return {
          result: "success",
        };
      case "generate_image":
        return {
          imageUrl: "https://example.com/image.png",
        };
      default:
        throw new Error(`Unknown function name "${functionName}"`);
    }
  }

  const originalMessages: Message[] = [
    {
      role: "user",
      id: "1",
      content: `You're an experienced weaver of tales gifted in creating captivating plots. Save two remarkable stories as a short sentence where the characters wrestle with complex dilemmas. Each scenario should be distinctive in tone and ambiguous in its resolution. Then create an image for each scenario and explain why you chose it in a single short sentence.
      `,
    },
  ];

  console.log("messages", JSON.stringify(originalMessages, null, 2));
  console.log("functions", JSON.stringify(functions, null, 2));

  function chatMessageToChatCompletionMessage(
    message: Message | CreateMessage,
  ): ChatCompletionRequestMessage {
    const outputMessage: ChatCompletionRequestMessage = {
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

  function createChatCompletion(messages: (Message | CreateMessage)[]) {
    return openAI.createChatCompletion({
      model: "gpt-3.5-turbo", // "gpt-4",
      messages: messages.map(chatMessageToChatCompletionMessage),
      functions,
      // function_call: "auto",
      stream: true,
    });
  }

  // see https://sdk.vercel.ai/docs/guides/providers/openai-functions
  const response = await createChatCompletion(originalMessages);

  let functionCallMessages: CreateMessage[] = [];
  const stream = OpenAIStream(response, {
    /**
     * The AI will call functions to get more context before responding, and the context it gets from functions will be included in the streamed messages
     * We dont need to keep the function calls it makes as they are just to give it more context,
     *
     * there will only be one final streamed message
     */
    async experimental_onFunctionCall(functionCallPayload, createFunctionCallMessages) {
      console.log("\nfunctionCallPayload", JSON.stringify(functionCallPayload, null, 2));

      const functionName = functionCallPayload.name as FunctionName;
      const functionCallResponse = getDummyFunctionCallResponse(functionName);
      functionCallMessages = createFunctionCallMessages(functionCallResponse as any);
      const newResponse = createChatCompletion([...originalMessages, ...functionCallMessages]);

      // console.log("\nnew response loading");
      return newResponse;
    },
  });

  console.log("stream", stream);

  const streamReader = stream.getReader();
  const decoder = new TextDecoder();

  let content = "";
  while (true) {
    const { value: rawChunk, done: doneReading } = await streamReader.read();
    const chunk = decoder.decode(rawChunk);
    console.log("Stream Part chunk:", chunk);

    if (doneReading) {
      console.log("Stream done reading", chunk);
      streamReader.releaseLock();
      break;
    }

    content += chunk;
  }

  // for await (const part of stream) {
  //   console.log("First stream Part", JSON.stringify(part, null, 2));
  //   const responseMessage = part.choices[0].delta;

  //   if (responseMessage.function_call) {
  //     const functionName = responseMessage.function_call.name;
  //     if (!responseMessage.function_call.arguments) {
  //       // ! this is not actually providing arguments
  //       console.log("content", content);
  //       throw new Error(`Function call to "${functionName}" missing arguments`);
  //     }
  //     const functionArgs = JSON.parse(responseMessage.function_call.arguments);
  //     console.log("Function call to", functionName, "with args", functionArgs);

  //     // @ts-expect-error
  //     messages.push(responseMessage);
  //     messages.push({
  //       role: "function",
  //       name: functionName,
  //       content: "Success",
  //     });
  //   } else {
  //     content += responseMessage;
  //   }
  // }

  console.log(
    "Final content",
    content,
    "\functionCallMessages:",
    JSON.stringify(functionCallMessages, null, 2),
  );
}

void main()
  .catch((e) => {
    console.error("error", e);
    process.exit(1);
  })
  .then((result) => {
    console.log("resolved", result);
    process.exit(0);
  });
