/* eslint-disable no-console */
import { useState, useCallback, useMemo } from "react";
import type { SessionUser, SessionRow } from "../../types";
import { useCustomToast } from "../../utils/client/hooks";
import { invokeMoveSessionToOutcomeSelectionStageAction } from "../../utils/server/actions";
import type { BroadcastFunction } from "./GameSession";
import ScenarioSelector from "./ScenarioSelector";
import APIClient from "../../utils/client/APIClient";
import type { ReadyForNextStageButtonProps } from "./ReadyForNextStageButton";

function createUserReadyForNextStageKey(userId: string) {
  return `${userId}-ready-for-next-stage`;
}

function userHasFinishedVoting({
  userId,
  optionVotes,
}: {
  userId: string;
  optionVotes: SessionRow["scenario_option_votes"];
}) {
  const userHasVoted = typeof optionVotes[userId] === "number";
  if (!userHasVoted) {
    return false;
  }

  const userIsReadyForNextStage = !!optionVotes[createUserReadyForNextStageKey(userId)];
  return userIsReadyForNextStage;
}

function allUsersHaveFinishedVoting({
  users,
  latestOptionVotes,
}: {
  users: SessionUser[];
  latestOptionVotes: SessionRow["scenario_option_votes"];
}): boolean {
  const sessionUserIds = new Set(users.map(({ id }) => id));
  for (const userId of Object.keys(latestOptionVotes)) {
    if (!sessionUserIds.has(userId)) {
      continue; // user has left the session or its a non-user key
    }
    if (userHasFinishedVoting({ userId, optionVotes: latestOptionVotes })) {
      sessionUserIds.delete(userId);
    } else {
      return false; // atleast one user has not finished voting
    }
  }

  return sessionUserIds.size === 0; // all users have finished voting
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

  const handleVoteComplete = useCallback(
    async ({ latestOptionVotes }: { latestOptionVotes: SessionRow["scenario_option_votes"] }) => {
      console.log("handleVoteComplete", { latestOptionVotes });
      setIsLoading(true);
      const allUserScenarioVoteValues = users.map(({ id }) => latestOptionVotes[id]);
      const majorityVoteId = getMajorityVoteId(allUserScenarioVoteValues);
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
            dontShowToUserId: null,
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
          dontShowToUserId: null,
        },
      });

      const sessionUserIds = new Set(users.map(({ id }) => id));
      const userIdsThatVotedForWinningScenario = Object.entries(latestOptionVotes)
        .filter(([key, voteOptionId]) => {
          return sessionUserIds.has(key) && voteOptionId === majorityVoteId;
        })
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
    [broadcast, scenarioOptions, sessionId, toast, users],
  );

  const handleSelectionChange = useCallback(
    async (optionId: number) => {
      console.log("handleSelectionChange", { optionId });
      const optionHasChanged = optionId !== optionVotes[currentUser.id];
      if (!optionHasChanged) {
        throw new Error("Option has not changed");
      }

      const errorToastConfig = await APIClient.sessions.voteForScenarioOption({
        user_id: currentUser.id,
        option_id: optionId,
        session_id: sessionId,
      });

      if (errorToastConfig) {
        toast(errorToastConfig);
      }
    },
    [currentUser.id, optionVotes, sessionId, toast],
  );

  const handleReadyForNextStageClick = useCallback(async () => {
    const readyForNextStageKey = createUserReadyForNextStageKey(currentUser.id);
    const latestOptionVotes = { ...optionVotes, [readyForNextStageKey]: 1 };
    const votingComplete = allUsersHaveFinishedVoting({ users, latestOptionVotes });
    console.log("handleReadyForNextStageClick", {
      votingComplete,
      latestOptionVotes,
      readyForNextStageKey,
    });
    if (votingComplete) {
      console.log("all users have finished voting");
      // NOTE: handling this here so only one user does it, if its an effect then all the users will do it
      void handleVoteComplete({ latestOptionVotes });
      return;
    }

    const errorToastConfig = await APIClient.sessions.voteForScenarioOption({
      user_id: readyForNextStageKey,
      option_id: 1,
      session_id: sessionId,
    });

    if (errorToastConfig) {
      toast(errorToastConfig);
    }
  }, [currentUser.id, handleVoteComplete, optionVotes, sessionId, toast, users]);

  const usersWaitingToVote = useMemo(() => {
    return users.filter((user) => {
      const hasNotVoted = typeof optionVotes[user.id] === "undefined";
      return hasNotVoted;
    });
  }, [users, optionVotes]);

  const currentUserHasFinishedVoting = useMemo(() => {
    return userHasFinishedVoting({ userId: currentUser.id, optionVotes });
  }, [currentUser.id, optionVotes]);

  const userPubliclyHasSelectedOption = useCallback(
    (userId: string, optionId: number) => {
      const userHasVotedForOption = optionVotes[userId] === optionId;
      if (!userHasVotedForOption) {
        return false;
      }

      if (userId === currentUser.id) {
        return true; // current user can see their own vote
      }

      // for other users, only show their vote if they have finished voting to avoid confusion
      const userIsReadyForNextStage = !!optionVotes[createUserReadyForNextStageKey(userId)];
      return userIsReadyForNextStage;
    },
    [currentUser.id, optionVotes],
  );

  return {
    usersWaitingToVote,
    handleSelectionChange,
    isLoading,
    users,
    currentUser,
    userPubliclyHasSelectedOption,
    scenarioOptions,
    readyForNextStageProps: {
      canMoveToNextStage: typeof optionVotes[currentUser.id] === "number",
      handleReadyForNextStageClick,
      isReadyForNextStage: currentUserHasFinishedVoting,
    } satisfies ReadyForNextStageButtonProps,
  };
}

export type ScenarioSelectorViewProps = ReturnType<typeof useLogic>;

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
