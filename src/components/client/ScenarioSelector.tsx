/* eslint-disable react/no-unused-prop-types */

"use client";

import {
  Badge,
  Box,
  Button,
  Center,
  Divider,
  HStack,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useMemo } from "react";
import type { ChoiceConfig } from "../ChoiceGrid.client";
import ChoiceGrid from "../ChoiceGrid.client";
import ScenarioText from "../ScenarioText";
import ReadOutLoudButton from "../ReadOutLoudButton";
import type { ScenarioSelectorViewProps } from "./ScenarioSelector.container";
import ReadyForNextStageButton from "./ReadyForNextStageButton";
import { GENERATE_NEW_SCENARIOS_OPTION_ID } from "../../utils/constants";

export default function ScenarioSelector(props: ScenarioSelectorViewProps): React.ReactElement {
  const {
    isLoading,
    currentUser,
    hasUserSelectedOption,
    scenarioOptions,
    usersWaitingToVote,
    readyForNextStageProps,
  } = props;

  if (isLoading) {
    return (
      <Center as='section' height='100%' display='flex' flexDirection='column' gap={3}>
        <Spinner fontSize='2xl' />
        <Heading>Loading...</Heading>
      </Center>
    );
  }

  const votedForNewScenariosOption = hasUserSelectedOption(
    currentUser.id,
    GENERATE_NEW_SCENARIOS_OPTION_ID,
  );
  return (
    <VStack className='scenario-selector' as='section' p={10} height='100%' width='100%'>
      <Heading textAlign='center'>Vote for a Scenario to Play!</Heading>
      <HStack wrap='wrap'>
        <span>Users waiting to vote: </span>
        {usersWaitingToVote.map((user) => (
          <Badge key={user.id} colorScheme={user.isCurrentUser ? "green" : "gray"}>
            {user.isCurrentUser ? "Me" : user.name}
          </Badge>
        ))}
      </HStack>
      <VStack
        key={scenarioOptions.join("+")}
        width='100%'
        maxWidth='100rem'
        overflow='auto'
        pb={6}
        flex={1}
        gap={4}
      >
        <ChoiceGrid
          choices={[
            ...scenarioOptions.map((text, optionId): ChoiceConfig => {
              const isSelected = hasUserSelectedOption(currentUser.id, optionId);
              return {
                text,
                isSelected,
                content: (
                  <Box key={`${text.trim() || optionId}-container`}>
                    {text.trim() ? (
                      <OptionContent
                        key={text + optionId}
                        optionId={optionId}
                        viewProps={props}
                        text={text}
                      />
                    ) : (
                      <Center
                        key={`${optionId}-loading`}
                        as='section'
                        height='100%'
                        display='flex'
                        flexDirection='column'
                        gap={3}
                      >
                        <Spinner />
                        <Heading fontSize='xl'>Loading scenario...</Heading>
                      </Center>
                    )}
                  </Box>
                ),
              };
            }),
            {
              content: (
                <OptionContent
                  key='new'
                  optionId={GENERATE_NEW_SCENARIOS_OPTION_ID}
                  viewProps={props}
                  notReadable
                  text='🆕 Vote to generate new scenarios'
                />
              ),
              isSelected: votedForNewScenariosOption,
            },
          ]}
        />
        <ReadyForNextStageButton {...readyForNextStageProps} />
      </VStack>
    </VStack>
  );
}

function OptionContent({
  viewProps: {
    users,
    currentUser,
    hasUserSelectedOption,
    handleSelectionChange,
    isUserReadyForNextStage,
  },
  optionId,
  text,
  notReadable,
}: {
  viewProps: ScenarioSelectorViewProps;
  optionId: number;
  text: string;
  notReadable?: boolean;
}) {
  const usersThatVotedForThis = useMemo(
    () => users.filter((user) => hasUserSelectedOption(user.id, optionId)),
    [optionId, hasUserSelectedOption, users],
  );

  return (
    <VStack height='100%' width='100%'>
      <HStack minHeight={10} width='100%'>
        <HStack flex={1} wrap='wrap'>
          {usersThatVotedForThis.length > 0 && <Text>Votes:</Text>}
          {usersThatVotedForThis.map((user) => (
            <Badge
              maxHeight={10}
              fontSize='lg'
              key={user.id}
              colorScheme={user.isCurrentUser ? "green" : "gray"}
            >
              {user.isCurrentUser ? "Me" : user.name}{" "}
              {isUserReadyForNextStage(user.id) ? "✅" : "🤔"}
            </Badge>
          ))}
        </HStack>
        {!notReadable && (
          <Box>
            <ReadOutLoudButton text={text} />
          </Box>
        )}
        {hasUserSelectedOption(currentUser.id, optionId) ? (
          <Button colorScheme='gray' key={`${optionId}-selected`} isDisabled>
            Selected
          </Button>
        ) : (
          <Button
            colorScheme='green'
            key={`${optionId}-unselected`}
            onClick={() => handleSelectionChange(optionId)}
          >
            Select
          </Button>
        )}
      </HStack>
      <Divider my={3} width='100%' />
      <Box flex={1}>
        <ScenarioText scenarioText={text} />
      </Box>
    </VStack>
  );
}
