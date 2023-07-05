/* eslint-disable no-console */
// example https://github.com/supabase/realtime/blob/main/demo/pages/%5B...slug%5D.tsx

"use client";

import React, { useCallback, useEffect, useReducer, useRef, useState } from "react";
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
};

type Action =
  | {
      event: "usersUpdated";
      data: SessionUser[];
    }
  | {
      event: BroadcastEventName.UserNameUpdated;
      data: UserNameUpdatedPayload;
    };

type BroadcastEvent = BroadcastEventFrom<Action>;

function reducer(state: State, action: Action): State {
  console.log("GameSession reducer", action.event, { state, action });
  if (!action.data) {
    throw new Error(`Action "${action.event}" payload is undefined`);
  }

  switch (action.event) {
    case "usersUpdated": {
      const newState: State = {
        ...state,
        users: [...action.data],
      };
      return newState;
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

    default:
      throw new Error(`Unknown action type ${(action as Action).event}`);
  }
}

enum BroadcastEventName {
  UserNameUpdated = "UserNameUpdated",
  RequestLatestSessionState = "RequestLatestSessionState",
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
  const [scenario, setScenario] = useState(
    existing?.scenario ??
      "" ??
      "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
  );
  const toast = useToast();
  const supabaseChannelRef = useRef<RealtimeChannel>();
  const [sessionState, send] = useReducer(
    reducer,
    null,
    () => ({ users: [], currentUser } satisfies State),
  );

  // need this so the use effect for subscribing to realtime can run once only and also access the latest state
  const stateRef = useRef(sessionState);
  useEffect(() => {
    console.log("GameSession - new sessionState", sessionState);
    stateRef.current = sessionState;
  }, [sessionState]);

  // todo use when app state is in one place
  // const broadcastSessionStateRequest = useCallback(
  //   (newUserName: string) =>
  //     supabaseChannelRef.current!.send({
  //       type: REALTIME_LISTEN_TYPES.BROADCAST,
  //       event: BroadcastEventName.RequestLatestSessionState,
  //       data: { newUserName, userId: currentUser.id },
  //     } satisfies BroadcastEvent),
  //   [currentUser.id, supabaseChannelRef],
  // );

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
        const newState = channel.presenceState<SessionUser>();
        send({ event: "usersUpdated", data: [...newState[sessionKey]] });
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
          if (isSelfJoining) {
            // todo request latest session state
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
            sessionState,
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
      )
      .on(
        REALTIME_LISTEN_TYPES.BROADCAST,
        { event: BroadcastEventName.UserNameUpdated },
        send as any,
      )
      .subscribe(async (status, error) => {
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

  const broadcastNameChange = useCallback(
    (newUserName: string) =>
      supabaseChannelRef.current!.send({
        type: REALTIME_LISTEN_TYPES.BROADCAST,
        event: BroadcastEventName.UserNameUpdated,
        data: { newUserName, userId: currentUser.id },
      } satisfies BroadcastEvent),
    [currentUser.id, supabaseChannelRef],
  );

  useEffect(() => {
    if (!supabaseChannelRef.current) {
      return;
    }
    const presenceState = supabaseChannelRef.current.presenceState<SessionUser>();

    void broadcastNameChange(currentUser.name);

    // todo implement
    console.log("to handle my username change presenceState", presenceState);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, [currentUser.name]);

  if (!scenario) {
    if (!initial.scenarioOptions.length) {
      throw new Error("No initial scenario options provided");
    }
    return (
      <ScenarioSelector
        onScenarioSelected={setScenario}
        initialScenarioOptions={initial.scenarioOptions}
        currentUser={sessionState.currentUser}
        users={sessionState.users}
        sessionId={sessionId}
      />
    );
  }

  return <ScenarioChat scenario={scenario} existing={existing} />;
}
