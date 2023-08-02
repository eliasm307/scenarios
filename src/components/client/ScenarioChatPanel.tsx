import {
  Flex,
  VStack,
  Spinner,
  Divider,
  HStack,
  Badge,
  Textarea,
  Button,
  Grid,
  Box,
  Text,
} from "@chakra-ui/react";
import { useEffect, useRef } from "react";
import Image from "next/image";
import { useElement } from "../../utils/client/hooks";
import ChatMessage from "../ChatMessage";
import type { ScenarioChatViewProps } from "./ScenarioChat.container";
import type { MessageRow } from "../../types";

export default function ChatPanel({
  selectedScenarioImageUrl,
  messageRows,
  users,
  chat,
}: ScenarioChatViewProps) {
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
          <Box key={`message-${messageRow.id}-${messageRow.author_role}-${messageRow.content}`}>
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
