/* eslint-disable functional-core/purity */
/* eslint-disable no-console */
// example https://github.com/supabase/realtime/blob/main/demo/pages/%5B...slug%5D.tsx
// example https://github.com/supabase/supabase/blob/master/examples/slack-clone/nextjs-slack-clone/lib/Store.js

"use client";

import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type { UseToastOptions } from "@chakra-ui/react";
import { Center, Spinner, Text } from "@chakra-ui/react";
import type { RealtimeChannel, RealtimeChannelSendResponse } from "@supabase/supabase-js";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import ScenarioSelectorContainer from "./ScenarioSelector.container";
import { getSupabaseClient } from "../../utils/client/supabase";
import type {
  BroadcastEventFrom,
  MessageRow,
  SessionRow,
  SessionUser,
  UserProfileRow,
} from "../../types";
import OutcomesRevealContainer from "./OutcomesReveal.container";
import { useCustomToast } from "../../utils/client/hooks";
import ScenarioChatContainer from "./scenarioChat/ScenarioChat.container";

type State = {
  users: SessionUser[];
  currentUser: SessionUser;
  session: SessionRow;
  currentUserHasJoinedSession: boolean;
};

/**
 * These are actions that are only dispatched locally and not broadcasted to other clients
 * These should be actions that affect the UI, things that happen that do not affect the UI should not be here
 */
type LocalAction =
  | {
      event: "usersUpdated";
      data: SessionUser[];
    }
  | {
      event: "sessionUpdated";
      // NOTE: supabase seems to only create events with some of the columns
      // assuming this is an optimisation to only send updates to clients to reduce payloads
      data: Partial<SessionRow>;
    }
  | {
      event: "userProfileUpdated";
      data: UserProfileRow;
    };

enum BroadcastEventName {
  Toast = "Toast",
  TypingStateChanged = "TypingStateChanged",
}

type TypingStateChangedPayload = {
  isTyping: boolean;
  userId: string;
};

type BroadcastAction =
  | {
      event: `${BroadcastEventName.Toast}`;
      data: UseToastOptions & { dontShowToUserId: string | null };
    }
  | {
      event: `${BroadcastEventName.TypingStateChanged}`;
      data: TypingStateChangedPayload;
    };

type BroadcastEvent = BroadcastEventFrom<BroadcastAction>;

export type BroadcastFunction = (event: BroadcastAction) => void;

type Action = LocalAction | BroadcastAction;

function reducer(state: State, action: Action): State {
  console.log("GameSession event:", action.event, "->", { state, action });
  if (typeof action.data === "undefined") {
    throw new Error(
      `Action "${(action as Action).event}" payload is "${typeof (action as Action).data}"`,
    );
  }

  switch (action.event) {
    case "usersUpdated": {
      return {
        ...state,
        users: [...action.data].map((user) => {
          const isCurrentUser = user.id === state.currentUser.id;
          return {
            ...user,
            isCurrentUser,
            relativeName: isCurrentUser ? "I" : user.name,
          };
        }),
        currentUserHasJoinedSession: action.data.some((user) => user.id === state.currentUser.id),
      };
    }

    case "userProfileUpdated": {
      return {
        ...state,
        users: state.users.map((user) => {
          if (user.id === action.data.user_id) {
            return { ...user, name: action.data.user_name };
          }
          return user;
        }),
      };
    }

    case "sessionUpdated": {
      return {
        ...state,
        session: {
          ...state.session,
          ...action.data, // NOTE: this is a partial update
        },
      };
    }

    case BroadcastEventName.TypingStateChanged: {
      return {
        ...state,
        users: state.users.map((user) => {
          if (user.id === action.data.userId) {
            return { ...user, isTyping: action.data.isTyping };
          }
          return user;
        }),
      };
    }

    default:
      throw new Error(`Unknown action type ${(action as Action).event}`);
  }
}

function useThrottledBroadcast({
  channelRef,
}: {
  channelRef: React.MutableRefObject<RealtimeChannel | null>;
}): BroadcastFunction {
  const toast = useCustomToast();
  const broadcastQueueRef = useRef<BroadcastAction[]>([]);
  const broadcastIntervalIdRef = useRef<number | null>(null);

  return useCallback(
    async (event) => {
      console.log("broadcast event request received", event, {
        currentQueue: broadcastQueueRef.current,
        currentIntervalId: broadcastIntervalIdRef.current,
      });
      if (!channelRef.current) {
        console.warn("channel not ready, skipping broadcast synchronous handling");
        return;
      }

      broadcastQueueRef.current.push(event);
      if (typeof broadcastIntervalIdRef.current === "number") {
        console.log("broadcast interval already running");
        return; // interval already running
      }
      console.log("broadcast interval not running, starting");

      // setup a new interval
      broadcastIntervalIdRef.current = window.setInterval(async () => {
        if (!channelRef.current) {
          console.warn("channel not ready, skipping broadcast interval handling");
          return;
        }

        const nextEvent = broadcastQueueRef.current.shift();
        console.log("broadcast interval tick", {
          nextEvent,
          currentQueue: broadcastQueueRef.current,
        });
        if (!broadcastQueueRef.current?.length) {
          console.log("broadcast queue empty, clearing interval");
          // no more scheduled events to send
          if (broadcastIntervalIdRef.current) {
            window.clearInterval(broadcastIntervalIdRef.current);
          }
          broadcastIntervalIdRef.current = null;
        }

        if (!nextEvent) {
          console.warn("no next event, skipping");
          return;
        }

        console.log("broadcasting event", nextEvent);
        const result = await channelRef.current
          .send({
            ...nextEvent,
            type: REALTIME_LISTEN_TYPES.BROADCAST,
          })
          .catch((error) => {
            console.error("broadcast error", { event: nextEvent, error });
          });

        if (result !== "ok") {
          console.error("broadcast error", { event: nextEvent, result });
          toast({
            status: "error",
            title: "Error sending broadcast message",
            description: result || "",
          });
        }
        console.log("broadcast event sent", nextEvent);
      }, 200);
    },
    [channelRef, toast],
  );
}

function useRealtime({ state, send }: { state: State; send: React.Dispatch<Action> }) {
  const toast = useCustomToast();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // need this so the use effect for subscribing to realtime can run once only and also access the latest state
  const contextRef = useRef({
    state,
    userLeaveTimeoutIdMap: new Map<string, ReturnType<typeof setTimeout>>(),
  });

  useEffect(() => {
    console.log("GameSession - new sessionState", state);
    // eslint-disable-next-line functional-core/purity
    contextRef.current.state = state;
  }, [state]);

  const broadcast = useThrottledBroadcast({ channelRef });

  const [resubscribeFlag, setResubscribeFlag] = useState(false);

  // join realtime channel for this session
  useEffect(() => {
    if (channelRef.current) {
      console.log("GameSession - channel already joined, not joining again", channelRef.current);
      return; // already joined
    }
    console.log("GameSession - joining channel");

    const sessionKey = `Session-${state.session.id}`;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(sessionKey, {
        config: {
          broadcast: {
            // wait for server to acknowledge sent messages before resolving send message promise
            ack: true,
            // send own messages to self (we manually ignore some that we don't want to show to the local user)
            self: true,
          },
          presence: {
            // todo this should be user ID?
            key: sessionKey,
          },
        },
      })
      // ! presence state seems to be readonly after being tracked, need to listen to broadcast or DB events to update state
      .on("presence", { event: "sync" }, () => {
        const presenceStateMap = channel.presenceState<SessionUser>();
        const presenceUsers = presenceStateMap[sessionKey] || [];
        const users = getChangedUsers({
          previousUsers: contextRef.current.state.users,
          nextUsers: presenceUsers,
        });
        console.log("presence sync", { presenceStateMap, presenceUsers, users });

        // handle users joining
        users.joining.forEach((joiningUser) => {
          // clear any pending leave timeouts for this user so its like they never left
          const leaveTimeoutId = contextRef.current.userLeaveTimeoutIdMap.get(joiningUser.id);
          if (leaveTimeoutId) {
            clearTimeout(leaveTimeoutId);
            contextRef.current.userLeaveTimeoutIdMap.delete(joiningUser.id);
            console.log(
              "🔙 cleared leave timeout for user that left but rejoined:",
              joiningUser.name,
            );
          }

          // only show toast for users that did not leave recently
          if (!leaveTimeoutId && joiningUser.id !== contextRef.current.state.currentUser?.id) {
            console.log("🆕 new user joined session:", joiningUser.name);
            toast({ title: `${joiningUser.name} joined` });
          }
        });

        presenceUsers.forEach((presenceUser) => {
          // clear any pending leave timeouts for all users that are here (incase they got missed above)
          const leaveTimeoutId = contextRef.current.userLeaveTimeoutIdMap.get(presenceUser.id);
          if (leaveTimeoutId) {
            clearTimeout(leaveTimeoutId);
            contextRef.current.userLeaveTimeoutIdMap.delete(presenceUser.id);
            console.warn("🔙 cleared leave timeout for presence user:", presenceUser.name);
          }
        });

        // users join session immediately
        const usersJoiningWithoutHavingLeftRecently = users.joining.filter(
          (joiningUser) => !contextRef.current.userLeaveTimeoutIdMap.has(joiningUser.id),
        );
        send({
          event: "usersUpdated",
          data: deduplicatedUsers([
            ...contextRef.current.state.users,
            ...usersJoiningWithoutHavingLeftRecently,
          ]),
        });

        // handle users leaving, this is delayed incase its a realtime network issue and they rejoin quickly
        users.leaving.forEach((leavingUser) => {
          if (leavingUser.id !== contextRef.current.state.currentUser?.id) {
            let leaveTimeoutId = contextRef.current.userLeaveTimeoutIdMap.get(leavingUser.id);
            if (leaveTimeoutId) {
              console.log("user already leaving, not setting another timeout:", leavingUser.name);
              return;
            }

            console.log("⏲️ user leaving session, setting timeout:", leavingUser.name);
            leaveTimeoutId = setTimeout(() => {
              contextRef.current.userLeaveTimeoutIdMap.delete(leavingUser.id);
              console.log("👋🏾 user left session (even after delay):", leavingUser.name);
              toast({ title: `${leavingUser.name} left` });
              send({
                event: "usersUpdated",
                data: contextRef.current.state.users.filter((user) => user.id !== leavingUser.id),
              });
            }, 10_000);

            contextRef.current.userLeaveTimeoutIdMap.set(leavingUser.id, leaveTimeoutId);
          }
        });
      })
      .on<SessionRow>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          schema: "public",
          table: "sessions",
          event: "UPDATE",
          filter: `id=eq.${state.session.id}`,
        },
        (data) => {
          console.log("sessionUpdated", data);
          send({ event: "sessionUpdated", data: data.new });
        },
      )
      .on<UserProfileRow>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          schema: "public",
          table: "user_profiles",
          event: "UPDATE",
        },
        (data) => {
          console.log("userProfileUpdated", data);
          send({ event: "userProfileUpdated", data: data.new });
        },
      );

    function handleBroadcastMessage(message: BroadcastEvent) {
      console.log("received broadcast message", message);
      if (message.event === BroadcastEventName.Toast) {
        const { dontShowToUserId, ...toastConfig } = message.data;
        if (dontShowToUserId !== contextRef.current.state.currentUser.id) {
          toast(toastConfig); // dont show toasts to self
        }
        return;
      }
      if (message.event === BroadcastEventName.TypingStateChanged) {
        send(message);
        return;
      }
      throw new Error(
        `Unknown broadcast event "${(message as BroadcastEvent).event}" with data ${JSON.stringify(
          message,
          null,
          2,
        )}`,
      );
    }

    Object.values(BroadcastEventName).forEach((event) => {
      channel.on(REALTIME_LISTEN_TYPES.BROADCAST, { event }, handleBroadcastMessage as any);
    });

    channelRef.current = channel;

    // ? does this manage re-trying in the event of a disconnect?
    const subscription = channel.subscribe(
      async (status, error) => {
        console.log("🔃 realtime channel status:", status, error);

        if (status === "SUBSCRIBED") {
          let retriesRemaining = 3;

          let presenceTrackResponse: RealtimeChannelSendResponse | undefined;
          while (retriesRemaining) {
            retriesRemaining--;
            console.log("trying to track presence", { retriesRemaining });

            // delay to prevent rate limiting
            await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
            presenceTrackResponse = await channel.track({
              ...contextRef.current.state.currentUser,
              isCurrentUser: false, // this is relative to users cant broadcast true to other people
            } satisfies SessionUser);
            console.warn("presenceTrackResponse after #join:", presenceTrackResponse);

            if (presenceTrackResponse === "ok") {
              return;
            }
          }

          toast({
            status: "error",
            title: "Failed to join session",
            description: presenceTrackResponse,
          });

          // cant recover from this, so just re-subscribe
          setTimeout(() => {
            console.log("triggering resubscribe to realtime channel");
            setResubscribeFlag((flag) => !flag);
          }, 1000);

          // todo if the above isn't reliable try reloading the whole page?

          // handle status
        } else if (status === "CLOSED") {
          // this seems to represent a purposeful close, e.g. when unmounted,
          // so not an error and not showing a toast for this
          console.warn("CLOSED");

          // handle status
        } else if (error || status === "CHANNEL_ERROR") {
          console.error("CHANNEL_ERROR", error);
          toast({
            status: "error",
            title: "Session error",
            description: error?.message,
          });

          // handle status
        } else if (status === "TIMED_OUT") {
          console.error("TIMED_OUT");
          toast({
            status: "error",
            title: "Session timed out",
          });
        }
      },
      10 * 60 * 1000,
    );

    // todo is this required?
    // this is to try and prevent the connection from being closed due to inactivity
    const pingIntervalId = setInterval(() => {
      console.count("pinging realtime channel");
      return channel.send({
        type: REALTIME_LISTEN_TYPES.BROADCAST,
        event: "ping",
      });
    }, 10_000);

    return () => {
      console.countReset("pinging realtime channel");
      console.warn("closing channel", channelRef.current);
      clearInterval(pingIntervalId);
      void supabase.removeChannel(subscription);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only subscribe to channel once
  }, [resubscribeFlag]);

  return { broadcast };
}

function deduplicatedUsers(users: SessionUser[]) {
  return users.filter((user, index) => {
    // ie users can only exist once in the array at a specific index (we take the first one if there is a duplicate)
    return users.findIndex((u) => u.id === user.id) === index;
  });
}

function getChangedUsers({
  previousUsers,
  nextUsers,
}: {
  previousUsers: SessionUser[];
  nextUsers: SessionUser[];
}) {
  // prevent duplicate users from users using multiple tabs/browsers/devices, they should all be the same user
  previousUsers = deduplicatedUsers(previousUsers); // should not be needed but just in case
  nextUsers = deduplicatedUsers(nextUsers);
  const previousUserIds = new Set(previousUsers.map((u) => u.id));
  const nextUserIds = new Set(nextUsers.map((u) => u.id));
  const added = nextUsers.filter((nextUser) => !previousUserIds.has(nextUser.id));
  const removed = previousUsers.filter((previousUser) => !nextUserIds.has(previousUser.id));
  return { joining: added, leaving: removed };
}

function useLogic({ existing, currentUser }: Props) {
  const [state, send] = useReducer(reducer, null, () => {
    return {
      users: [],
      currentUser,
      session: {
        ...existing.session,
      },
      currentUserHasJoinedSession: false,
    } satisfies State;
  });

  const { broadcast } = useRealtime({ state, send });

  return {
    currentUser,
    users: state.users,
    session: state.session,
    currentUserHasJoinedSession: state.currentUserHasJoinedSession,
    broadcast,
  };
}

type Props = {
  existing: {
    messageRows: MessageRow[];
    session: SessionRow;
  };
  currentUser: SessionUser;
};

export default function GameSession(props: Props): React.ReactElement {
  const { currentUser, users, session, currentUserHasJoinedSession, broadcast } = useLogic(props);

  if (!currentUserHasJoinedSession) {
    console.log("waiting for user to join session...");
    return (
      <Center key='waiting-for-user-to-join' as='section' height='100%'>
        <Spinner />
      </Center>
    );
  }

  if (users.length < 2) {
    return (
      <Center key='waiting for more players' as='section' height='100%' flexDirection='column'>
        <Text fontSize='2xl'>Waiting for more players to join...</Text>
        <Text>(Players can join if you give them the link to this page)</Text>
      </Center>
    );
  }

  if (session.stage === "scenario-selection") {
    const scenarioOptions = [...(session.scenario_options || [])];
    // making sure there are always 3 options even when loading
    while (scenarioOptions.length < 3) {
      scenarioOptions.push("");
    }

    return (
      <ScenarioSelectorContainer
        key='scenario-selector'
        scenarioOptions={scenarioOptions}
        optionVotes={session.scenario_option_votes}
        currentUser={currentUser}
        users={users}
        selectedOptionId={session.id}
        voteId={session.scenario_option_votes?.[currentUser.id] || null}
        broadcast={broadcast}
      />
    );
  }

  if (session.stage === "scenario-outcome-selection") {
    return (
      <ScenarioChatContainer
        key='scenario-chat'
        selectedScenarioText={session.selected_scenario_text}
        existing={props.existing}
        currentUser={currentUser}
        sessionId={session.id}
        selectedScenarioImagePath={session.selected_scenario_image_path}
        users={users}
        outcomeVotes={session.scenario_outcome_votes || {}}
        broadcast={broadcast}
        aiIsResponding={session.ai_is_responding}
      />
    );
  }

  if (session.stage === "scenario-outcome-reveal") {
    if (!session.selected_scenario_text) {
      throw new Error("Missing selected_scenario_text");
    }
    return (
      <OutcomesRevealContainer
        key='outcomes-reveal'
        sessionId={session.id}
        currentUser={currentUser}
        outcomeVotes={session.scenario_outcome_votes}
        users={users}
        scenarioText={session.selected_scenario_text}
        broadcast={broadcast}
      />
    );
  }

  throw new Error(`Unexpected session stage ${session.stage}`);
}
