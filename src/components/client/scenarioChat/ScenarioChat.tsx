/* eslint-disable functional-core/purity */
/* eslint-disable no-console */
/* eslint-disable react/no-unused-prop-types */

"use client";

import {
  Box,
  Center,
  Divider,
  Grid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  VStack,
} from "@chakra-ui/react";
import { memo, useEffect, useState } from "react";
import ScenarioText from "../../ScenarioText";
import ReadOutLoudButton from "../../ReadOutLoudButton";
import type { ScenarioChatViewProps } from "./ScenarioChat.container";
import ChatPanel from "./ScenarioChatPanel";
import VotingPanel from "./ScenarioChatVotingPanel";
import { useCustomToast, useIsLargeScreen } from "../../../utils/client/hooks";

function ScenarioTextPanel({ scenarioText }: { scenarioText: string }) {
  return (
    <VStack mr={3} gap={5}>
      <ScenarioText scenarioText={scenarioText} />
      <Center>
        <ReadOutLoudButton text={scenarioText} />
      </Center>
    </VStack>
  );
}

type Props = Pick<
  ScenarioChatViewProps,
  | "selectedScenarioText"
  | "handleVoteChange"
  | "outcomeVotesByCurrentUser"
  | "readyForNextStageProps"
  | "remoteUserVotingStatuses"
  | "chat"
  | "messageRows"
  | "selectedScenarioImageUrl"
  | "users"
>;

const ScenarioAndVotingPanel = memo(function ScenarioAndVotingPanel({
  handleVoteChange,
  selectedScenarioText,
  outcomeVotesByCurrentUser,
  readyForNextStageProps,
  remoteUserVotingStatuses,
  users,
}: Pick<
  Props,
  | "selectedScenarioText"
  | "handleVoteChange"
  | "outcomeVotesByCurrentUser"
  | "readyForNextStageProps"
  | "remoteUserVotingStatuses"
  | "users"
>) {
  return (
    <VStack m={3} gap={5} width='100%' maxHeight='100%' overflowY='auto'>
      <ScenarioTextPanel scenarioText={selectedScenarioText} />
      <Divider />
      <VotingPanel
        {...{
          handleVoteChange,
          outcomeVotesByCurrentUser,
          readyForNextStageProps,
          remoteUserVotingStatuses,
          users,
        }}
      />
    </VStack>
  );
});

function DesktopScenarioChat({
  selectedScenarioText,
  handleVoteChange,
  outcomeVotesByCurrentUser,
  readyForNextStageProps,
  remoteUserVotingStatuses,
  chat,
  messageRows,
  selectedScenarioImageUrl,
  users,
}: Props) {
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
      <ScenarioAndVotingPanel
        {...{
          handleVoteChange,
          selectedScenarioText,
          outcomeVotesByCurrentUser,
          readyForNextStageProps,
          remoteUserVotingStatuses,
          users,
        }}
      />
      <ChatPanel {...{ chat, messageRows, selectedScenarioImageUrl, users }} />
    </Grid>
  );
}

function MobileScenarioChat({
  selectedScenarioText,
  handleVoteChange,
  outcomeVotesByCurrentUser,
  readyForNextStageProps,
  remoteUserVotingStatuses,
  chat,
  messageRows,
  selectedScenarioImageUrl,
  users,
}: Props) {
  const toast = useCustomToast();
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [messagesCount, setMessagesCount] = useState(messageRows.length);

  useEffect(() => {
    const oldMessagesCount = messagesCount;
    const newMessagesCount = messageRows.length;
    setMessagesCount(newMessagesCount);

    const isOnChatTab = activeTabIndex === 2;
    if (isOnChatTab) {
      // user can see the messages
      return;
    }

    if (newMessagesCount <= oldMessagesCount) {
      return; // changes are not relevant
    }

    // user is not on the chat tab and there are new messages
    toast({
      title: "New message(s) in chat",
    });
  }, [activeTabIndex, messageRows.length, messagesCount, toast]);

  return (
    <Tabs
      isFitted
      variant='enclosed'
      height='100%'
      display='flex'
      flexDirection='column'
      overflow='hidden'
      defaultIndex={activeTabIndex}
      onChange={setActiveTabIndex}
    >
      <TabList mb='1em'>
        <Tab>Scenario</Tab>
        <Tab>Vote</Tab>
        <Tab>Chat</Tab>
      </TabList>
      <TabPanels flex={1} overflow='hidden'>
        <TabPanel height='100%' overflow='auto'>
          <ScenarioTextPanel key='scenario-text' scenarioText={selectedScenarioText} />
        </TabPanel>
        <TabPanel height='100%' overflow='auto'>
          <VotingPanel
            key='voting-panel'
            isFullWidth
            {...{
              handleVoteChange,
              outcomeVotesByCurrentUser,
              readyForNextStageProps,
              remoteUserVotingStatuses,
              users,
            }}
          />
        </TabPanel>
        <TabPanel height='100%' overflow='hidden'>
          <ChatPanel
            key='chat-panel'
            {...{
              chat,
              messageRows,
              selectedScenarioImageUrl,
              users,
            }}
          />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

export default function ScenarioChat(props: Props) {
  const isLargeScreen = useIsLargeScreen({ above: "lg" });
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
      {isLargeScreen ? (
        <DesktopScenarioChat key='desktop' {...props} />
      ) : (
        <MobileScenarioChat key='mobile' {...props} />
      )}
    </Box>
  );
}
