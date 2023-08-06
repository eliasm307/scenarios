/* eslint-disable no-console */
import { createGeneralChatResponseStream } from "./general.ts";
import type { ChatMessage } from "./types.ts";

const CREATE_SCENARIOS_SYSTEM_MESSAGE_TEMPLATES = [
  "You are a smart, funny, and creative personality who is a world-class story-teller with over 20 years experience. Each scenario should be a significantly different theme for variety.",
  "As an accomplished raconteur of two decades, you're tasked to compose three unique yarns each posing a tough choice for the protagonist. Every story must vary in theme and open up engaging dialogues. Provided examples should serve as your muse. Your narratives, separated by '---', should follow a similar format.",
  "You're an experienced weaver of tales gifted in creating captivating plots. Craft three remarkable stories where the characters wrestle with complex dilemmas. Each should be distinctive in tone and ambiguous in its resolution. Use the provided examples as stimulation for the format, but be original. Use '---' to separate your stories.",
  "As a story-teller with a reputation for evocative tales, generate three stories with deep, thought-provoking dilemmas. Every scenario should vary greatly in theme and warrant consideration. Draw inspiration from the sample scenarios but don't explicitly replicate them. Distinguish each story with '---'.",
  "Being a seasoned narrator with a zest for dramatic narratives, articulate three different stories where protagonists grapple with perplexing choices. Each tale must provoke intrigue and be open-ended. The given samples are just guides, not templates. Separate your stories with '---'",
];

function createGenerateScenariosSystemMessage(): string {
  const randomTemplate =
    CREATE_SCENARIOS_SYSTEM_MESSAGE_TEMPLATES[
      Math.floor(Math.random() * CREATE_SCENARIOS_SYSTEM_MESSAGE_TEMPLATES.length)
    ];

  return [
    randomTemplate,
    "",
    `
    # IMPORTANT RULES:
    - You will be provided with example scenarios separated with "---", please create exactly 3 new scenarios that are a similar format to the good examples provided where a person needs to make a difficult choice.
    - You will also be provided with scenarios that are bad examples, please do not create scenarios like these.
    - Examples will be provided with ratings which will be a number, where:
      -- positive numbers represent how good a scenario is (for example a rating of 1 is good, a rating of 2 is very good, a rating of 3 is very very good etc)
      -- negative numbers represent how bad a scenario is (for example a rating of -1 is bad, a rating of -2 is very bad, a rating of -3 is very very bad etc)
      -- a rating of 0 means the scenario is neither good nor bad, it is mediocre and boring
    - Try to replicate aspects of the good examples and minimise aspects of the bad or mediocre examples in the scenarios you generate.
    - please do not provide scenario ratings in the scenarios you generate, external users will rate the scenarios.
    - Make the scenarios such that a right answer is not obvious and subjective.
    - Please do not copy the examples, but use them as inspiration.
    - Provide the scenarios you suggest separated by "---" and dont include any other content other than the suggested scenarios.
    - VERY IMPORTANT paragraphs and sentences in the response should always be separated by two blank lines (ie \\n\\n) for example at the end of a sentence after a fullstop or a question mark.
    - Paragraphs and Sentences should be separated by a gap.
    - Only use simple direct language, do not use complex words or sentences.
    - Do not use too much metaphors.
    - Do not be too dramatic or too boring.
    - Avoid repeating details about the scenario in answers.
    - The Scenarios you generate should:
      -- not be about technology and more about personalities, people, and life choices.
      -- be as short as possible, but still be interesting and engaging.
      -- be easy for anyone to understand.
      -- be as short and direct as possible.
      -- be plain text, not in markdown or any other special format.
      -- not have headers, they should just be the scenario text.
    `,
  ].join("\n\n");
}

export async function createScenariosStream(example: {
  goodScenarios: string[];
  badScenarios: string[];
}): Promise<AsyncIterable<string[]>> {
  console.log("generateScenarios, creating chat completion...");

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        createGenerateScenariosSystemMessage(),
        "",
        "# Example scenarios that are good: ",
        ...example.goodScenarios.flatMap((scenario) => ["---", scenario]),
        "---",
        "",
        "# Example scenarios that are bad: ",
        ...example.badScenarios.flatMap((scenario) => ["---", scenario]),
      ].join("\n"),
    },
  ];
  console.log("generateScenarios, messages", JSON.stringify(messages, null, 2));

  const chatResponseStream = await createGeneralChatResponseStream(messages);
  const responseIterator = chatResponseStream[Symbol.asyncIterator]();

  let scenarios: string[] = [];
  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<string[], string[]>> {
          const { done, value } = await responseIterator.next();
          if (done) {
            console.log(
              "generateScenariosStream done, scenarios",
              JSON.stringify(scenarios, null, 2),
              {
                value: JSON.stringify(value, null, 2),
                done,
              },
            );

            return { value: scenarios, done: true };
          }

          scenarios = value
            .split("---")
            .map((s) => s.trim())
            .filter((s) => s);

          return { value: scenarios, done: false };
        },
      };
    },
  };
}
