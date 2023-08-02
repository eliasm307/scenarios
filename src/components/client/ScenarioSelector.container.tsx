/* eslint-disable no-console */
import { useState, useCallback } from "react";
import type { SessionUser, SessionRow } from "../../types";
import { useCustomToast } from "../../utils/client/hooks";
import { invokeMoveSessionToOutcomeSelectionStageAction } from "../../utils/server/actions";
import type { BroadcastFunction } from "./GameSession";
import ScenarioSelector from "./ScenarioSelector";
import APIClient from "../../utils/client/APIClient";

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
    async (optionId: number | null) => {
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

      const winningScenarioText =
        typeof majorityVoteId === "number" && scenarioOptions[majorityVoteId];
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

export type ScenarioSelectorViewProps = ReturnType<typeof useLogic>;

export default function ScenarioSelectorContainer(props: Props) {
  return <ScenarioSelector {...useLogic(props)} />;
}

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
