/* eslint-disable functional-core/purity */
/* eslint-disable no-console */
/* eslint-disable react/no-unused-prop-types */

import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import type { FormEvent } from "react";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import type { TextareaProps } from "@chakra-ui/react";
import type { SessionUser, SessionRow, MessageRow } from "../../../types";
import { useCustomToast } from "../../../utils/client/hooks";
import { getSupabaseClient } from "../../../utils/client/supabase";
import { isTruthy } from "../../../utils/general";
import type { BroadcastFunction } from "../GameSession";
import ScenarioChat from "./ScenarioChat";
import APIClient from "../../../utils/client/APIClient";
import type { ReadyForNextStageButtonProps } from "../ReadyForNextStageButton";

type Props = {
  selectedScenarioText: string | null;
  currentUser: SessionUser;
  users: SessionUser[];
  sessionId: number;
  outcomeVotes: NonNullable<SessionRow["scenario_outcome_votes"]>;
  broadcast: BroadcastFunction;
  selectedScenarioImagePath: string | null;
  aiIsResponding: boolean;
  existing: {
    messageRows: MessageRow[];
  };
};

/**
 * @remark This gets persisted so should not be changed
 */
const READY_FOR_NEXT_STAGE_KEY = "ready-for-next-stage";

function useChatLogic({
  existing,
  selectedScenarioText,
  currentUser,
  sessionId,
  selectedScenarioImagePath,
  broadcast,
  aiIsResponding,
  users,
  outcomeVotes,
}: Props) {
  const toast = useCustomToast();
  const [inputValue, setInputValue] = useState("");
  const [error] = useState<Error | null>(null); // todo is this required?
  const messageRows = useRealtimeMessageRows({
    sessionId,
    initialMessageRows: existing.messageRows,
  });
  const isLoading = messageRows.at(-1)?.author_role === "user" || aiIsResponding; // ie an AI response is loading

  const handleUserMessageSubmit = useCallback(
    async (e?: FormEvent) => {
      e?.preventDefault(); // need to prevent this here as the event gets handled synchronously before our promises below resolve

      const content = inputValue.trim();
      if (!content) {
        return;
      }
      setInputValue("");

      const potentialErrorToastConfigs = await Promise.all([
        // this will trigger message insert edge function to respond from db
        // todo convert to server function
        APIClient.messages.add({
          session_id: sessionId,
          content,
          author_role: "user",
          author_id: currentUser.id,
        } satisfies Omit<MessageRow, "id" | "inserted_at" | "updated_at" | "author_ai_model_id">),
      ]);

      const errorToastConfigs = potentialErrorToastConfigs.filter(isTruthy);
      if (errorToastConfigs.some(isTruthy)) {
        errorToastConfigs.forEach(toast);
      }
    },
    [currentUser.id, inputValue, sessionId, toast],
  );

  const typingTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const coolingDownTimeoutIdRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const handleNewTypingEvent = useCallback(() => {
    const typingTimeoutId = typingTimeoutIdRef.current;
    clearTimeout(typingTimeoutId);
    typingTimeoutIdRef.current = setTimeout(() => {
      broadcast({
        event: "TypingStateChanged",
        data: {
          isTyping: false,
          userId: currentUser.id,
        },
      });
    }, 3000);

    if (typeof coolingDownTimeoutIdRef.current === "number") {
      return;
    }

    // for rate limiting
    coolingDownTimeoutIdRef.current = setTimeout(() => {
      coolingDownTimeoutIdRef.current = undefined;
    }, 250);

    broadcast({
      event: "TypingStateChanged",
      data: {
        isTyping: true,
        userId: currentUser.id,
      },
    });
  }, [broadcast, currentUser.id]);

  // not implementing coolingDown because it would be impressive if
  // someone manages to blur and focus so fast to affect rate limiting
  const handleTypingEnd = useCallback(() => {
    clearTimeout(typingTimeoutIdRef.current);
    broadcast({
      event: "TypingStateChanged",
      data: {
        isTyping: false,
        userId: currentUser.id,
      },
    });
  }, [broadcast, currentUser.id]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutIdRef.current);
      if (typingTimeoutIdRef.current) {
        handleTypingEnd();
      }
    };
  }, [broadcast, currentUser.id, handleTypingEnd]);

  const chatAllowsSubmitting = inputValue && !isLoading;
  const isSubmitActionEvent = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key !== "Enter") {
        return;
      }

      // allow for multiline input, ie shift enter which is not for confirming
      const isConfirmEnter = !e.shiftKey;
      if (isConfirmEnter) {
        // prevent new line on submit
        e.preventDefault();

        return chatAllowsSubmitting;
      }
    },
    [chatAllowsSubmitting],
  );

  const handleInputKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      const targetEl = e.target;
      if (!(targetEl instanceof HTMLTextAreaElement)) {
        console.error("handleInputKeyDown: targetEl is not a textarea");
        return;
      }
      if (isSubmitActionEvent(e)) {
        handleTypingEnd();
        await handleUserMessageSubmit();
      } else {
        handleNewTypingEvent();
      }
    },
    [isSubmitActionEvent, handleTypingEnd, handleUserMessageSubmit, handleNewTypingEvent],
  );

  // todo remove this if there is no issue using messages directly from DB
  // const sortedMessageRows = useMemo(() => {
  //   return [...messageRows].sort((rowA, rowB) => {
  //     const dateA = new Date(rowA.updated_at);
  //     const dateB = new Date(rowB.updated_at);
  //     return dateA.getTime() - dateB.getTime();
  //   });
  // }, [messageRows]);

  const selectedScenarioImageUrl = useMemo(() => {
    if (!selectedScenarioImagePath) {
      return null;
    }
    // console.log("image loader called", { path, width, quality });
    // type ImageLoaderProps = Parameters<NonNullable<React.ComponentProps<typeof Image>["loader"]>>[0];
    return getSupabaseClient().storage.from("images").getPublicUrl(selectedScenarioImagePath, {
      // todo image resizing requires pro plan for now but if it becomes free convert this to an image loader for the Next image component
      // transform: {
      //   quality,
      //   width,
      //   resize: "contain",
      // },
    }).data.publicUrl;
  }, [selectedScenarioImagePath]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  const outcomeVotesByCurrentUser = outcomeVotes[currentUser.id];
  const handleVoteChange = useCallback(
    async ({ voteForUserId, newVote }: { voteForUserId: string; newVote: "true" | "false" }) => {
      const outcomeVoteFromCurrentUser = newVote === "true";
      let errorToastConfig = await APIClient.sessions.voteForUserOutcome({
        session_id: sessionId,
        vote_by_user_id: currentUser.id,
        vote_for_user_id: voteForUserId,
        outcome: outcomeVoteFromCurrentUser,
      });
      if (errorToastConfig) {
        console.error("outcomeVoteFromCurrentUser errorToastConfig", errorToastConfig);
        toast(errorToastConfig);
        return;
      }

      const latestOutcomeVotes = {
        ...outcomeVotes,
        [currentUser.id]: {
          ...outcomeVotesByCurrentUser,
          [voteForUserId]: outcomeVoteFromCurrentUser,
        },
      };

      // doing this here so only the last user to vote does it
      if (allUsersHaveFinishedVoting({ users, latestOutcomeVotes })) {
        console.log("voting complete");
        broadcast({
          event: "Toast",
          data: {
            title: "Voting Complete",
            description: "All votes are in!",
            status: "success",
            dontShowToUserId: null,
          },
        });

        // todo convert this to server action
        errorToastConfig = await APIClient.sessions.moveToOutcomeRevealStage(sessionId);
        if (errorToastConfig) {
          toast(errorToastConfig);
        }
      }
    },
    [users, sessionId, currentUser.id, outcomeVotes, outcomeVotesByCurrentUser, broadcast, toast],
  );

  const currentUserHasFinishedVoting = useMemo(() => {
    const currentUserVoteMap = outcomeVotes[currentUser.id];
    return userHasMadeAllVotesAndIsReadyForNextStage({ users, voteMap: currentUserVoteMap });
  }, [currentUser.id, outcomeVotes, users]);

  const currentUserHasVotedForAllUsers = useMemo(() => {
    const currentUserVoteMap = outcomeVotes[currentUser.id];
    return Boolean(
      currentUserVoteMap && userHasMadeAllVotes({ users, voteMap: currentUserVoteMap }),
    );
  }, [currentUser.id, outcomeVotes, users]);

  useEffect(() => {
    if (currentUserHasFinishedVoting) {
      broadcast({
        event: "Toast",
        data: {
          title: `"${currentUser.name}" has finished voting!`,
          status: "success",
          dontShowToUserId: currentUser.id,
        },
      });
    }
    // NOTE: dependency on current user name means this gets called again when the user name changes
    // not ideal but leaving it as is as it's not a big deal and changing names is not a common occurrence
  }, [broadcast, currentUser.id, currentUser.name, currentUserHasFinishedVoting]);

  const remoteUserVotingStatuses = useMemo(() => {
    return users
      .filter((user) => !user.isCurrentUser)
      .map((remoteUser) => {
        const remoteUserVoteMap = outcomeVotes[remoteUser.id];
        return {
          user: remoteUser,
          isFinishedVoting: userHasMadeAllVotesAndIsReadyForNextStage({
            users,
            voteMap: remoteUserVoteMap,
          }),
        };
      });
  }, [outcomeVotes, users]);

  if (!selectedScenarioText) {
    throw new Error("selectedScenarioText is required");
  }

  return {
    chat: {
      handleSubmit: handleUserMessageSubmit,
      isLoading,
      error,
      allowsSubmitting: chatAllowsSubmitting,
      hasError: !!error,
      inputProps: {
        placeholder: getPlaceholderText({ isLoading, hasError: !!error }),
        value: inputValue,
        onKeyDown: handleInputKeyDown,
        onBlur: handleTypingEnd,
        onChange: handleInputChange,
      } satisfies TextareaProps,
    },
    remoteUserVotingStatuses,
    outcomeVotes,
    outcomeVotesByCurrentUser,
    handleVoteChange,
    readyForNextStageProps: {
      canMoveToNextStage: currentUserHasVotedForAllUsers,
      handleReadyForNextStageClick: () => {
        return handleVoteChange({ voteForUserId: READY_FOR_NEXT_STAGE_KEY, newVote: "true" });
      },
      isReadyForNextStage: currentUserHasFinishedVoting,
      canMoveToNextStageConditionText: "You have to have votes for all users first",
    } satisfies ReadyForNextStageButtonProps,
    messageRows,
    selectedScenarioText,
    selectedScenarioImagePath,
    selectedScenarioImageUrl,
    users,
  };
}

export type ScenarioChatViewProps = ReturnType<typeof useChatLogic>;

export default function ScenarioChatContainer(props: Props) {
  const viewProps = useChatLogic(props);

  return <ScenarioChat {...viewProps} />;
}

function getPlaceholderText(chat: { isLoading: boolean; hasError: boolean }): string {
  if (chat.isLoading) {
    return "AI is typing...";
  }
  if (chat.hasError) {
    return "An error occurred 😢";
  }
  return "Ask me anything about the scenario 😀";
}

function useRealtimeMessageRows({
  sessionId,
  initialMessageRows,
}: {
  sessionId: number;
  initialMessageRows?: MessageRow[];
}) {
  const [messageRows, setMessageRows] = useState<MessageRow[]>(initialMessageRows ?? []);

  // need this in a ref so supabase has the latest value without needing to re-subscribe
  const messageRowsRef = useRef<MessageRow[]>(messageRows);
  useEffect(() => {
    messageRowsRef.current = messageRows;
  }, [messageRows]);

  useEffect(() => {
    const supabase = getSupabaseClient();
    const subscription = supabase
      .channel(`session:${sessionId}`)
      .on<MessageRow>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          schema: "public",
          table: "messages",
          event: "*",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT") {
            setMessageRows((currentMessageRows) => [...currentMessageRows, payload.new]);

            // handle update (e.g. AI streaming)
          } else if (payload.eventType === "UPDATE") {
            const updatedMessageRow = payload.new;
            setMessageRows((localMessageRows) => {
              return localMessageRows.map((localMessageRow) => {
                if (String(localMessageRow.id) === String(updatedMessageRow.id)) {
                  return updatedMessageRow;
                }
                return localMessageRow;
              });
            });
          }
        },
      )
      .subscribe();

    return () => {
      console.log("useAiChat:unsubscribe");
      void supabase.removeChannel(subscription);
    };
  }, [sessionId]);

  return messageRows;
}

function allUsersHaveFinishedVoting({
  latestOutcomeVotes: outcomeVotes,
  users,
}: {
  users: SessionUser[];
  latestOutcomeVotes: SessionRow["scenario_outcome_votes"];
}) {
  const sessionUserVoteMapEntries = Object.entries(outcomeVotes);

  // check if all current session users have voted
  const sessionUserIds = new Set(users.map((user) => user.id));
  sessionUserVoteMapEntries.forEach(([voteUserId]) => {
    return sessionUserIds.delete(voteUserId);
  });
  if (sessionUserIds.size > 0) {
    return false; // not all users have voted
  }

  // check if all users have finished voting
  return sessionUserVoteMapEntries.every(([, voteMap]) => {
    return userHasMadeAllVotesAndIsReadyForNextStage({ users, voteMap });
  });
}

function userHasMadeAllVotes({
  users,
  voteMap,
}: {
  users: SessionUser[];
  voteMap: NonNullable<SessionRow["scenario_outcome_votes"][string]>;
}) {
  // this might include votes from users who left the session so we need to actually check the vote user ids
  const sessionUserIds = new Set(users.map((user) => user.id));
  for (const [voteUserId, vote] of Object.entries(voteMap)) {
    if (!sessionUserIds.has(voteUserId)) {
      continue; // ignore votes from users who left the session or non-user keys e.g. READY_FOR_NEXT_STAGE_KEY
    }

    const voteIsValid = typeof vote === "boolean";
    if (voteIsValid) {
      sessionUserIds.delete(voteUserId);
      if (sessionUserIds.size === 0) {
        return true; // all users have been voted for
      }
    }
  }

  return false; // not all users have been voted for
}

function userHasMadeAllVotesAndIsReadyForNextStage({
  users,
  voteMap,
}: {
  users: SessionUser[];
  voteMap: SessionRow["scenario_outcome_votes"][string];
}): boolean {
  const isReadyForNextStage = !!voteMap?.[READY_FOR_NEXT_STAGE_KEY];
  if (!isReadyForNextStage) {
    return false;
  }
  return userHasMadeAllVotes({ users, voteMap });
}
