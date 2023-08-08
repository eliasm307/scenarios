/* eslint-disable no-console */
/* eslint-disable react/jsx-wrap-multilines */
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
  IconButton,
  Spinner,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import { useMemo } from "react";
import type { ChoiceConfig } from "../../ChoiceGrid.client";
import ChoiceGrid from "../../ChoiceGrid.client";
import ScenarioText from "../../ScenarioText";
import ReadOutLoudButton from "../../ReadOutLoudButton";
import type { ScenarioSelectorViewProps } from "./ScenarioSelector.container";
import ReadyForNextStageButton from "../ReadyForNextStageButton";
import {
  CONFIRMED_EMOJI,
  GENERATE_NEW_SCENARIOS_OPTION_ID,
  THINKING_EMOJI,
} from "../../../utils/constants";
import {
  AppLogoIcon,
  ThumbsDownFilledIcon,
  ThumbsDownOutlineIcon,
  ThumbsUpFilledIcon,
  ThumbsUpOutlineIcon,
} from "../../Icons";

export default function ScenarioSelector(props: ScenarioSelectorViewProps): React.ReactElement {
  const {
    isLoading,
    currentUser,
    hasUserSelectedOption,
    scenarioOptions,
    usersWaitingToVote,
    readyForNextStageProps,
    optionsAiAuthorModelId,
  } = props;

  if (isLoading) {
    console.debug("ScenarioSelector loading render", { isLoading });
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
    <VStack className='scenario-selector' as='section' pt={3} height='100%' width='100%'>
      <VStack pb={1} px={5}>
        <Heading textAlign='center'>Vote for a Scenario to Play!</Heading>
        <HStack wrap='wrap'>
          <span>Users waiting to vote: </span>
          {usersWaitingToVote.map((user) => (
            <Badge key={user.id} colorScheme={user.isCurrentUser ? "green" : "gray"}>
              {user.isCurrentUser ? "Me" : user.name}
            </Badge>
          ))}
        </HStack>
        {optionsAiAuthorModelId && !optionsAiAuthorModelId?.startsWith("gpt-4") && (
          <Badge colorScheme='red'>Scenarios Generated by {optionsAiAuthorModelId}</Badge>
        )}
      </VStack>
      <Divider />
      <VStack width='100%' maxWidth='100rem' overflow='auto' px={5} pb={10} flex={1} gap={4}>
        <ChoiceGrid
          choices={[
            ...scenarioOptions.map((text, optionId): ChoiceConfig => {
              const isSelected = hasUserSelectedOption(currentUser.id, optionId);
              return {
                text,
                isSelected,
                content: (
                  <Box>
                    {text.trim() ? (
                      <OptionContent
                        key='content'
                        optionId={optionId}
                        viewProps={props}
                        text={text}
                      />
                    ) : (
                      <Center
                        key='loading'
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
                  isNotAScenario
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
    handleOptionRating,
    isUserReadyForNextStage,
    getOptionRating,
  },
  optionId,
  text,
  isNotAScenario,
}: {
  viewProps: ScenarioSelectorViewProps;
  optionId: number;
  text: string;
  isNotAScenario?: boolean;
}) {
  console.debug("OptionContent render", { optionId, text, isNotAScenario });
  const usersThatVotedForThis = useMemo(
    () => users.filter((user) => hasUserSelectedOption(user.id, optionId)),
    [optionId, hasUserSelectedOption, users],
  );

  const rating = getOptionRating(optionId);
  const isRatedPositive = rating === 1;
  const isRatedNegative = rating === -1;

  return (
    <VStack height='100%' width='100%'>
      <HStack minHeight={10} width='100%'>
        <HStack flex={1} wrap='wrap'>
          {usersThatVotedForThis.length > 0 && <Text>Votes:</Text>}
          {usersThatVotedForThis.map((user) => {
            const isReadyForNextStage = isUserReadyForNextStage(user.id);
            return (
              <Tooltip
                key={user.id}
                label={isReadyForNextStage ? "Confirmed" : "Still thinking..."}
              >
                <Badge
                  maxHeight={10}
                  fontSize='lg'
                  colorScheme={user.isCurrentUser ? "green" : "gray"}
                >
                  {user.isCurrentUser ? "Me" : user.name}{" "}
                  {isReadyForNextStage ? CONFIRMED_EMOJI : THINKING_EMOJI}
                </Badge>
              </Tooltip>
            );
          })}
        </HStack>
        {!isNotAScenario && (
          <>
            <HStack>
              <Tooltip label='😀 Create more scenarios like this' aria-label='Like'>
                <IconButton
                  variant='ghost'
                  colorScheme={isRatedPositive ? "green" : "gray"}
                  icon={isRatedPositive ? <ThumbsUpFilledIcon /> : <ThumbsUpOutlineIcon />}
                  aria-label='Like'
                  // dont use disabled styling but dont handle further clicks
                  onClick={() =>
                    !isRatedPositive && handleOptionRating({ optionId, rating: "POSITIVE" })
                  }
                />
              </Tooltip>
              <Tooltip label='😒 Create less scenarios like this' aria-label='Dislike'>
                <IconButton
                  variant='ghost'
                  colorScheme={isRatedNegative ? "red" : "gray"}
                  icon={isRatedNegative ? <ThumbsDownFilledIcon /> : <ThumbsDownOutlineIcon />}
                  aria-label='Dislike'
                  // dont use disabled styling but dont handle further clicks
                  onClick={() =>
                    !isRatedNegative && handleOptionRating({ optionId, rating: "NEGATIVE" })
                  }
                />
              </Tooltip>
            </HStack>
            <ReadOutLoudButton text={text} />
          </>
        )}
        {hasUserSelectedOption(currentUser.id, optionId) ? (
          <Button key='selected' colorScheme='gray' isDisabled>
            Selected
          </Button>
        ) : (
          <Button
            key='unselected'
            colorScheme='green'
            onClick={() => handleSelectionChange(optionId)}
          >
            Select
          </Button>
        )}
      </HStack>
      <Divider my={3} width='100%' />
      <VStack flex={1} gap={3}>
        <ScenarioText scenarioText={text} />
        {isNotAScenario && (
          <Center flex={1}>
            <AppLogoIcon size='8rem' />
          </Center>
        )}
      </VStack>
    </VStack>
  );
}
