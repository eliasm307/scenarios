/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable no-console */
import OpenAI from "openai";
import type { JSONSchema7 } from "json-schema";

require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

// const openAI = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
// });

// declare const messages: OpenAI.Chat.CompletionCreateParams["messages"];

// declare const availableFunctions: Record<string, (args: any) => any>;

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
  const openAI = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
  });

  const messages: OpenAI.Chat.CompletionCreateParams["messages"] = [
    {
      role: "user",
      content: `You're an experienced weaver of tales gifted in creating captivating plots. Save three remarkable stories where the characters wrestle with complex dilemmas. Each scenario should be distinctive in tone and ambiguous in its resolution.
      `,
    },
  ];

  const functions = [
    {
      name: "send_scenarios" as const,
      description: "Save scenarios",
      parameters: {
        type: "object",
        properties: {
          scenarios: {
            type: "array",
            description: "An array of scenarios to save",
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
  ] satisfies OpenAI.Chat.CompletionCreateParams["functions"];

  type FunctionName = (typeof functions)[number]["name"];

  console.log("messages", messages);
  console.log("functions", functions);

  const completion = await openAI.chat.completions.create({
    messages: [],
    model: "gpt-4-1106-vision-preview",
    stream: false,
  });

  completion.choices[0].message;

  const stream = await openAI.chat.completions.create({
    model: "gpt-4-1106-vision-preview",
    messages,
    functions,
    function_call: {
      name: "send_scenarios" as FunctionName,
    },
    stream: true,
  });

  let content = "";

  console.log("stream", stream);

  for await (const part of stream) {
    console.log("First stream Part", JSON.stringify(part, null, 2));
    const responseMessage = part.choices[0].delta;

    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      if (!responseMessage.function_call.arguments) {
        // ! this is not actually providing arguments
        console.log("content", content);
        throw new Error(`Function call to "${functionName}" missing arguments`);
      }
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);
      console.log("Function call to", functionName, "with args", functionArgs);

      // @ts-expect-error
      messages.push(responseMessage);
      messages.push({
        role: "function",
        name: functionName,
        content: "Success",
      });
    } else {
      content += responseMessage;
    }
  }

  console.log("Final content", content, "messages", messages);
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
