/* eslint-disable react/no-unused-prop-types */
/* eslint-disable no-console */

"use client";

import { Badge, Center, HStack, Heading, Spinner, Text, VStack, useToast } from "@chakra-ui/react";
import { useCallback, useState } from "react";
import APIClient from "../utils/client/APIClient";
import type { ChoiceConfig } from "./ChoiceGrid.client";
import ChoiceGrid from "./ChoiceGrid.client";
import type { SessionData, SessionUser } from "../types";
import { getSupabaseClient } from "../utils/client/supabase";

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
}: Props) {
  const toast = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleVote = useCallback(
    async (optionId: number) => {
      setIsLoading(true);

      debugger;

      // todo check if this is the deciding vote and if so perform relevant session updates e.g. regenerating scenario options or moving the session to the next stage
      const supabase = getSupabaseClient();
      const newOptionVotes = { ...optionVotes, [currentUser.id]: optionId };
      const voteIds = Object.values(newOptionVotes);
      const votingComplete = voteIds.length === users.length;
      if (!votingComplete) {
        console.log("voting not complete, updating option votes...", { newOptionVotes, users });
        return supabase
          .rpc("vote_for_option", {
            user_id: currentUser.id,
            option_id: optionId,
            session_id: sessionId,
          })
          .then((result) => {
            if (result.error) {
              console.error("Voting error", result.error);
              toast({
                title: "Voting Error",
                description: result.error.message,
                status: "error",
                duration: 9000,
                isClosable: true,
              });
            }
            setIsLoading(false);
          });
      }

      const majorityVoteId = getMajorityVoteId(voteIds);
      const majorityNotReached = majorityVoteId === null;
      const majorityVoteIdIsReset = majorityVoteId === -1;
      if (majorityNotReached || majorityVoteIdIsReset) {
        console.log("no winning vote resetting options...");
        toast({
          title: "Re-generating Options",
          description: "No majority vote, creating new options...",
          status: "info",
          duration: 9000,
          isClosable: true,
        });

        // reset votes and options
        return APIClient.getScenarios()
          .then(({ scenarios }) => {
            console.log("got new scenarios", scenarios);
            return supabase
              .from("sessions")
              .update({
                scenario_options: scenarios,
                scenario_option_votes: {},
              })
              .eq("id", sessionId);
          })
          .catch((error) => {
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : error,
              status: "error",
              duration: 9000,
              isClosable: true,
            });
          })
          .finally(() => setIsLoading(false));
      }

      const winningScenarioText = scenarioOptions[majorityVoteId];
      if (!winningScenarioText) {
        throw Error(`no winning scenario at index ${majorityVoteId}`);
      }

      toast({
        title: "Voting Complete",
        description: `The majority has voted`,
        status: "success",
        duration: 9000,
        isClosable: true,
      });

      const userIdsThatVotedForWinningScenario = Object.entries(newOptionVotes)
        .filter(([, voteOptionId]) => voteOptionId === majorityVoteId)
        .map(([userId]) => userId);

      const { data: newScenario } = await getSupabaseClient()
        .from("scenarios")
        .insert({
          text: winningScenarioText,
          voted_by_user_ids: userIdsThatVotedForWinningScenario,
        })
        .select("id")
        .single();

      if (!newScenario) {
        throw Error("no new scenario");
      }

      await getSupabaseClient()
        .from("sessions")
        .update({
          selected_scenario_id: newScenario.id,
          stage: "scenario-outcome-selection",
          scenario_option_votes: {},
          scenario_outcome_votes: {},
          messaging_locked_by_user_id: null,
        } satisfies Partial<SessionData>)
        .eq("id", sessionId);

      setIsLoading(false);
    },
    [currentUser.id, optionVotes, scenarioOptions, sessionId, toast, users],
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
  optionVotes: SessionData["scenario_option_votes"];
};

export default function ScenarioSelector(props: Props): React.ReactElement {
  const { isLoading, users, currentUser, optionVotes, scenarioOptions, handleVote } =
    useLogic(props);

  if (users.length < 2) {
    return (
      <Center as='section' height='100%'>
        <Text>Waiting for more players to join...</Text>
      </Center>
    );
  }

  if (isLoading || !users.length) {
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
            <Badge key={user.id} colorScheme={user.id === currentUser.id ? "green" : "gray"}>
              {user.name}
            </Badge>
          ))}
      </HStack>
      <ChoiceGrid
        choices={[
          ...scenarioOptions.map(
            (text, optionId): ChoiceConfig => ({
              id: optionId,
              text,
              onSelect: () => handleVote(optionId),
              isSelected: optionVotes[currentUser.id] === optionId,
              content: (
                <OptionContent
                  currentUserId={currentUser.id}
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
            id: -1,
            content: (
              <OptionContent
                currentUserId={currentUser.id}
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
  currentUserId,
  optionId,
  optionVotes,
  text,
}: {
  users: SessionUser[];
  optionId: number;
  currentUserId: string;
  optionVotes: SessionData["scenario_option_votes"];
  text: string;
}) {
  return (
    <VStack>
      <HStack>
        {users
          .filter((user) => {
            const hasVoted = optionVotes[user.id] === optionId;
            return hasVoted;
          })
          .map((user) => (
            <Badge key={user.id} colorScheme={user.id === currentUserId ? "green" : "gray"}>
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
