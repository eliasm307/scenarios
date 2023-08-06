/* eslint-disable no-console */
import { useState, useCallback, useMemo } from "react";
import type { SessionUser, SessionRow } from "../../../types";
import { useCustomToast } from "../../../utils/client/hooks";
import {
  invokeGenerateNewScenarioOptions,
  invokeMoveSessionToOutcomeSelectionStageAction,
} from "../../../utils/server/actions";
import type { BroadcastFunction } from "../GameSession";
import ScenarioSelector from "./ScenarioSelector";
import APIClient from "../../../utils/client/APIClient";
import type { ReadyForNextStageButtonProps } from "../ReadyForNextStageButton";
import {
  createUserReadyForNextStageKey,
  createScenarioOptionUserRatingKey,
} from "../../../utils/general";

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

  const isUserReadyForNextStage = !!optionVotes[createUserReadyForNextStageKey(userId)];
  return isUserReadyForNextStage;
}

function allUsersHaveFinishedVoting({
  users,
  latestOptionVotes,
}: {
  users: SessionUser[];
  latestOptionVotes: SessionRow["scenario_option_votes"];
}): boolean {
  return users.every((user) =>
    userHasFinishedVoting({ userId: user.id, optionVotes: latestOptionVotes }),
  );
}

function useLogic({
  selectedOptionId: sessionId,
  users,
  currentUser,
  scenarioOptions,
  optionVotes,
  broadcast,
  optionsAiAuthorModelId,
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
        const errorToastConfig = await invokeGenerateNewScenarioOptions(sessionId);
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

      // NOTE: this should be invoked by the last voting client instead of the db doing this via a webhook
      // because if it fails then the last client user will see an error and they can try again
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

  // todo make this a supabase edge function
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

  const handleOptionRating = useCallback(
    async ({ optionId, rating }: { optionId: number; rating: "POSITIVE" | "NEGATIVE" }) => {
      console.log("handleOptionRating", { optionId, rating });

      const errorToastConfig = await APIClient.sessions.setScenarioOptionRating({
        rating_key: createScenarioOptionUserRatingKey({ optionId, userId: currentUser.id }),
        rating: rating === "POSITIVE" ? 1 : -1,
        session_id: sessionId,
      });

      if (errorToastConfig) {
        toast(errorToastConfig);
      }
    },
    [currentUser.id, sessionId, toast],
  );

  const getOptionRating = useCallback(
    (optionId: number) => {
      const ratingKey = createScenarioOptionUserRatingKey({ optionId, userId: currentUser.id });
      const rating = optionVotes[ratingKey];
      if (typeof rating !== "number") {
        return null;
      }

      return rating;
    },
    [currentUser.id, optionVotes],
  );

  // todo move this off client
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
      // NOTE: handling this here so only one user does it,
      // if its set in the DB and this is an effect then all the users will do it
      await handleVoteComplete({ latestOptionVotes });
      return;
    }

    const errorToastConfig = await APIClient.sessions.voteForScenarioOption({
      user_id: readyForNextStageKey,
      option_id: 1,
      session_id: sessionId,
    });

    if (errorToastConfig) {
      toast(errorToastConfig);
      return;
    }

    broadcast({
      event: "Toast",
      data: {
        title: `"${currentUser.name}" is ready to move on`,
        dontShowToUserId: currentUser.id,
      },
    });
  }, [
    broadcast,
    currentUser.id,
    currentUser.name,
    handleVoteComplete,
    optionVotes,
    sessionId,
    toast,
    users,
  ]);

  const usersWaitingToVote = useMemo(() => {
    return users.filter((user) => {
      const hasChosenAnOption = typeof optionVotes[user.id] === "number";
      return !hasChosenAnOption;
    });
  }, [users, optionVotes]);

  const currentUserHasFinishedVoting = useMemo(() => {
    return userHasFinishedVoting({ userId: currentUser.id, optionVotes });
  }, [currentUser.id, optionVotes]);

  const hasUserSelectedOption = useCallback(
    (userId: string, optionId: number) => {
      return optionVotes[userId] === optionId;
    },
    [optionVotes],
  );

  const isUserReadyForNextStage = useCallback(
    (userId: string) => {
      return !!optionVotes[createUserReadyForNextStageKey(userId)];
    },
    [optionVotes],
  );

  return {
    usersWaitingToVote,
    // todo only expose one "send" or "dispatch" or "action" or "handleEvent" function to UI?
    handleSelectionChange,
    handleOptionRating,
    isLoading,
    users,
    currentUser,
    hasUserSelectedOption,
    scenarioOptions,
    getOptionRating,
    optionsAiAuthorModelId,
    readyForNextStageProps: {
      canMoveToNextStage: typeof optionVotes[currentUser.id] === "number",
      handleReadyForNextStageClick,
      isReadyForNextStage: currentUserHasFinishedVoting,
      canMoveToNextStageConditionText: "You have to select an option first",
    } satisfies ReadyForNextStageButtonProps,
    isUserReadyForNextStage,
  };
}

export type ScenarioSelectorViewProps = ReturnType<typeof useLogic>;

type Props = {
  users: SessionUser[];
  currentUser: SessionUser;
  selectedOptionId: number;
  scenarioOptions: string[];
  optionVotes: SessionRow["scenario_option_votes"];
  broadcast: BroadcastFunction;
  optionsAiAuthorModelId: string | null;
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
