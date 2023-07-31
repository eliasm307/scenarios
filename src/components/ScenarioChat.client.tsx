/* eslint-disable functional-core/purity */
/* eslint-disable no-console */
/* eslint-disable react/no-unused-prop-types */

"use client";

import {
  Badge,
  Box,
  Button,
  Center,
  Divider,
  Flex,
  Grid,
  HStack,
  Heading,
  Radio,
  RadioGroup,
  Show,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableContainer,
  Tabs,
  Tbody,
  Td,
  Text,
  Textarea,
  VStack,
} from "@chakra-ui/react";
import type { UseChatHelpers } from "ai/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import Image from "next/image";
import ChatMessage from "./ChatMessage";
import { getSupabaseClient } from "../utils/client/supabase";
import type { SessionRow, MessageRow, SessionUser } from "../types";
import APIClient from "../utils/client/APIClient";
import { isTruthy } from "../utils/general";
import ScenarioText from "./ScenarioText";
import type { BroadcastFunction } from "./GameSession.client";
import ReadOutLoudButton from "./ReadOutLoudButton";
import { useCustomToast } from "../utils/client/hooks";

type Props = {
  selectedScenarioText: string | null;
  currentUser: SessionUser;
  users: SessionUser[];
  sessionId: number;
  outcomeVotes: NonNullable<SessionRow["scenario_outcome_votes"]>;
  broadcast: BroadcastFunction;
  selectedScenarioImagePath: string | null;
  aiIsResponding: boolean;
  existing: {
    messageRows: MessageRow[];
  };
};

function useAiChat({
  existing,
  selectedScenarioText,
  currentUser,
  sessionId,
  selectedScenarioImagePath,
  broadcast,
  aiIsResponding,
}: Props) {
  const toast = useCustomToast();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const messagesListRef = useRef<HTMLDivElement>(null);
  const [messageRows, setMessageRows] = useState<MessageRow[]>(existing?.messageRows ?? []);
  const [inputValue, setInputValue] = useState("");
  const [error] = useState<Error | null>(null); // todo is this required?
  const isLoading = messageRows.at(-1)?.author_role === "user"; // ie the response is loading

  const handleSubmit: UseChatHelpers["handleSubmit"] = useCallback(
    async (e) => {
      e.preventDefault(); // need to prevent this here as the event gets handled synchronously before our promises below resolve
      const content = inputValue.trim();
      if (!content) {
        return;
      }
      setInputValue("");

      const potentialErrorToastConfigs = await Promise.all([
        // this will trigger message insert edge function to respond from db
        APIClient.messages.add({
          session_id: sessionId,
          content,
          author_role: "user",
          author_id: currentUser.id,
        } satisfies Omit<MessageRow, "id" | "inserted_at" | "updated_at" | "author_ai_model_id">),
      ]);

      const errorToastConfigs = potentialErrorToastConfigs.filter(isTruthy);
      if (errorToastConfigs.some(isTruthy)) {
        errorToastConfigs.forEach(toast);
      }
    },
    [currentUser.id, inputValue, sessionId, toast],
  );

  const messagesListRefNotifier = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      // @ts-expect-error [setting to readonly allowed]
      messagesListRef.current = node;
      // this is to force a re-render when the ref changes
      setMessageRows((currentMessageRows) => [...currentMessageRows]);
    }
  }, []);

  const messageRowsRef = useRef<MessageRow[]>(messageRows);
  useEffect(() => {
    messageRowsRef.current = messageRows;
  }, [messageRows]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const subscription = supabase
      .channel(`session:${sessionId}`)
      .on<MessageRow>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          schema: "public",
          table: "messages",
          event: "*",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            setMessageRows((currentMessageRows) => [...currentMessageRows, payload.new]);

            // handle update (e.g. AI streaming)
          } else if (payload.eventType === "UPDATE") {
            const updatedMessageRow = payload.new;
            setMessageRows((localMessageRows) => {
              return localMessageRows.map((localMessageRow) => {
                if (String(localMessageRow.id) === String(updatedMessageRow.id)) {
                  return updatedMessageRow;
                }
                return localMessageRow;
              });
            });
          }
        },
      )
      .subscribe();

    return () => {
      console.log("useAiChat:unsubscribe");
      void supabase.removeChannel(subscription);
    };
  }, [sessionId]);

  useAutoScrolling({
    messages: messageRows,
    messagesListEl: messagesListRef.current,
  });

  // focus on input when chat is ready for user input
  useEffect(() => {
    if (!isLoading || !aiIsResponding) {
      textAreaRef.current?.focus();
    }
  }, [isLoading, aiIsResponding]);

  useEffect(() => {
    let typingTimeoutId: ReturnType<typeof setTimeout> | undefined;
    let coolingDownTimeoutId: ReturnType<typeof setTimeout> | undefined;

    function handleKeydown() {
      clearTimeout(typingTimeoutId);
      typingTimeoutId = setTimeout(() => {
        broadcast({
          event: "TypingStateChanged",
          data: {
            isTyping: false,
            userId: currentUser.id,
          },
        });
      }, 3000);

      if (typeof coolingDownTimeoutId === "number") {
        return;
      }

      // for rate limiting
      coolingDownTimeoutId = setTimeout(() => {
        coolingDownTimeoutId = undefined;
      }, 250);

      broadcast({
        event: "TypingStateChanged",
        data: {
          isTyping: true,
          userId: currentUser.id,
        },
      });
    }

    // not implementing coolingDown because it would be impressive if
    // someone manages to blur and focus so fast to affect rate limiting
    function handleBlur() {
      clearTimeout(typingTimeoutId);
      broadcast({
        event: "TypingStateChanged",
        data: {
          isTyping: false,
          userId: currentUser.id,
        },
      });
    }

    const textAreaEl = textAreaRef.current;
    textAreaEl?.addEventListener("keydown", handleKeydown);
    textAreaEl?.addEventListener("blur", handleBlur);

    return () => {
      broadcast({
        event: "TypingStateChanged",
        data: {
          isTyping: false, // make sure listeners aren't left hanging with a typing state
          userId: currentUser.id,
        },
      });
      clearTimeout(typingTimeoutId);
      textAreaEl?.removeEventListener("keydown", handleKeydown);
      textAreaEl?.removeEventListener("blur", handleBlur);
    };
  }, [broadcast, currentUser.id, textAreaRef]);

  const sortedMessageRows = useMemo(() => {
    return [...messageRows].sort((rowA, rowB) => {
      const dateA = new Date(rowA.updated_at);
      const dateB = new Date(rowB.updated_at);
      return dateA.getTime() - dateB.getTime();
    });
  }, [messageRows]);

  if (!selectedScenarioText) {
    throw new Error("selectedScenarioText is required");
  }

  return {
    chat: {
      handleSubmit,
      // should not be used externally, prefer messageRows
      messages: [],
      isLocked: aiIsResponding,
      isLoading: aiIsResponding,
      inputPlaceholderText: aiIsResponding
        ? "AI typing..."
        : getPlaceholderText({ isLoading, error: !!error }),
      input: inputValue,
      handleInputChange: (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setInputValue(e.target.value),
      error,
    },
    messageRows: sortedMessageRows,
    messagesListRef: messagesListRefNotifier,
    textAreaRef,
    formRef,
    selectedScenarioText,
    selectedScenarioImagePath,
  };
}

export default function ScenarioChat(props: Props) {
  const {
    chat,
    messageRows,
    formRef,
    messagesListRef,
    textAreaRef,
    selectedScenarioText,
    selectedScenarioImagePath,
  } = useAiChat(props);

  const imageUrl = useMemo(() => {
    if (!selectedScenarioImagePath) {
      return null;
    }
    // console.log("image loader called", { path, width, quality });
    // type ImageLoaderProps = Parameters<NonNullable<React.ComponentProps<typeof Image>["loader"]>>[0];
    return getSupabaseClient().storage.from("images").getPublicUrl(selectedScenarioImagePath, {
      // todo image resizing requires pro plan for now but if it becomes free convert this to an image loader for the Next image component
      // transform: {
      //   quality,
      //   width,
      //   resize: "contain",
      // },
    }).data.publicUrl;
  }, [selectedScenarioImagePath]);

  const messagesList = (
    <Flex
      className='messages-list'
      width='100%'
      ref={messagesListRef}
      direction='column'
      overflow='auto'
      tabIndex={0}
    >
      <Box position='relative' width='100%' minHeight='20rem'>
        {imageUrl ? (
          <Image src={imageUrl} alt='Scenario image' fill objectFit='contain' />
        ) : (
          <VStack width='100%' marginTop={10} placeContent='center'>
            <Spinner />
            <Text>Loading cover image...</Text>
          </VStack>
        )}
      </Box>
      {messageRows.map((messageRow, i) => {
        const isLastEntry = !messageRows[i + 1];
        const authorUser = props.users.find((u) => u.id === messageRow.author_id);
        return (
          <Box key={`message-${messageRow.id}`}>
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
      // allow for multiline input, ie shift enter which is not for confirming
      const isConfirmEnter = !e.shiftKey;
      if (isConfirmEnter) {
        // prevent new line on submit
        e.preventDefault();
        const hasUserInput = !!textAreaRef.current?.value;
        if (hasUserInput && !chat.isLoading && !chat.isLocked && formRef.current) {
          formRef.current.requestSubmit();
        }
      }
    },
    [chat.isLoading, chat.isLocked, formRef, textAreaRef],
  );

  const typingUsers = props.users.filter((user) => user.isTyping && !user.isCurrentUser);

  const controls = (
    <Flex
      className='chat-controls'
      width='100%'
      gap={2}
      p={3}
      pt={1}
      pb={{ base: 0, md: 3 }}
      flexDirection='column'
      position='relative'
    >
      <HStack
        className='chat-typing-indicators'
        width='100%'
        alignItems='center'
        minHeight={5}
        wrap='wrap'
      >
        {(chat.isLocked || chat.isLoading) && <Badge colorScheme='green'>AI is typing...</Badge>}
        {typingUsers.map((typingUser) => {
          return (
            <Badge key={typingUser.id} colorScheme='gray'>
              &quot;{typingUser.name}&quot; is typing...
            </Badge>
          );
        })}
      </HStack>
      <form ref={formRef} onSubmit={chat.handleSubmit}>
        <Flex gap={2} alignItems='center' flexDirection={{ base: "column", md: "row" }}>
          <Textarea
            width='100%'
            flex={1}
            variant='outline'
            ref={textAreaRef}
            resize='none'
            // dont disable as it prevents other users to keep typing while waiting for AI response
            isInvalid={!!chat.error}
            // minHeight='unset'
            // maxHeight='10rem'
            value={chat.input}
            placeholder={chat.inputPlaceholderText}
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
                // onClick={chat.stop} // todo can we make this work? what if the client can set the ai_is_typing to false and the server will stop the ai?
                isLoading
              >
                {/* Stop */}
              </Button>
            ) : (
              <Button
                key='send'
                type='submit'
                variant='ghost'
                colorScheme='green'
                isDisabled={!chat.input || chat.isLoading || chat.isLocked}
              >
                {chat.isLoading && chat.isLocked ? "AI typing..." : "Send"}
              </Button>
            )}
          </Flex>
        </Flex>
      </form>
    </Flex>
  );

  const votingPanel = (
    <VStack className='voting-panel' gap={3} width='100%' flex={1}>
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
  );

  const chatPanel = (
    <Grid
      className='chat-panel'
      height='100%'
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
  );

  // todo show the scenario panel and chat panel as tabs on mobile and side by side on larger screens
  return (
    <Box
      className='scenario-chat'
      height='100%'
      overflow='hidden'
      position='relative'
      padding={2}
      my={2}
      width='100%'
    >
      <Show above='md'>
        <Grid
          as='section'
          // height='100dvh'
          width='100%'
          height='100%'
          overflow='hidden'
          // templateRows='100%'
          templateColumns='1fr 1fr'
          position='absolute'
          inset={0}
          padding={2}
          gap={5}
        >
          <VStack m={3} gap={5} width='100%' maxHeight='100%' overflowY='auto'>
            <ScenarioText scenarioText={selectedScenarioText} />
            <Center>
              <ReadOutLoudButton text={selectedScenarioText} />
            </Center>
            <Divider />
            {votingPanel}
          </VStack>
          {chatPanel}
        </Grid>
      </Show>
      <Show below='md'>
        <Tabs
          isFitted
          variant='enclosed'
          height='100%'
          display='flex'
          flexDirection='column'
          overflow='hidden'
        >
          <TabList mb='1em'>
            <Tab>Scenario</Tab>
            <Tab>Vote</Tab>
            <Tab>Chat</Tab>
          </TabList>
          <TabPanels flex={1} overflow='hidden'>
            <TabPanel height='100%' overflow='auto'>
              <ScenarioText scenarioText={selectedScenarioText} />
            </TabPanel>
            <TabPanel height='100%' overflow='auto'>
              {votingPanel}
            </TabPanel>
            <TabPanel height='100%' overflow='hidden'>
              {chatPanel}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Show>
    </Box>
  );
}

function useAutoScrolling({
  messages,
  messagesListEl,
}: {
  messages: readonly MessageRow[];
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

    const lastMessageSentByUser = messages.at(-1)?.author_role === "user";
    if (lastMessageSentByUser || shouldAutoScroll.current) {
      scrollToBottom(messagesListEl);
    }
  }, [messagesListEl, messages]);
}

function scrollToBottom(scrollableEl: HTMLElement) {
  // eslint-disable-next-line no-param-reassign, functional-core/purity
  scrollableEl.scrollTop = scrollableEl.scrollHeight;
}

function getPlaceholderText(chat: { isLoading: boolean; error: boolean }): string {
  if (chat.isLoading) {
    return "Thinking 🤔...";
  }
  if (chat.error) {
    return "An error occurred 😢";
  }
  return "Ask me anything about the scenario 😀";
}

function overallOutcomeVotingIsComplete({
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
  const toast = useCustomToast();
  const outcomeVotesForCurrentUser = outcomeVotes[currentUser.id];

  const handleVoteChange = useCallback(
    async ({ voteForUserId, newVote }: { voteForUserId: string; newVote: "true" | "false" }) => {
      const outcomeVoteFromCurrentUser = newVote === "true";
      const voteTargetUser = users.find((user) => user.id === voteForUserId);
      console.log("outcomeVoteFromCurrentUser", voteTargetUser?.name, outcomeVoteFromCurrentUser);
      let errorToastConfig = await APIClient.sessions.voteForUserOutcome({
        session_id: sessionId,
        vote_by_user_id: currentUser.id,
        vote_for_user_id: voteForUserId,
        outcome: outcomeVoteFromCurrentUser,
      });
      console.log("outcomeVoteFromCurrentUser errorToastConfig", errorToastConfig);
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

      if (!overallOutcomeVotingIsComplete({ users, outcomeVotes: updatedOutcomeVotes })) {
        const userOutcomeVotingIsComplete =
          Object.values(updatedOutcomeVotes[currentUser.id] || {}).length === users.length;
        if (userOutcomeVotingIsComplete) {
          broadcast({
            event: "Toast",
            data: {
              title: `"${currentUser.name}" has finished voting!`,
              status: "success",
            },
          });
        }
        return;
      }
      console.log("voting complete");

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
    [
      sessionId,
      currentUser.id,
      currentUser.name,
      outcomeVotes,
      outcomeVotesForCurrentUser,
      users,
      broadcast,
      toast,
    ],
  );

  return (
    <TableContainer>
      <Table variant='unstyled'>
        <Tbody>
          {users.map((user) => (
            <UserOutcomeVotingRow
              key={`${user.id}-outcome-voting-row`}
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
          👍🏾 would do it
        </Radio>
      </Td>
      <Td>
        <Radio colorScheme='red' value='false'>
          👎🏾 would not do it
        </Radio>
      </Td>
    </RadioGroup>
  );
}
