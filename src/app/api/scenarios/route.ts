/* eslint-disable @typescript-eslint/quotes */
/* eslint-disable quotes */
import { NextResponse } from "next/server";
import type { CreateChatCompletionResponse } from "openai-edge";
import { openai } from "../../../utils/server/openai";

// IMPORTANT! Set the runtime to edge
export const runtime = "edge";

export type GetScenariosResponseBody = {
  scenarios: string[];
};

export async function GET() {
  // Ask OpenAI for a streaming chat completion given the prompt
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: [
          'You are a smart, funny, and creative personality who is a world-class story-teller with over 20 years experience. You will be provided with example scenarios separated with "---", please create 3 new scenarios that are a similar format to the examples provided where a person needs to make a difficult personal choice. Make the scenarios such that a right answer is not obvious and subjective. The scenarios should be fun and lighthearted, do not create any scenarios involving mental or physical violence. Please do not copy the examples, but use them as inspiration. Provide the scenarios you suggest separated by "---" and dont include any other content other than the suggested scenarios.',
          "",
          // todo examples should come from DB from previously accepted scenarios
          "---",
          "Would you take a pill that meant you never needed to eat again, if it also meant you were unable to ever eat again?",
          "---",
          "Your friend starts dating your ex. They get engaged within weeks. They ask you to officiate the wedding. Do you step up to the altar?",
          "---",
          "You are a server at a fancy restaurant. A famous billionaire racks up a $2,000 tab and does not tip. They drunkenly leave their wallet on their chair. It has $5,000 inside. Do you take any of the money?",
          "---",
          "You're a talented musician who's been offered two life-changing opportunities on the same day: a chance to tour with a world-renowned band and make a name for yourself, or a chance to settle down with your high school sweetheart who's just asked you to marry them and live a quiet, peaceful life. What's your choice?",
        ].join("\n"),
      },
    ],
    temperature: 0.5,
  });

  if (!response.ok) {
    console.error(await response.text());
    return NextResponse.error();
  }

  const responseData: CreateChatCompletionResponse = await response.json();
  const responseText = responseData.choices[0].message?.content;
  if (!responseText) {
    console.error("No responseText");
    return NextResponse.error();
  }

  return NextResponse.json({
    scenarios: responseText
      .split("---")
      .map((s) => s.trim())
      .filter((s) => s),
  } satisfies GetScenariosResponseBody);
}
