/* eslint-disable no-console */
// example https://github.com/supabase/realtime/blob/main/demo/pages/%5B...slug%5D.tsx

"use client";

import React, { useCallback, useEffect, useReducer, useRef } from "react";
import type { Message } from "ai";
import { useToast } from "@chakra-ui/react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { REALTIME_LISTEN_TYPES, REALTIME_PRESENCE_LISTEN_EVENTS } from "@supabase/supabase-js";
import ScenarioSelector from "./ScenarioSelector.client";
import ScenarioChat from "./ScenarioChat.client";
import { getSupabaseClient } from "../utils/client/supabase";
import type { BroadcastEventFrom, SessionUser } from "../types";

type State = {
  users: SessionUser[];
  currentUser: SessionUser;
  scenario: string | null;
};

type Action =
  | {
      event: "usersUpdated";
      data: SessionUser[];
    }
  | {
      event: "setScenario";
      data: string;
    }
  | {
      event: BroadcastEventName.UserNameUpdated;
      data: UserNameUpdatedPayload;
    }
  | {
      event: BroadcastEventName.RequestLatestSessionState;
      data: { toUserId: string; fromUserId: string };
    }
  | {
      event: BroadcastEventName.LatestSessionState;
      data: Pick<State, "scenario">;
    };

type BroadcastEvent = BroadcastEventFrom<Action>;

function reducer(state: State, action: Action): State {
  console.log("GameSession reducer", action.event, { state, action });
  if (!action.data) {
    throw new Error(`Action "${action.event}" payload is undefined`);
  }

  switch (action.event) {
    case "usersUpdated": {
      return { ...state, users: [...action.data] };
    }

    case BroadcastEventName.UserNameUpdated: {
      const { userId, newUserName } = action.data;
      const newState: State = {
        ...state,
        users: state.users.map((user) => {
          if (user.id === userId) {
            return { ...user, name: newUserName };
          }
          return user;
        }),
      };
      return newState;
    }

    case "setScenario": {
      return { ...state, scenario: action.data };
    }

    // no change as its a request for our state
    case BroadcastEventName.RequestLatestSessionState: {
      return state;
    }

    case BroadcastEventName.LatestSessionState: {
      return { ...state, ...action.data };
    }

    default:
      throw new Error(`Unknown action type ${(action as Action).event}`);
  }
}

enum BroadcastEventName {
  UserNameUpdated = "UserNameUpdated",
  RequestLatestSessionState = "RequestLatestSessionState",
  LatestSessionState = "LatestSessionState",
}

type UserNameUpdatedPayload = {
  userId: string;
  newUserName: string;
};

type Props = {
  sessionId: string;
  existing?: {
    scenario?: string;
    messages?: Message[];
  };
  initial: {
    scenarioOptions: string[];
  };
  currentUser: SessionUser;
};

export default function GameSession({
  sessionId,
  existing,
  initial,
  currentUser,
}: Props): React.ReactElement {
  const toast = useToast();
  const supabaseChannelRef = useRef<RealtimeChannel>();
  const [state, send] = useReducer(reducer, null, () => {
    return {
      users: [],
      currentUser,
      scenario:
        existing?.scenario ??
        "" ?? // todo remove this and default scenario below
        "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
    } satisfies State;
  });

  // need this so the use effect for subscribing to realtime can run once only and also access the latest state
  const stateRef = useRef(state);
  useEffect(() => {
    console.log("GameSession - new sessionState", state);
    stateRef.current = state;
  }, [state]);

  const broadcast = useCallback(
    (action: Action) => {
      console.log("GameSession:broadcast", action.event, action.data);
      void supabaseChannelRef.current!.send({
        ...action,
        type: REALTIME_LISTEN_TYPES.BROADCAST,
      } satisfies BroadcastEvent);
    },
    [supabaseChannelRef],
  );

  useEffect(() => {
    const sessionKey = `Session-${sessionId}`;
    const supabase = getSupabaseClient();
    const channels = supabase.getChannels();
    if (channels.length) {
      console.log(
        "channels",
        channels.map((channel) => channel.topic),
      );
    }
    const channel = supabase.channel(sessionKey, {
      config: {
        broadcast: {
          // wait for server to acknowledge sent messages before resolving send message promise
          ack: true,
          // send own messages to self
          self: true,
        },
        presence: {
          key: sessionKey,
        },
      },
    });
    supabaseChannelRef.current = channel;
    // ! prescence state seems to be readonly after being tracked, need to listen to broadcast or DB events to update state
    channel
      .on("presence", { event: "sync" }, () => {
        const newState = channel.presenceState<SessionUser>()[sessionKey] || [];
        send({ event: "usersUpdated", data: [...newState] });
      })
      .on<SessionUser>(
        REALTIME_LISTEN_TYPES.PRESENCE,
        { event: REALTIME_PRESENCE_LISTEN_EVENTS.JOIN },
        ({ key: sessionPresenceKey, newPresences, currentPresences }) => {
          console.log("join", {
            sessionPresenceKey,
            newPresences,
            currentPresences,
          });
          newPresences.forEach((presence) => {
            toast({ title: `${presence.name} joined` });
          });

          const isSelfJoining = newPresences.some((presence) => presence.id === currentUser.id);
          if (isSelfJoining && currentPresences.length) {
            broadcast({
              event: BroadcastEventName.RequestLatestSessionState,
              data: { toUserId: currentPresences[0].id, fromUserId: currentUser.id },
            });
          } else {
            console.log("not requesting latest state as not self joining or only user in session", {
              isSelfJoining,
              existingUserCount: currentPresences.length,
            });
          }
        },
      )
      .on<SessionUser>(
        REALTIME_LISTEN_TYPES.PRESENCE,
        { event: REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE },
        ({ key: sessionPresenceKey, leftPresences, currentPresences }) => {
          console.log("leave", {
            sessionPresenceKey,
            leftPresences,
            currentPresences,
            sessionState: state,
            sessionStateRef: stateRef.current,
          });
          leftPresences.forEach((leftPresence) => {
            const leftUser = stateRef.current.users.find(
              (existingUsers) => existingUsers.id === leftPresence.id,
            );
            // todo debug why this doesnt find the user that left in left prescences
            toast({ title: `${leftUser?.name || leftPresence.id} left` });
          });
        },
      );

    function handleBroadcastMessage(message: BroadcastEvent) {
      console.log("GameSession: received broadcast", message.event, message.data);
      send(message as any);

      if (message.event === BroadcastEventName.RequestLatestSessionState) {
        if (message.data.toUserId === currentUser.id) {
          console.log(
            "GameSession: responding RequestLatestSessionState",
            message.event,
            message.data,
          );
          return new Promise((resolve) => setTimeout(resolve, 500)).then(() => {
            return broadcast({
              event: BroadcastEventName.LatestSessionState,
              data: {
                scenario: stateRef.current.scenario,
              },
            });
          });
        }
        console.log(
          "RequestLatestSessionState not intended for me, ignoring",
          message.event,
          message.data,
        );
      }
    }

    Object.values(BroadcastEventName).forEach((event) => {
      channel.on(REALTIME_LISTEN_TYPES.BROADCAST, { event }, handleBroadcastMessage as any);
    });

    channel.subscribe(async (status, error) => {
      // ? when do these fire?
      if (status === "SUBSCRIBED") {
        // delay to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
        const presenceTrackStatus = await channel.track(currentUser);
        if (presenceTrackStatus !== "ok") {
          console.error("presenceTrackStatus after join", presenceTrackStatus);
        }

        // todo should request state from session
      }
      if (status === "CLOSED") {
        await channel.untrack();
      }
      if (error || status === "CHANNEL_ERROR") {
        console.error("CHANNEL_ERROR", error);
      }
      if (status === "TIMED_OUT") {
        console.error("TIMED_OUT", error);
      }
    });

    return () => {
      // send({ event: "userLeft", data: { userId: currentUser.id } });
      void getSupabaseClient().removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, []);

  useEffect(() => {
    if (!supabaseChannelRef.current) {
      return;
    }
    const presenceState = supabaseChannelRef.current.presenceState<SessionUser>();

    broadcast({
      event: BroadcastEventName.UserNameUpdated,
      data: { userId: currentUser.id, newUserName: currentUser.name },
    });

    // todo implement
    console.log("to handle my username change presenceState", presenceState);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, [currentUser.name]);

  const setScenario = useCallback(
    (scenario: string) => send({ event: "setScenario", data: scenario }),
    [send],
  );

  if (!state.scenario) {
    if (!initial.scenarioOptions.length) {
      throw new Error("No initial scenario options provided");
    }
    return (
      <ScenarioSelector
        onScenarioSelected={setScenario}
        initialScenarioOptions={initial.scenarioOptions}
        currentUser={state.currentUser}
        users={state.users}
        sessionId={sessionId}
      />
    );
  }

  return <ScenarioChat scenario={state.scenario} existing={existing} />;
}
