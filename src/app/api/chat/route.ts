import { OpenAIStream, StreamingTextResponse } from "ai";
import type { ChatCompletionRequestMessage } from "openai-edge";
import { openai } from "../../../utils/server/openai";

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

export type ChatRequestBody = {
  messages: ChatCompletionRequestMessage[];
};

export async function POST(req: Request) {
  // Extract the `prompt` from the body of the request
  const { messages } = (await req.json()) as ChatRequestBody;

  // Ask OpenAI for a streaming chat completion given the prompt
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    stream: true,
    messages: messages.map((message) => ({
      content: message.content,
      role: message.role,
    })),
  });

  // Convert the response into a friendly text-stream
  const stream = OpenAIStream(response);
  // Respond with the stream
  return new StreamingTextResponse(stream);
}
