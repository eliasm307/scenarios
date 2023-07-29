/* eslint-disable no-console */
import { StreamingTextResponse, OpenAIStream } from "ai";
import { Configuration, OpenAIApi } from "openai-edge";

require("dotenv").config({
  path: require("path").resolve(process.cwd(), ".env.local"),
});

const USE_DUMMY_CHAT_RESPONSE_STREAM = false;

async function main() {
  if (USE_DUMMY_CHAT_RESPONSE_STREAM) {
    return new StreamingTextResponse(createDummyStream());
  }

  const config = new Configuration({
    apiKey: process.env.OPENAI_API_KEY, // This is also the default, can be omitted
  });

  const openAI = new OpenAIApi(config);

  const response = await openAI.createChatCompletion({
    model: "gpt-3.5-turbo",
    stream: true,
    messages: [
      {
        role: "user",
        content: `You're an experienced weaver of tales gifted in creating captivating plots. Save three remarkable stories where the characters wrestle with complex dilemmas. Each scenario should be distinctive in tone and ambiguous in its resolution.

        IMPORTANT:
        - Provide the scenarios you suggest separated by "---" and dont include any other content other than the suggested scenarios.
        `,
      },
    ],
    max_tokens: 20,
  });

  const stream = OpenAIStream(response);

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

  return content;
  // return new StreamingTextResponse(OpenAIStream(response));
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

void main()
  .catch((e) => {
    console.error("error", e);
    process.exit(1);
  })
  .then((result) => {
    console.log("resolved", result);
    process.exit(0);
  });
