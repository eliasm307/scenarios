/* eslint-disable no-console */
import "server-only";
import type { CreateChatCompletionResponse } from "openai-edge";
import { Configuration, OpenAIApi } from "openai-edge";

// Create an OpenAI API client (that's edge friendly!)
const config = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});

export const openai = new OpenAIApi(config);

export async function generateScenarios() {
  console.log("generateScenarios, creating chat completion...");

  // Ask OpenAI for a streaming chat completion given the prompt
  const response = await openai.createChatCompletion({
    model: "gpt-4",
    messages: [
      {
        role: "system",
        content: [
          'You are a smart, funny, and creative personality who is a world-class story-teller with over 20 years experience. You will be provided with example scenarios separated with "---", please create exactly 3 new scenarios that are a similar format to the examples provided where a person needs to make a difficult personal choice. Each scenario should be a significantly different theme for variety. Make the scenarios such that a right answer is not obvious and subjective. The scenarios should be fun and lighthearted, do not create any scenarios involving mental or physical violence. Please do not copy the examples, but use them as inspiration. Provide the scenarios you suggest separated by "---" and dont include any other content other than the suggested scenarios.',
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
          "---",
          "You're a bestselling author who's been writing under a pseudonym. Your latest novel is a massive hit, and your fans are clamoring for a public appearance. Revealing your true identity would mean losing your cherished anonymity, but disappointing your fans could mean the end of your writing career. What do you do?",
          "---",
          "You're a brilliant scientist who has discovered the secret to immortality. However, using this discovery would mean overpopulation and potential resource scarcity, but not using it means letting people continue to age and die. Do you share your discovery with the world?",
          "---",
          "You're a gifted athlete who's been given the opportunity to compete in the Olympics. However, this means you have to leave your ailing parent who's been your biggest supporter throughout your journey. They insist you go and fulfill your dream. What do you decide?",
          "---",
          "You've been given the power to time travel, but every time you do, you lose a year of your life and you cant see how long you have left. Do you risk your life to use this power?",
          "---",
          "You're an accomplished artist whose work has caught the eye of a wealthy buyer. They offer you a massive sum of money for your art, but they also want to buy all future rights to your work, meaning you can no longer sell or display it under your own name. Do you accept their offer?",
          "---",
          "You're a successful entrepreneur with a bustling café. A big corporation offers to buy your business for a hefty sum, but they plan to change everything that makes your café special. You could retire comfortably with the money, but you'd be selling out your dream. What do you do?",
          "---",
          "You're a passionate environmental activist who's been given the opportunity to work for a major oil company. They promise you a seat at the table where you can influence their environmental policies. However, this would mean working for an industry that's historically contributed to the problem you're fighting against. Do you take the job to enact change from within or reject it to stay true to your principles?",
          "---",
          "You're a promising actor, offered a lead role in a movie that's sure to be a blockbuster. However, it's directed by someone whose personal views you strongly disagree with. The movie could be your big break, but it also means working closely with someone you despise. Do you take the role?",
          "---",
          "You're a dedicated teacher who's been offered a high-paying job in a prestigious private school. However, this would mean leaving your students in a struggling public school who desperately need your guidance and support. You've always believed in making a difference where it's needed most, but this opportunity could secure your future. What do you choose?",
          "---",
          "You're a gifted singer with a powerful voice. An influential record label executive offers you a deal to produce an album with chart-topping potential. However, the songs they want you to sing are not your style and may compromise your artistic integrity. The deal could secure you financial success and fame, but it may also leave you feeling like a sell-out. Do you sign the contract?",
          "---",
          "You have been working tirelessly on an innovative project that could potentially revolutionize the tech industry. One day, an alien lands on Earth and offers you knowledge of advanced interstellar technology but in return, you have to leave Earth with them, leaving your family and friends behind forever. Would you go?",
          "---",
          "You're a gifted ballet dancer who has been invited to join a prestigious ballet company abroad. However, this means leaving your childhood sweetheart behind who can't relocate due to his/her work. You've been dreaming of this opportunity for years, but it might cost you your relationship. Would you choose love or career?",
          "---",
          "You're an extraordinary violinist who is given two opportunities: perform solo at a prestigious concert that could catapult your career or accompany your best friend, a budding singer, at her first major performance. Your heart sways towards supporting your friend, but your mind knows the solo performance is a once-in-a-lifetime opportunity. What do you decide?",
          "---",
          "You're an acclaimed wildlife photographer, offered a dream assignment to capture the elusive snow leopard in the Himalayas. However, this would mean being away from your newborn child for months. You've always dreamed of this assignment, but you also don't want to miss your child's first milestones. What's your call?",
        ].join("\n"),
      },
    ],
    temperature: 0.8,
  });

  if (!response.ok) {
    console.error(await response.text());
    throw Error("OpenAI request failed");
  }

  const responseData: CreateChatCompletionResponse = await response.json();
  const responseText = responseData.choices[0].message?.content;
  if (!responseText) {
    console.error("No responseText");
    throw Error("OpenAI response missing text");
  }

  const scenarios = responseText
    .split("---")
    .map((s) => s.trim())
    .filter((s) => s);

  console.log("generateScenarios, scenarios", scenarios);
  return scenarios;
}
