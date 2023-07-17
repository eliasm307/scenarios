/* eslint-disable functional-core/purity */
/* eslint-disable no-console */
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
import { useCallback, useEffect, useRef, useState } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import ChatMessage from "./ChatMessage";
import { getSupabaseClient } from "../utils/client/supabase";
import type { SessionRow, MessageRow, SessionUser } from "../types";
import APIClient from "../utils/client/APIClient";
import { isTruthy, messageRowToChatMessage } from "../utils/general";
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
    messageRows: MessageRow[];
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
  const [messageRows, setMessageRows] = useState<MessageRow[]>(existing?.messageRows ?? []);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  const [isLocallyLocked, setIsLocallyLocked] = useState(false);

  const unlockSessionMessaging = useCallback(async () => {
    if (sessionLockedByUserId !== currentUser.id) {
      return; // locked by someone else, cant unlock
    }
    const errorToastConfig = await APIClient.sessions.unlockMessaging(sessionId);
    if (errorToastConfig) {
      toast(errorToastConfig);
    } else {
      setIsLocallyLocked(false);
    }
  }, [currentUser.id, sessionId, sessionLockedByUserId, toast]);

  const lockSessionMessaging = useCallback(async () => {
    if (sessionLockedByUserId) {
      return; // already locked
    }
    const errorToastConfig = await APIClient.sessions.lockMessaging({
      sessionId,
      lockedByUserId: currentUser.id,
    });
    if (errorToastConfig) {
      toast(errorToastConfig);
    } else {
      setIsLocallyLocked(true);
    }
  }, [currentUser.id, sessionId, sessionLockedByUserId, toast]);

  const chat = useChat({
    initialMessages: existing?.messageRows.map(messageRowToChatMessage), // || DUMMY_MESSAGES,
    body: { scenario: selectedScenarioText },
    async onResponse(response) {
      // ie the start of a request response stream
      console.log("useAiChat:onResponse", response);
      await lockSessionMessaging();
    },
    async onFinish(message) {
      console.log("useAiChat:onFinish", message);
      const errorToastConfigs = await Promise.all([
        unlockSessionMessaging(),
        APIClient.messages.add({
          session_id: sessionId,
          content: message.content,
          author_role: "assistant",
          author_id: null,
        }),
      ]);

      // todo move toasts to APIClient
      errorToastConfigs.filter(isTruthy).forEach(toast);
    },
    async onError(error) {
      void unlockSessionMessaging();
      console.error("useAiChat:onError", error);
      toast({
        title: "Error generating response",
        description: error instanceof Error ? error.message : String(error),
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    },
  });
  const chatRef = useRef<UseChatHelpers>(chat);
  useEffect(() => {
    chatRef.current = chat;
  }, [chat]);

  const handleSubmit: UseChatHelpers["handleSubmit"] = useCallback(
    async (e) => {
      e.preventDefault(); // need to prevent this here as the event gets handled synchronously before our promises below resolve
      const content = chatRef.current.input;
      chatRef.current.setInput("");
      if (!content) {
        return;
      }

      const potentialErrorToastConfigs = await Promise.all([
        lockSessionMessaging(),
        // this will trigger message insert listeners which will update UI
        APIClient.messages.add({
          session_id: sessionId,
          content,
          author_role: "user" as Message["role"],
          author_id: currentUser.id,
        }),
      ]);

      const errorToastConfigs = potentialErrorToastConfigs.filter(isTruthy);
      if (errorToastConfigs.some(isTruthy)) {
        errorToastConfigs.forEach(toast);
        await unlockSessionMessaging();
      }
    },
    [currentUser.id, lockSessionMessaging, sessionId, toast, unlockSessionMessaging],
  );

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
        async (payload) => {
          console.log("useAiChat: messages insert subscription event payload", payload);
          const newMessageRow = payload.new;
          const localChatAlreadyHasMessage = chatRef.current.messages.some(
            (m) => String(m.id) === String(newMessageRow.id),
          );
          if (localChatAlreadyHasMessage) {
            console.log("useAiChat: local chat already has message, ignoring", newMessageRow);
            return;
          }

          setMessageRows((currentMessageRows) => {
            if (newMessageRow.author_role === "assistant") {
              void unlockSessionMessaging();

              const lastMessage = currentMessageRows.at(-1);
              if (lastMessage?.author_role === "assistant") {
                currentMessageRows = currentMessageRows.slice(0, -1);
              }
            }

            return [...currentMessageRows, newMessageRow];
          });
        },
      )
      .subscribe();

    return () => {
      console.log("useAiChat:unsubscribe");
      void supabase.removeChannel(subscription);
    };
  }, [sessionId, unlockSessionMessaging]);

  // todo handle streaming messages from assistant
  // useEffect(() => {
  //   const lastChatMessage = chat.messages.at(-1);
  //   if (lastChatMessage?.role !== "assistant") {
  //     return;
  //   }

  //   // todo share streaming with session users, ie write this to DB
  //   setMessageRows((currentMessageRows) => {
  //     const lastMessageRow = messageRows.at(-1);
  //     if (lastMessageRow?.author_role === "assistant") {
  //       // update last assistant message
  //       currentMessageRows = currentMessageRows.slice(0, -1);
  //     }

  //     return [
  //       ...currentMessageRows,
  //       // add assistant message being currently streamed
  //       {
  //         id: -1,
  //         session_id: sessionId,
  //         content: lastChatMessage.content,
  //         author_role: lastChatMessage.role,
  //         author_id: null,
  //         inserted_at: "",
  //         updated_at: "",
  //       } satisfies MessageRow,
  //     ];
  //   });
  // }, [chat.messages, messageRows, sessionId]);

  useEffect(() => {
    if (!chatRef.current.input.trim()) {
      textAreaRef.current!.value = "";
    }
  }, [chatRef.current.input]);

  useEffect(() => {
    // if we re-mount it means the session can be unlocked
    void unlockSessionMessaging();
    return () => {
      void unlockSessionMessaging();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- prevent unlocking on re-render
  }, []);

  useAutoScrolling({
    messages: chat.messages,
    messagesListEl: messagesListRef.current,
  });

  // focus on input when chat is ready
  useEffect(() => {
    if (!chat.isLoading) {
      textAreaRef.current?.focus();
    }
  }, [chat.isLoading]);

  // create chat response when user message is added
  useEffect(() => {
    const lastMessage = messageRows.at(-1);
    if (lastMessage?.author_id === currentUser.id) {
      console.log("useAiChat: last message is from user, loading ai response...", lastMessage);
      chatRef.current.setMessages(messageRows.map(messageRowToChatMessage));
      // reload after a tick to ensure the chat is ready
      setTimeout(() => chatRef.current.reload(), 0);
    }
  }, [chatRef, currentUser.id, messageRows]);

  if (!selectedScenarioText) {
    throw new Error("selectedScenarioText is required");
  }

  return {
    chat: {
      ...chat,
      handleSubmit,
      // should not be used externally, prefer messageRows
      messages: [],
      isLocked: isLocallyLocked || !!sessionLockedByUserId,
    } satisfies UseChatHelpers & Record<string, unknown>,
    messageRows,
    messagesListRef: messagesListRefNotifier,
    textAreaRef,
    formRef,
    selectedScenarioText,
  };
}

export default function ScenarioChat(props: Props) {
  const { chat, messageRows, formRef, messagesListRef, textAreaRef, selectedScenarioText } =
    useAiChat(props);
  const messagesList = (
    <Flex width='100%' ref={messagesListRef} direction='column' overflow='auto' tabIndex={0}>
      {messageRows.map((messageRow, i) => {
        const isLastEntry = !messageRows[i + 1];
        const authorUser = props.users.find((u) => u.id === messageRow.author_id);
        return (
          <Box key={messageRow.id}>
            <ChatMessage messageRow={messageRow} authorName={authorUser?.name || "..."} />
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
          // prevent new line on submit
          e.preventDefault();
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
            disabled={chat.isLoading || chat.isLocked}
            isInvalid={!!chat.error}
            // minHeight='unset'
            // maxHeight='10rem'
            value={chat.input}
            placeholder={chat.isLocked ? "AI typing..." : getPlaceholderText(chat)}
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
                type='button'
                variant='ghost'
                colorScheme='orange'
                // leftIcon={<Spinner />}
                onClick={chat.stop}
                isLoading
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
              .filter((user) => !user.isCurrentUser)
              .map((user) => {
                const userVotes = props.outcomeVotes[user.id];
                const userHasFinishedVoting =
                  userVotes && Object.values(userVotes).length === props.users.length;
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

  console.log("users", users);
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
