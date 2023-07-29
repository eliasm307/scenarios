import type { Message } from "ai";

export const USE_DUMMY_CHAT_RESPONSE_STREAM = true;

export const DUMMY_MESSAGES: Message[] = [
  { id: "1", role: "user", content: "hi" },
  {
    id: "2",
    role: "assistant",
    content: "Hello! How can I assist you with the scenario today?",
  },
  {
    id: "3",
    role: "user",
    content: "why does he want to destroy the art?",
  },
  {
    id: "4",
    role: "assistant",
    content:
      "The wealthy collector has a rather eccentric personality and often engages in activities that most people don't understand. In this case, he believes that by purchasing and then destroying the art, he is in a way participating in its life cycle. He sees it as an act of creation in reverse, a way of returning the art back to its raw, unformed essence. This may seem confusing and contradictory to many people, including yourself, the artist. This is a peculiarity which complicates your choice. The satisfaction of having your financial struggles solved versus the heartbreaking fact of knowing your beloved artwork will be destroyed after the purchase.",
  },
  { id: "5", role: "user", content: "who is he?" },
  {
    id: "6",
    role: "assistant",
    content:
      "The wealthy collector is a mysterious individual known for his strange hobbies and eccentric lifestyle. He is also known as an enigmatic figure in the art world with substantial wealth, who seldom appears in social events. However, his identity matters less; what's paramount is his peculiar proposal to you. This man, with his perplexing interest in your art and his plans to destroy it after purchase, is asking you to make a difficult choice: to sell your priceless work to secure financial stability or decline the offer, thereby preserving the integrity and existence of your art.",
  },
  { id: "7", role: "user", content: "can I convince him not to destroy th art?" },
];
