import { HStack, Avatar, Flex, Text, VStack } from "@chakra-ui/react";
import type { Message } from "ai";

function getFriendlySenderName({ role }: Message): string {
  if (role === "user") {
    return "Human";
  }

  return "AI";
}

type Props = {
  message: Message;
};

function ChatMessage(props: Props) {
  const { message } = props;
  const isUser = message.role === "user";
  const senderAvatarSrc = isUser ? "" : "/assets/openai.png";
  const senderFriendlyName = getFriendlySenderName(message);

  const headerRow = (
    <Flex
      alignItems='center'
      pt={2}
      mb={0} // needed for sticky to cover the whole container
      gap={2}
      flexDirection={isUser ? "row-reverse" : "row"}
      background='var(--chakra-colors-chakra-body-bg)'
      zIndex={1}
      position='sticky'
      // make sure there is no gap between the header and the sticky message
      // funnily this is something also used in the official MDN example: https://developer.mozilla.org/en-US/docs/Web/CSS/position#sticky_positioning
      top='-1px'
      // add faded border
      _after={{
        content: '""',
        position: "absolute",
        left: "0",
        right: "0",
        bottom: "-20px",
        height: "20px",
        backgroundImage:
          "linear-gradient(to bottom, var(--chakra-colors-chakra-body-bg), transparent 90%)",
      }}
    >
      <Avatar size='sm' name={senderFriendlyName} src={senderAvatarSrc} />
      <Text as='span' fontWeight='bold' fontSize='xl' textAlign={isUser ? "right" : "left"}>
        {senderFriendlyName}
      </Text>
      <HStack flexDirection='inherit' flex={1} justifyContent={isUser ? "start" : "end"} gap={0} />
    </Flex>
  );

  const contentBody = (
    <VStack
      gap={2}
      py={2}
      borderRadius={5}
      width='100%'
      marginRight='9rem'
      alignItems={isUser ? "flex-end" : "flex-start"}
      textAlign={isUser ? "right" : "left"}
    >
      <Flex flexDirection='column' width='inherit' gap={2} position='relative'>
        <Text>{message.content}</Text>
      </Flex>
      {/* <Divider /> */}
    </VStack>
  );

  return (
    <Flex
      flexDirection='column'
      width='100%' // prevent horizontal scroll
      px={3}
    >
      {headerRow}
      {contentBody}
    </Flex>
  );
}

export default ChatMessage;
