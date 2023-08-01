/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-console */

"use client";

import {
  Badge,
  Box,
  Center,
  Divider,
  HStack,
  Heading,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useCallback, useState } from "react";
import APIClient from "../../utils/client/APIClient";
import type { ChoiceConfig } from "../ChoiceGrid.client";
import ChoiceGrid from "../ChoiceGrid.client";
import type { SessionRow, SessionUser } from "../../types";
import type { BroadcastFunction } from "./GameSession";
import { invokeMoveSessionToOutcomeSelectionStageAction } from "../../utils/server/actions";
import ScenarioText from "../ScenarioText";
import ReadOutLoudButton from "../ReadOutLoudButton";
import { useCustomToast } from "../../utils/client/hooks";

function getMajorityVoteId<T>(arr: T[]): T | null {
  const itemToOccurrenceCountMap = arr.reduce((acc, item) => {
    const count = acc.get(item) ?? 0;
    acc.set(item, count + 1);
    return acc;
  }, new Map<T, number>());

  const maxItemEntry = [...itemToOccurrenceCountMap.entries()].reduce((entryA, entryB) => {
    return (entryB[1] > entryA[1] ? entryB : entryA) as [T, number];
  })[0];

  const maxCounts = [...itemToOccurrenceCountMap.values()].filter(
    (count) => count === itemToOccurrenceCountMap.get(maxItemEntry),
  );

  if (maxCounts.length > 1) {
    // There are multiple items with the same max count, so there is no most frequent item
    return null;
  }

  return maxItemEntry as T;
}

function useLogic({
  selectedOptionId: sessionId,
  users,
  currentUser,
  scenarioOptions,
  optionVotes,
  broadcast,
}: Props) {
  const toast = useCustomToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = useCallback(
    async (optionId: number) => {
      const newOptionVotes = { ...optionVotes, [currentUser.id]: optionId };
      const voteIds = Object.values(newOptionVotes);
      const votingComplete = voteIds.length === users.length;
      if (!votingComplete) {
        // updating option votes is pretty quick so dont show loading state unless it takes a noticeable amount of time
        const timeoutId = setTimeout(() => setIsLoading(true), 1000);
        console.log("voting not complete, updating option votes...", { newOptionVotes, users });
        const errorToastConfig = await APIClient.sessions.voteForScenarioOption({
          user_id: currentUser.id,
          option_id: optionId,
          session_id: sessionId,
        });

        if (errorToastConfig) {
          toast(errorToastConfig);
        }

        clearTimeout(timeoutId);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const majorityVoteId = getMajorityVoteId(voteIds);
      const majorityNotReached = majorityVoteId === null;
      const majorityVoteIdIsReset = majorityVoteId === -1;
      if (majorityNotReached || majorityVoteIdIsReset) {
        console.log("no winning vote resetting options...");

        broadcast({
          event: "Toast",
          data: {
            title: "Re-generating Options",
            description: "No majority vote, creating new options...",
            status: "info",
          },
        });

        // reset votes and options
        const errorToastConfig = await APIClient.sessions.generateNewScenarioOptions(sessionId);
        if (errorToastConfig) {
          toast(errorToastConfig);
        }
        setIsLoading(false);
        return;
      }

      const winningScenarioText = scenarioOptions[majorityVoteId];
      if (!winningScenarioText) {
        throw Error(`No winning scenario at index ${majorityVoteId}`);
      }

      broadcast({
        event: "Toast",
        data: {
          title: "Scenario Voting Complete",
          description: `The majority has voted for a scenario to play!`,
          status: "success",
        },
      });

      const userIdsThatVotedForWinningScenario = Object.entries(newOptionVotes)
        .filter(([, voteOptionId]) => voteOptionId === majorityVoteId)
        .map(([userId]) => userId);

      const errorToastConfig = await invokeMoveSessionToOutcomeSelectionStageAction({
        scenarioText: winningScenarioText,
        userIdsThatVotedForScenario: userIdsThatVotedForWinningScenario,
        sessionId,
      });
      if (errorToastConfig) {
        toast(errorToastConfig);
      }

      setIsLoading(false);
    },
    [broadcast, currentUser.id, optionVotes, scenarioOptions, sessionId, toast, users],
  );

  return {
    handleVote,
    isLoading,
    users,
    currentUser,
    optionVotes,
    scenarioOptions,
  };
}

type Props = {
  users: SessionUser[];
  currentUser: SessionUser;
  /**
   * The index of the scenario option voted for by the current user.
   * If the current user has not voted, this will be `null`.
   * If the current user has voted to reset the options, this will be `-1`.
   */
  voteId: number | null;
  selectedOptionId: number;
  scenarioOptions: string[];
  optionVotes: SessionRow["scenario_option_votes"];
  broadcast: BroadcastFunction;
};

export default function ScenarioSelector(props: Props): React.ReactElement {
  const { isLoading, users, currentUser, optionVotes, scenarioOptions, handleVote } =
    useLogic(props);

  console.log({ scenarioOptions: [...scenarioOptions] });

  if (isLoading) {
    console.log("scenario selector loading...");
    return (
      <Center as='section' height='100%' display='flex' flexDirection='column' gap={3}>
        <Spinner fontSize='2xl' />
        <Heading>Loading...</Heading>
      </Center>
    );
  }

  return (
    <VStack as='section' m={3} height='100%'>
      <Heading textAlign='center'>Vote for a Scenario to Play!</Heading>
      <HStack>
        <span>Users waiting to vote: </span>
        {users
          .filter((user) => {
            const hasNotVoted = typeof optionVotes[user.id] === "undefined";
            return hasNotVoted;
          })
          .map((user) => (
            <Badge key={user.id} colorScheme={user.isCurrentUser ? "green" : "gray"}>
              {user.isCurrentUser ? "Me" : user.name}
            </Badge>
          ))}
      </HStack>
      <Box key={scenarioOptions.join("+")} overflow='auto' pb={6} flex={1}>
        <ChoiceGrid
          choices={[
            ...scenarioOptions.map(
              (text, optionId): ChoiceConfig => ({
                text,
                onSelect: () => handleVote(optionId),
                isSelected: optionVotes[currentUser.id] === optionId,
                content: (
                  <Box key={`${text.trim() || optionId}-container`}>
                    {text.trim() ? (
                      <OptionContent
                        key={text}
                        optionId={optionId}
                        optionVotes={optionVotes}
                        text={text}
                        users={users}
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
              }),
            ),
            {
              content: (
                <OptionContent
                  optionId={-1}
                  optionVotes={optionVotes}
                  notReadable
                  text='🆕 Vote to generate new scenarios'
                  users={users}
                  key='new'
                />
              ),
              onSelect: () => handleVote(-1),
              isSelected: optionVotes[currentUser.id] === null,
            },
          ]}
        />
      </Box>
    </VStack>
  );
}

function OptionContent({
  users,
  optionId,
  optionVotes,
  text,
  notReadable,
}: {
  users: SessionUser[];
  optionId: number;
  optionVotes: SessionRow["scenario_option_votes"];
  text: string;
  notReadable?: boolean;
}) {
  return (
    <VStack height='100%' width='100%'>
      <HStack minHeight={10} width='100%'>
        <HStack flex={1}>
          <Text>Votes:</Text>
          {users
            .filter((user) => {
              const hasVoted = optionVotes[user.id] === optionId;
              return hasVoted;
            })
            .map((user) => (
              <Badge
                maxHeight={10}
                fontSize='lg'
                key={user.id}
                colorScheme={user.isCurrentUser ? "green" : "gray"}
              >
                {user.isCurrentUser ? "Me" : user.name}
              </Badge>
            ))}
        </HStack>
        {!notReadable && (
          <Box>
            <ReadOutLoudButton text={text} />
          </Box>
        )}
      </HStack>
      <Divider my={3} width='100%' />
      <Box flex={1}>
        <ScenarioText scenarioText={text} />
      </Box>
    </VStack>
  );
}
