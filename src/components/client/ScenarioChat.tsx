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
import ScenarioText from "../ScenarioText";
import ReadOutLoudButton from "../ReadOutLoudButton";
import type { ScenarioChatViewProps } from "./ScenarioChat.container";
import ChatPanel from "./ScenarioChatPanel";
import VotingPanel from "./ScenarioChatVotingPanel";
import { useIsLargeScreen } from "../../utils/client/hooks";

function ScenarioTextPanel({ scenarioText }: { scenarioText: string }) {
  return (
    <VStack mr={3}>
      <ScenarioText scenarioText={scenarioText} />
      <Center>
        <ReadOutLoudButton text={scenarioText} />
      </Center>
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
        <ScenarioTextPanel scenarioText={props.selectedScenarioText} />
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
          <ScenarioTextPanel scenarioText={props.selectedScenarioText} />
        </TabPanel>
        <TabPanel height='100%' overflow='auto'>
          <VotingPanel isFullWidth {...props} />
        </TabPanel>
        <TabPanel height='100%' overflow='hidden'>
          <ChatPanel {...props} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}

export default function ScenarioChat(props: ScenarioChatViewProps) {
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
      {isLargeScreen ? <DesktopScenarioChat {...props} /> : <MobileScenarioChat {...props} />}
    </Box>
  );
}
