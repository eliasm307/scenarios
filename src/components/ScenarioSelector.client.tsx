/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-console */

"use client";

import { Badge, Center, HStack, Heading, Spinner, Text, VStack, useToast } from "@chakra-ui/react";
import { useCallback, useEffect, useState } from "react";
import APIClient from "../utils/client/APIClient";
import type { ChoiceConfig } from "./ChoiceGrid.client";
import ChoiceGrid from "./ChoiceGrid.client";
import type { SessionRow, SessionUser } from "../types";
import type { BroadcastFunction } from "./GameSession.client";

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
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const regenerateOptions = useCallback(async () => {
    const errorToastConfig = await APIClient.sessions.generateNewScenarioOptions(sessionId);
    if (errorToastConfig) {
      toast(errorToastConfig);
    }
  }, [sessionId, toast]);

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
        return regenerateOptions().finally(() => setIsLoading(false));
      }

      const winningScenarioText = scenarioOptions[majorityVoteId];
      if (!winningScenarioText) {
        throw Error(`No winning scenario at index ${majorityVoteId}`);
      }

      broadcast({
        event: "Toast",
        data: {
          title: "Voting Complete",
          description: `The majority has voted`,
          status: "success",
          duration: 9000,
          isClosable: true,
        },
      });

      const userIdsThatVotedForWinningScenario = Object.entries(newOptionVotes)
        .filter(([, voteOptionId]) => voteOptionId === majorityVoteId)
        .map(([userId]) => userId);

      const errorToastConfig = await APIClient.sessions.moveToOutcomeSelectionStage({
        scenarioText: winningScenarioText,
        userIdsThatVotedForScenario: userIdsThatVotedForWinningScenario,
        sessionId,
      });
      if (errorToastConfig) {
        toast(errorToastConfig);
      }

      setIsLoading(false);
    },
    [
      broadcast,
      currentUser.id,
      optionVotes,
      regenerateOptions,
      scenarioOptions,
      sessionId,
      toast,
      users,
    ],
  );

  useEffect(() => {
    if (scenarioOptions.length === 0) {
      console.log("no scenario options, regenerating...");
      setIsLoading(true);
      void regenerateOptions().finally(() => setIsLoading(false));
    }
  }, [regenerateOptions, scenarioOptions.length]);

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

  if (isLoading || !users.length || !scenarioOptions.length) {
    return (
      <Center as='section' height='100%'>
        <Spinner />
      </Center>
    );
  }

  return (
    <VStack as='section' m={3}>
      <Heading textAlign='center'>Vote for a Scenario to Play!</Heading>
      <HStack>
        <span>Waiting to vote: </span>
        {users
          .filter((user) => {
            const hasNotVoted = typeof optionVotes[user.id] === "undefined";
            return hasNotVoted;
          })
          .map((user) => (
            <Badge key={user.id} colorScheme={user.isCurrentUser ? "green" : "gray"}>
              {user.name}
            </Badge>
          ))}
      </HStack>
      <ChoiceGrid
        choices={[
          ...scenarioOptions.map(
            (text, optionId): ChoiceConfig => ({
              text,
              onSelect: () => handleVote(optionId),
              isSelected: optionVotes[currentUser.id] === optionId,
              content: (
                <OptionContent
                  optionId={optionId}
                  optionVotes={optionVotes}
                  text={text}
                  users={users}
                  key={text}
                />
              ),
            }),
          ),
          {
            content: (
              <OptionContent
                optionId={-1}
                optionVotes={optionVotes}
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
    </VStack>
  );
}

function OptionContent({
  users,
  optionId,
  optionVotes,
  text,
}: {
  users: SessionUser[];
  optionId: number;
  optionVotes: SessionRow["scenario_option_votes"];
  text: string;
}) {
  return (
    <VStack>
      <HStack minHeight={5}>
        {users
          .filter((user) => {
            const hasVoted = optionVotes[user.id] === optionId;
            return hasVoted;
          })
          .map((user) => (
            <Badge maxHeight={5} key={user.id} colorScheme={user.isCurrentUser ? "green" : "gray"}>
              {user.name}
            </Badge>
          ))}
      </HStack>
      <Text align='center' marginTop='auto' display='block'>
        {text}
      </Text>
    </VStack>
  );
}
