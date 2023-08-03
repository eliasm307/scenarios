import { useCallback } from "react";
import OutcomesReveal from "./OutcomesReveal";
import type { SessionRow, SessionUser } from "../../types";
import type { BroadcastFunction } from "./GameSession";
import { invokeResetSessionAction } from "../../utils/server/actions";
import { useCustomToast } from "../../utils/client/hooks";
import APIClient from "../../utils/client/APIClient";

type Props = {
  currentUser: SessionUser;
  users: SessionUser[];
  outcomeVotes: Required<SessionRow["scenario_outcome_votes"]>;
  sessionId: number;
  scenarioText: string;
  broadcast: BroadcastFunction;
};

function useLogic({ users, outcomeVotes, scenarioText, currentUser, sessionId, broadcast }: Props) {
  const toast = useCustomToast();
  const handlePlayAgain = useCallback(async () => {
    const readyToRestartKey = createReadyToRestartKey(currentUser.id);
    const latestOutcomeVotes = {
      ...outcomeVotes,
      [currentUser.id]: {
        ...outcomeVotes[currentUser.id],
        [readyToRestartKey]: true,
      },
    };

    if (everyUserIsReadyToRestart({ latestOutcomeVotes, users })) {
      broadcast({
        event: "Toast",
        data: {
          status: "info",
          title: `Everyone is ready, restarting the session...`,
        },
      });
      const errorToastConfig = await invokeResetSessionAction(sessionId);
      errorToastConfig?.forEach(toast);
      return;
    }

    // not everyone is ready to restart
    broadcast({
      event: "Toast",
      data: {
        status: "info",
        title: `"${currentUser.name}" is ready to re-start the session`,
      },
    });

    const errorToastConfig = await APIClient.sessions.voteForUserOutcome({
      session_id: sessionId,
      vote_by_user_id: currentUser.id,
      vote_for_user_id: readyToRestartKey,
      outcome: true,
    });
    if (errorToastConfig) {
      console.error("outcomeVoteFromCurrentUser errorToastConfig", errorToastConfig);
      toast(errorToastConfig);
    }
  }, [broadcast, currentUser.id, currentUser.name, outcomeVotes, sessionId, toast, users]);

  return {
    handlePlayAgain,
    users,
    outcomeVotes,
    scenarioText,
  };
}

export type OutcomesRevealViewProps = ReturnType<typeof useLogic>;

function createReadyToRestartKey(userId: string) {
  return `${userId}-ready-to-restart`;
}

function everyUserIsReadyToRestart({
  latestOutcomeVotes,
  users,
}: {
  latestOutcomeVotes: Required<SessionRow["scenario_outcome_votes"]>;
  users: SessionUser[];
}) {
  return users.every((user) => {
    const key = createReadyToRestartKey(user.id);
    const userVoteMap = latestOutcomeVotes[user.id];
    const isReadyToRestart = !!userVoteMap?.[key];
    return isReadyToRestart;
  });
}

export default function OutcomesRevealContainer(props: Props) {
  const viewProps = useLogic(props);
  return <OutcomesReveal {...viewProps} />;
}
