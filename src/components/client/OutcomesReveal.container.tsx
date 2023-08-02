import { useCallback } from "react";
import OutcomesReveal from "./OutcomesReveal";
import type { SessionRow, SessionUser } from "../../types";
import type { BroadcastFunction } from "./GameSession";
import { invokeResetSessionAction } from "../../utils/server/actions";
import { useCustomToast } from "../../utils/client/hooks";

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
    broadcast({
      event: "Toast",
      data: {
        status: "info",
        title: `"${currentUser.name}" re-started the session`,
      },
    });
    const errorToastConfig = await invokeResetSessionAction(sessionId);
    errorToastConfig?.forEach(toast);
  }, [broadcast, currentUser.name, sessionId, toast]);

  return {
    handlePlayAgain,
    users,
    outcomeVotes,
    scenarioText,
  };
}

export type OutcomesRevealViewProps = ReturnType<typeof useLogic>;

export default function OutcomesRevealContainer(props: Props) {
  const viewProps = useLogic(props);
  return <OutcomesReveal {...viewProps} />;
}
