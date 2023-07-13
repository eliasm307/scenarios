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
  VStack,
  useToast,
} from "@chakra-ui/react";
import type { Message } from "ai";
import type { UseChatHelpers } from "ai/react";
import { useChat } from "ai/react";
import { useCallback, useEffect, useRef } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import ChatMessage from "./ChatMessage";
import { getSupabaseClient } from "../utils/client/supabase";
import type { SessionRow, MessageRow, SessionUser } from "../types";
import APIClient from "../utils/client/APIClient";
import { isTruthy } from "../utils/general";
import ScenarioText from "./ScenarioText";
import type { BroadcastFunction } from "./GameSession.client";

type Props = {
  selectedScenarioText: string | null;
  currentUser: SessionUser;
  users: SessionUser[];
  sessionId: number;
  sessionLockedByUserId: string | null;
  outcomeVotes: NonNullable<SessionRow["scenario_outcome_votes"]>;
  broadcast: BroadcastFunction;
  existing: {
    chatMessages: Message[];
  };
};

function useAiChat({
  existing,
  selectedScenarioText,
  currentUser,
  sessionLockedByUserId,
  sessionId,
}: Props) {
  const toast = useToast();

  const unlockSessionMessaging = useCallback(() => {
    if (sessionLockedByUserId !== currentUser.id) {
      return;
    }

    void APIClient.sessions.unlockMessaging(sessionId).then((errorToastConfig) => {
      if (errorToastConfig) {
        toast(errorToastConfig);
      }
    });
  }, [currentUser.id, sessionId, sessionLockedByUserId, toast]);

  const chat = useChat({
    initialMessages: existing?.chatMessages, // || DUMMY_MESSAGES,
    body: { scenario: selectedScenarioText },
    async onFinish(message) {
      // console.log("useAiChat:onFinish", message);
      unlockSessionMessaging();

      const errorToastConfig = await APIClient.messages.add({
        session_id: sessionId,
        content: message.content,
        author_role: "assistant",
        author_id: null,
      });

      if (errorToastConfig) {
        toast(errorToastConfig);
      }
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
      unlockSessionMessaging();
    },
  });

  useEffect(() => {
    const supabase = getSupabaseClient();
    const subscription = supabase
      .channel(`session:${sessionId}`)
      .on<MessageRow>(
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
            (m) => String(m.id) === String(newMessage.id),
          );
          if (localChatAlreadyHasMessage) {
            return;
          }

          let currentMessages = chat.messages;
          if (newMessage.author_role === "assistant") {
            unlockSessionMessaging();

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
  }, [chat, sessionId, unlockSessionMessaging]);

  useEffect(() => {
    // if we re-mount it means the session can be unlocked
    unlockSessionMessaging();
    return unlockSessionMessaging;
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

  if (!selectedScenarioText) {
    throw new Error("selectedScenarioText is required");
  }

  return {
    chat: {
      ...chat,
      async handleSubmit(e, chatRequestOptions?) {
        const potentialErrorToastConfigs = await Promise.all([
          APIClient.sessions.lockMessaging({ sessionId, lockedByUserId: currentUser.id }),
          APIClient.messages.add({
            session_id: sessionId,
            content: textAreaRef.current!.value.trim(),
            author_role: "user" as Message["role"],
            author_id: currentUser.id,
          }),
        ]);

        const errorToastConfigs = potentialErrorToastConfigs.filter(isTruthy);
        if (errorToastConfigs.some(isTruthy)) {
          errorToastConfigs.forEach(toast);
          return;
        }

        return chat.handleSubmit(e, chatRequestOptions);
      },
    } satisfies UseChatHelpers,
    messagesListRef: messagesListRefNotifier,
    textAreaRef,
    formRef,
    selectedScenarioText,
  };
}

export default function ScenarioChat(props: Props) {
  const { chat, formRef, messagesListRef, textAreaRef, selectedScenarioText } = useAiChat(props);

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

  // todo show the scenario panel and chat panel as tabs on mobile and side by side on larger screens
  return (
    <Box height='100%' position='relative' padding={2} my={2}>
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
        <VStack m={3} gap={5} width='100%' overflow='auto' maxHeight='100%'>
          <ScenarioText scenarioText={selectedScenarioText} />
          <Divider />
          <VStack gap='inherit' width='100%' flex={1}>
            <Heading size='md' width='100%' textAlign='center'>
              I think...
            </Heading>
            <OutcomeVotingTable {...props} />
            {props.users
              .filter((user) => user.id !== props.currentUser.id)
              .map((user) => {
                const userHasFinishedVoting =
                  Object.values(props.outcomeVotes[user.id] || {}).length === props.users.length;
                return (
                  <>
                    <Divider />
                    <Heading size='md' width='100%' textAlign='center'>
                      {userHasFinishedVoting ? <>✅</> : <>🤔</>} &quot;{user.name}&quot;{" "}
                      {userHasFinishedVoting ? "has decided" : "is deciding..."}
                    </Heading>
                  </>
                );
              })}
          </VStack>
        </VStack>
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

function outcomeVotingIsComplete({
  outcomeVotes,
  users,
}: {
  users: SessionUser[];
  outcomeVotes: SessionRow["scenario_outcome_votes"];
}) {
  const userVotesForEachUser = Object.values(outcomeVotes);
  return (
    userVotesForEachUser.length === users.length &&
    userVotesForEachUser.every((userVotes) => {
      return Object.keys(userVotes || {}).length === users.length;
    })
  );
}

function OutcomeVotingTable({ users, sessionId, outcomeVotes, currentUser, broadcast }: Props) {
  const toast = useToast();
  const outcomeVotesForCurrentUser = outcomeVotes[currentUser.id];

  const handleVoteChange = useCallback(
    async ({ voteForUserId, newVote }: { voteForUserId: string; newVote: "true" | "false" }) => {
      const outcomeVoteFromCurrentUser = newVote === "true";
      let errorToastConfig = await APIClient.sessions.voteForUserOutcome({
        session_id: sessionId,
        vote_by_user_id: currentUser.id,
        vote_for_user_id: voteForUserId,
        outcome: outcomeVoteFromCurrentUser,
      });
      if (errorToastConfig) {
        toast(errorToastConfig);
        return;
      }

      const updatedOutcomeVotes = {
        ...outcomeVotes,
        [currentUser.id]: {
          ...outcomeVotesForCurrentUser,
          [voteForUserId]: outcomeVoteFromCurrentUser,
        },
      };

      if (!outcomeVotingIsComplete({ users, outcomeVotes: updatedOutcomeVotes })) {
        return;
      }

      broadcast({
        event: "Toast",
        data: {
          title: "Voting Complete",
          description: "All votes are in!",
          status: "success",
        },
      });

      errorToastConfig = await APIClient.sessions.moveToOutcomeRevealStage(sessionId);
      if (errorToastConfig) {
        toast(errorToastConfig);
      }
    },
    [currentUser.id, outcomeVotes, outcomeVotesForCurrentUser, sessionId, toast, users, broadcast],
  );

  return (
    <TableContainer>
      <Table variant='unstyled'>
        <Tbody>
          {users.map((user) => (
            <UserOutcomeVotingRow
              key={user.id}
              voteForUser={user}
              latestOutcomeVote={outcomeVotesForCurrentUser?.[user.id]}
              handleVoteChange={handleVoteChange}
            />
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

function UserOutcomeVotingRow({
  voteForUser,
  latestOutcomeVote,
  handleVoteChange,
}: {
  voteForUser: SessionUser;
  latestOutcomeVote: boolean | undefined;
  handleVoteChange: (config: { voteForUserId: string; newVote: "true" | "false" }) => void;
}) {
  const handleSpecificUserVoteChange = useCallback(
    (vote: "true" | "false") => {
      handleVoteChange({ voteForUserId: voteForUser.id, newVote: vote });
    },
    [handleVoteChange, voteForUser.id],
  );

  return (
    <RadioGroup
      name={voteForUser.id}
      as='tr'
      value={String(latestOutcomeVote)}
      onChange={handleSpecificUserVoteChange}
    >
      <Td>{voteForUser.relativeName}</Td>
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
}
