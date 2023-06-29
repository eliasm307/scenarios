"use client";

import { Box, Button, Divider, Flex, Grid, Heading, Spinner, Textarea } from "@chakra-ui/react";
import type { Message } from "ai";
import type { UseChatHelpers } from "ai/react";
import { useChat } from "ai/react";
import { useCallback, useEffect, useRef } from "react";
import ChatMessage from "./ChatMessage";

type Props = {
  scenario: string;
  existing?: {
    messages?: Message[];
  };
};

const DUMMY_MESSAGES: Message[] = [
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

export default function ScenarioChat({ scenario, existing }: Props) {
  const chat = useChat({
    initialMessages: existing?.messages || DUMMY_MESSAGES,
    body: { scenario },
  });
  const messagesListRef = useRef<HTMLDivElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useAutoScrolling({
    messages: chat.messages,
    messagesListEl: messagesListRef.current,
  });

  const messagesListRefNotifier = useCallback(
    (node: HTMLDivElement | null) => {
      if (node) {
        // @ts-expect-error [setting to readonly allowed]
        messagesListRef.current = node;
        // this is to force a re-render when the ref changes
        chat.setMessages([...chat.messages]);
      }
    },
    [chat],
  );

  // focus on input when chat is ready
  useEffect(() => {
    if (!chat.isLoading) {
      textAreaRef.current?.focus();
    }
  }, [chat]);

  const messagesList = (
    <Flex
      width='100%'
      ref={messagesListRefNotifier}
      direction='column'
      overflow='auto'
      tabIndex={0}
    >
      {chat.messages.map((message, i) => {
        const isLastEntry = !chat.messages[i + 1];
        return (
          <Box key={message.id}>
            <ChatMessage key={message.id} message={message} />
            {isLastEntry ? null : (
              <Box width='100%' pl={2}>
                <Divider my={3} />
              </Box>
            )}
          </Box>
        );
      })}
    </Flex>
  );

  const handleInputKeyDown = useCallback(async (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") {
      return;
    }
    const hasUserInput = !!textAreaRef.current?.value;
    // allow for multiline input, ie shift enter which is not for confirming
    const isConfirmEnter = !e.shiftKey;
    if (isConfirmEnter) {
      if (hasUserInput && formRef.current) {
        // submit user message only if there is input
        formRef.current.requestSubmit();
      } else {
        // prevent new line on empty input
        e.preventDefault();
      }
    }
  }, []);

  const controls = (
    <Flex width='100%' gap={2} p={3} pt={1} flexDirection='column'>
      <form ref={formRef} onSubmit={chat.handleSubmit}>
        <Flex gap={2} alignItems='center' flexDirection={{ base: "column", md: "row" }}>
          <Textarea
            width='100%'
            flex={1}
            variant='outline'
            ref={textAreaRef}
            resize='none'
            disabled={chat.isLoading}
            isInvalid={!!chat.error}
            // minHeight='unset'
            // maxHeight='10rem'
            value={chat.input}
            placeholder={getPlaceholderText(chat)}
            onChange={chat.handleInputChange}
            onKeyDown={handleInputKeyDown}
            spellCheck={false}
            // make sure inline grammarly popup is off, its annoying and not really needed here
            data-gramm='false'
            data-gramm_editor='false'
            data-enable-grammarly='false'
          />
          <Flex gap='inherit' width={{ base: "100%", md: "unset" }} justifyContent='space-evenly'>
            {chat.isLoading ? (
              <Button
                key='stop'
                variant='ghost'
                colorScheme='orange'
                leftIcon={<Spinner />}
                onClick={chat.stop}
              >
                Stop
              </Button>
            ) : (
              <Button
                key='send'
                type='submit'
                variant='ghost'
                colorScheme='green'
                isDisabled={!chat.input}
              >
                Send
              </Button>
            )}
          </Flex>
        </Flex>
      </form>
    </Flex>
  );

  return (
    <Box height='100%' position='relative' padding={2}>
      <Grid
        as='section'
        // height='100dvh'
        width='100%'
        // templateRows='100%'
        templateColumns='1fr 1fr'
        position='absolute'
        inset={0}
        padding={2}
        gap={2}
      >
        <Box m={3} overflow='auto'>
          {scenario.split(".").map((sentence) => {
            return (
              <Heading key={sentence} as='p' mb={5}>
                {sentence}.
              </Heading>
            );
          })}
        </Box>
        <Grid
          overflow='hidden'
          gap={1}
          templateRows='1fr auto'
          pt={0}
          // width='100%'
          // minWidth='330px'
          // maxWidth='800px'
          // margin='auto'
          // height='inherit'
        >
          {messagesList}
          {controls}
        </Grid>
      </Grid>
    </Box>
  );
}

function useAutoScrolling({
  messages,
  messagesListEl,
}: {
  messages: readonly Message[];
  messagesListEl: HTMLElement | null;
}) {
  // scroll to bottom on load
  useEffect(() => {
    if (!messagesListEl) {
      return;
    }
    scrollToBottom(messagesListEl);
  }, [messagesListEl]);

  // setup auto scroll
  const shouldAutoScroll = useRef(true);
  useEffect(() => {
    if (!messagesListEl) {
      return;
    }

    const scrollableEl = messagesListEl;
    const handleScroll = () => {
      const { scrollHeight, scrollTop, clientHeight } = scrollableEl;
      const scrollDistanceFromBottom = Math.abs(scrollHeight - scrollTop - clientHeight);
      // not checking for exact 0 because of floating point errors
      const isAtBottom = scrollDistanceFromBottom < 10;
      // only maintain bottom scroll if user is already at bottom
      shouldAutoScroll.current = isAtBottom;
    };

    scrollableEl.addEventListener("scroll", handleScroll);
    return () => scrollableEl.removeEventListener("scroll", handleScroll);
  }, [messagesListEl]);

  // auto scroll chat to bottom on new message
  useEffect(() => {
    if (!messagesListEl) {
      return;
    }

    const lastMessageSentByUser = messages.at(-1)?.role === "user";
    if (lastMessageSentByUser || shouldAutoScroll.current) {
      scrollToBottom(messagesListEl);
    }
  }, [messagesListEl, messages]);
}

function scrollToBottom(scrollableEl: HTMLElement) {
  // eslint-disable-next-line no-param-reassign
  scrollableEl.scrollTop = scrollableEl.scrollHeight;
}

function getPlaceholderText(chat: UseChatHelpers): string {
  if (chat.isLoading) {
    return "Thinking 🤔...";
  }
  if (chat.error) {
    return "An error occurred 😢";
  }
  return "Ask me anything about the scenario 😀";
}
