/* eslint-disable react/no-unused-prop-types */

"use client";

import {
  Box,
  Button,
  Divider,
  Flex,
  Grid,
  Heading,
  Radio,
  RadioGroup,
  Spinner,
  Table,
  TableContainer,
  Tbody,
  Td,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import type { Message } from "ai";
import type { UseChatHelpers } from "ai/react";
import { useChat } from "ai/react";
import { useCallback, useEffect, useRef } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import ChatMessage from "./ChatMessage";
import { getSupabaseClient } from "../utils/client/supabase";
import type { SessionData, SessionMessageData, SessionUser } from "../types";

type Props = {
  selectedScenarioText: string;
  currentUser: SessionUser;
  users: SessionUser[];
  sessionId: number;
  sessionLockedByUserId: string | null;
  outcomeVotes: NonNullable<SessionData["scenario_outcome_votes"]>;
  initial: {
    messages: Message[];
  };
};

function useAiChat({
  initial: existing,
  selectedScenarioText,
  currentUser,
  sessionLockedByUserId,
  sessionId,
}: Props) {
  const toast = useToast();

  const unlockSession = useCallback(() => {
    if (sessionLockedByUserId !== currentUser.id) {
      return;
    }
    void getSupabaseClient()
      .from("sessions")
      .update({ messaging_locked_by_user_id: null })
      .eq("id", sessionId)
      .then((result) => {
        if (result.error) {
          console.error("Error un-locking session", result.error);
          toast({
            title: "Error locking session",
            description: result.error.message,
            status: "error",
            duration: 9000,
            isClosable: true,
          });
        }
      });
  }, [currentUser.id, sessionId, sessionLockedByUserId, toast]);

  const chat = useChat({
    initialMessages: existing?.messages, // || DUMMY_MESSAGES,
    body: { scenario: selectedScenarioText },
    onFinish(message) {
      // console.log("useAiChat:onFinish", message);
      unlockSession();
      void getSupabaseClient()
        .from("messages")
        .insert([
          {
            session_id: sessionId,
            content: message.content,
            author_role: "assistant",
          },
        ])
        .then((result) => {
          if (result.error) {
            console.error("Error saving message", result.error);
            toast({
              title: "Error saving message",
              description: result.error.message,
              status: "error",
              duration: 9000,
              isClosable: true,
            });
          }
        });
    },
    onError(error) {
      console.error("useAiChat:onError", error);
      toast({
        title: "Error generating response",
        description: error instanceof Error ? error.message : String(error),
        status: "error",
        duration: 9000,
        isClosable: true,
      });
      unlockSession();
    },
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    const subscription = supabase
      .channel(`session:${sessionId}`)
      .on<SessionMessageData>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          schema: "public",
          table: "messages",
          event: "INSERT",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          // console.log("useAiChat:subscription", payload);
          const newMessage = payload.new;
          const localChatAlreadyHasMessage = chat.messages.some(
            (m) => m.id === String(newMessage.id),
          );
          if (localChatAlreadyHasMessage) {
            return;
          }

          let currentMessages = chat.messages;
          if (newMessage.author_role === "assistant") {
            unlockSession();

            const lastMessage = currentMessages.at(-1);
            if (lastMessage?.role === "assistant") {
              currentMessages = currentMessages.slice(0, -1);
            }
          }

          chat.setMessages(
            currentMessages.concat({
              id: String(newMessage.id),
              role: newMessage.author_role,
              content: newMessage.content,
            }),
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(subscription);
    };
  }, [chat, sessionId, unlockSession]);

  useEffect(() => {
    // if we re-mount it means the session can be unlocked
    unlockSession();
    return unlockSession;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  return {
    chat: {
      ...chat,
      handleSubmit(e, chatRequestOptions?) {
        const supabase = getSupabaseClient();
        const content = textAreaRef.current!.value;

        void Promise.all([
          supabase
            .from("sessions")
            .update({ messaging_locked_by_user_id: currentUser.id })
            .eq("id", sessionId)
            .then((result) => {
              if (result.error) {
                console.error("Error locking session", result.error);
                unlockSession();
                toast({
                  title: "Error locking session",
                  description: result.error.message,
                  status: "error",
                  duration: 9000,
                  isClosable: true,
                });
              }
            }),

          supabase
            .from("messages")
            .insert([
              {
                session_id: sessionId,
                content,
                author_role: "user" as Message["role"],
                author_id: currentUser.id,
              },
            ])
            .then((result) => {
              if (result.error) {
                console.error("Error saving message", result.error);
                unlockSession();
                toast({
                  title: "Error saving message",
                  description: result.error.message,
                  status: "error",
                  duration: 9000,
                  isClosable: true,
                });
              }
            }),
        ]);

        return chat.handleSubmit(e, chatRequestOptions);
      },
    } satisfies UseChatHelpers,
    messagesListRef: messagesListRefNotifier,
    textAreaRef,
    formRef,
  };
}

export default function ScenarioChat(props: Props) {
  const { chat, formRef, messagesListRef, textAreaRef } = useAiChat(props);

  const messagesList = (
    <Flex width='100%' ref={messagesListRef} direction='column' overflow='auto' tabIndex={0}>
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

  const handleInputKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
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
    },
    [formRef, textAreaRef],
  );

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
            disabled={chat.isLoading || !!props.sessionLockedByUserId}
            isInvalid={!!chat.error}
            // minHeight='unset'
            // maxHeight='10rem'
            value={chat.input}
            placeholder={props.sessionLockedByUserId ? "AI typing..." : getPlaceholderText(chat)}
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
                isDisabled={!chat.input || !!props.sessionLockedByUserId}
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
        <Grid templateRows='auto auto 1fr' m={3} overflow='hidden'>
          <ScenarioHero scenarioText={props.selectedScenarioText} />
          <Divider my={3} />
          <OutcomeVotingGrid {...props} />
        </Grid>
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
      // eslint-disable-next-line functional-core/purity
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
  // eslint-disable-next-line no-param-reassign, functional-core/purity
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

function OutcomeVotingGrid({ users, currentUser, outcomeVotes, sessionId }: Props) {
  const toast = useToast();
  const outcomeVotesForCurrentUser = outcomeVotes[currentUser.id];
  return (
    <Box overflowY='auto'>
      <Heading as='h2' size='md' mb={2} width='100%' textAlign='center'>
        I think...
      </Heading>
      <TableContainer>
        <Table variant='unstyled'>
          <Tbody>
            {users.map((user) => {
              const userName = user.id === currentUser.id ? "I" : user.name;
              const userOutcomeVote = outcomeVotesForCurrentUser?.[user.id];
              return (
                <RadioGroup
                  as='tr'
                  key={user.id}
                  value={String(userOutcomeVote)}
                  onChange={async (newVote) => {
                    const votedThatUserWouldDoIt = newVote === "true";
                    const result = await getSupabaseClient().rpc("vote_for_outcome", {
                      session_id: sessionId,
                      vote_by_user_id: currentUser.id,
                      vote_for_user_id: user.id,
                      outcome: votedThatUserWouldDoIt,
                    });
                    if (result.error) {
                      toast({
                        title: "Voting Error",
                        description: result.error.message,
                        status: "error",
                        duration: 9000,
                        isClosable: true,
                      });
                    }

                    const newOutcomeVotes = {
                      ...outcomeVotes,
                      [currentUser.id]: {
                        ...outcomeVotesForCurrentUser,
                        [user.id]: votedThatUserWouldDoIt,
                      },
                    };

                    const votingComplete =
                      Object.keys(newOutcomeVotes).length === users.length &&
                      Object.values(newOutcomeVotes).every((votes) => {
                        return Object.keys(votes || {}).length === users.length;
                      });

                    if (!votingComplete) {
                      return;
                    }
                    toast({
                      title: "Voting Complete",
                      description: "All votes are in!",
                      status: "success",
                      duration: 9000,
                      isClosable: true,
                    });

                    const result2 = await getSupabaseClient()
                      .from("sessions")
                      .update({ stage: "scenario-outcome-reveal" } satisfies Partial<SessionData>)
                      .eq("id", sessionId);

                    if (result2.error) {
                      toast({
                        title: "Error updating session stage",
                        description: result2.error.message,
                        status: "error",
                        duration: 9000,
                        isClosable: true,
                      });
                    }
                  }}
                >
                  <Td>{userName}</Td>
                  <Td>
                    <Radio colorScheme='green' value='true'>
                      would do it
                    </Radio>
                  </Td>
                  <Td>
                    <Radio colorScheme='red' value='false'>
                      would not do it
                    </Radio>
                  </Td>
                </RadioGroup>
              );
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Box>
  );
}

function ScenarioHero({ scenarioText }: { scenarioText: string }) {
  return (
    <Box>
      {scenarioText
        .replaceAll(".", ".\n")
        .replaceAll("?", "?\n")
        .split("\n")
        .filter((sentence) => sentence.trim())
        .map((sentence) => {
          return (
            <Heading fontSize='xl' key={sentence} as='p' mb={5}>
              {sentence}
            </Heading>
          );
        })}
    </Box>
  );
}
