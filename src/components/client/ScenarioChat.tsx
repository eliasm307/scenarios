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
  useBreakpointValue,
} from "@chakra-ui/react";
import { useCallback, useEffect, useRef } from "react";
import Image from "next/image";
import ChatMessage from "../ChatMessage";
import type { MessageRow, SessionUser } from "../../types";
import ScenarioText from "../ScenarioText";
import ReadOutLoudButton from "../ReadOutLoudButton";
import { useElement } from "../../utils/client/hooks";
import type { ScenarioChatViewProps } from "./ScenarioChat.container";

function ChatPanel({ selectedScenarioImageUrl, messageRows, users, chat }: ScenarioChatViewProps) {
  const messagesList = useElement<HTMLDivElement>();
  const textArea = useElement<HTMLTextAreaElement>();
  const form = useElement<HTMLFormElement>();

  // focus on input when chat is ready for user input
  useEffect(() => {
    if (!chat.isLoading) {
      textArea.element?.focus();
    }
  }, [chat.isLoading, textArea.element]);

  useAutoScrolling({
    messages: messageRows,
    messagesListEl: messagesList.element,
  });

  const messagesListNode = (
    <Flex
      className='messages-list'
      width='100%'
      ref={messagesList.ref}
      direction='column'
      overflow='auto'
      tabIndex={0}
    >
      <Box position='relative' width='100%' minHeight='20rem'>
        {selectedScenarioImageUrl ? (
          <Image src={selectedScenarioImageUrl} alt='Scenario image' fill objectFit='contain' />
        ) : (
          <VStack width='100%' marginTop={10} placeContent='center'>
            <Spinner />
            <Text>Loading cover image...</Text>
          </VStack>
        )}
      </Box>
      {messageRows.map((messageRow, i) => {
        const isLastEntry = !messageRows[i + 1];
        const authorUser = users.find((u) => u.id === messageRow.author_id);
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

  const typingUsers = users.filter((user) => user.isTyping && !user.isCurrentUser);

  const controlsNode = (
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
        {chat.isLoading && <Badge colorScheme='green'>AI is typing...</Badge>}
        {typingUsers.map((typingUser) => {
          return (
            <Badge key={typingUser.id} colorScheme='gray'>
              &quot;{typingUser.name}&quot; is typing...
            </Badge>
          );
        })}
      </HStack>
      <form ref={form.ref} onSubmit={chat.handleSubmit}>
        <Flex gap={2} alignItems='center' flexDirection={{ base: "column", md: "row" }}>
          <Textarea
            width='100%'
            flex={1}
            variant='outline'
            ref={textArea.ref}
            resize='none'
            // dont disable as it prevents other users to keep typing while waiting for AI response
            isInvalid={chat.hasError}
            // minHeight='unset'
            // maxHeight='10rem'
            spellCheck={false}
            // make sure inline grammarly popup is off, its annoying and not really needed here
            data-gramm='false'
            data-gramm_editor='false'
            data-enable-grammarly='false'
            {...chat.inputProps}
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
                isDisabled={!chat.allowsSubmitting}
              >
                {chat.isLoading ? "AI typing..." : "Send"}
              </Button>
            )}
          </Flex>
        </Flex>
      </form>
    </Flex>
  );

  return (
    <Grid
      className='chat-panel'
      height='100%'
      overflow='hidden'
      gap={1}
      templateRows='1fr auto'
      pt={0}
    >
      {messagesListNode}
      {controlsNode}
    </Grid>
  );
}

function VotingPanel(props: ScenarioChatViewProps) {
  return (
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
}

function DesktopScenarioChat(props: ScenarioChatViewProps) {
  return (
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
        <ScenarioText scenarioText={props.selectedScenarioText} />
        <Center>
          <ReadOutLoudButton text={props.selectedScenarioText} />
        </Center>
        <Divider />
        <VotingPanel {...props} />
      </VStack>
      <ChatPanel {...props} />
    </Grid>
  );
}

function MobileScenarioChat(props: ScenarioChatViewProps) {
  return (
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
          <ScenarioText scenarioText={props.selectedScenarioText} />
        </TabPanel>
        <TabPanel height='100%' overflow='auto'>
          <VotingPanel {...props} />
        </TabPanel>
        <TabPanel height='100%' overflow='hidden'>
          <ChatPanel {...props} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

export default function ScenarioChat(props: ScenarioChatViewProps) {
  const isDesktopSize = useBreakpointValue({ base: false, md: true });
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
      {isDesktopSize ? <DesktopScenarioChat {...props} /> : <MobileScenarioChat {...props} />}
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

function OutcomeVotingTable({
  users,
  outcomeVotesForCurrentUser,
  handleVoteChange,
}: ScenarioChatViewProps) {
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
