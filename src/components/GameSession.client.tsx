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

type UserPresenceState = {
  userId: string;
  initialUserName: string;
  online_at_ms: number;
};

type State = {
  users: SessionUser[];
  currentUser: SessionUser;
};

type Action =
  | {
      event: "userJoined";
      data: UserPresenceState;
    }
  | {
      event: "userLeft";
      data: {
        userId: string;
      };
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
    case "userJoined": {
      const userAlreadyExists = state.users.some((user) => user.id === action.data.userId);
      if (userAlreadyExists) {
        return state;
      }
      const newState: State = {
        ...state,
        users: [
          ...state.users,
          {
            id: action.data.userId,
            name: action.data.initialUserName,
            isMain: false,
            joinedAtMs: action.data.online_at_ms,
          },
        ],
      };
      const maxJoinTime = Math.max(...newState.users.map((user) => user.joinedAtMs));
      const hasNoMainUser = newState.users.every((user) => !user.isMain);
      if (hasNoMainUser) {
        newState.users.at(-1)!.isMain = true;
      }
      return newState;
    }

    case "userLeft": {
      const { data } = action;
      const newUsers = state.users.filter((user) => user.id !== data.userId);
      const leftUser = state.users.find((user) => user.id === data.userId);
      if (leftUser?.isMain && newUsers.length) {
        newUsers[0].isMain = true;
      }

      return { ...state, users: newUsers };
    }

    case BroadcastEventName.UserNameUpdated: {
      const { data } = action;
      return {
        ...state,
        users: state.users.map((user) =>
          user.id === data.userId ? { ...user, userName: data.newUserName } : user,
        ),
      };
    }

    default:
      throw new Error(`Unknown action type ${(action as Action).event}`);
  }
}

enum BroadcastEventName {
  UserNameUpdated = "UserNameUpdated",
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

  useEffect(() => console.log("GameSession - new sessionState", sessionState), [sessionState]);

  useEffect(() => {
    const sessionKey = `Session-${sessionId}`;
    const supabase = getSupabaseClient();
    const channels = supabase.getChannels();
    if (channels.length) {
      console.log(
        "channels",
        channels.map((channel) => channel.topic),
      );
      debugger;
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
      // .on("presence", { event: "sync" }, () => {
      //   const newState = channel.presenceState<UserPresenceState>();
      //   const prescences = newState[sessionKey];
      //   const userNames = prescences.map((p) => p.userName);
      //   console.log("sync", userNames);
      //   toast({
      //     title: `SYNC: ${userNames.join(", ")} are here`,
      //   });
      // })
      .on<UserPresenceState>(
        REALTIME_LISTEN_TYPES.PRESENCE,
        { event: REALTIME_PRESENCE_LISTEN_EVENTS.JOIN },
        ({ key: sessionPresenceKey, newPresences, currentPresences }) => {
          debugger;
          console.log("join", {
            sessionPresenceKey,
            newPresences,
            currentPresences,
          });
          newPresences.forEach((presence) => {
            toast({ title: `${presence.initialUserName} joined` });
            send({ event: "userJoined", data: presence });
          });
        },
      )
      .on<UserPresenceState>(
        REALTIME_LISTEN_TYPES.PRESENCE,
        { event: REALTIME_PRESENCE_LISTEN_EVENTS.LEAVE },
        ({ key: sessionPresenceKey, leftPresences, currentPresences }) => {
          debugger;
          console.log("leave", { sessionPresenceKey, leftPresences, currentPresences });
          leftPresences.forEach((presence) => {
            const leftUser = sessionState.users.find(
              (existingUsers) => existingUsers.id === presence.userId,
            )!;
            toast({ title: `${leftUser?.name || presence.userId} left` });
            send({ event: "userLeft", data: presence });
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
          const currentUserPresence: UserPresenceState = {
            userId: currentUser.id,
            initialUserName: currentUser.name,
            online_at_ms: Date.now(),
          };
          // to prevent rate limiting
          await new Promise((resolve) => setTimeout(resolve, 100));
          const presenceTrackStatus = await channel.track(currentUserPresence);
          console.log("after join result", presenceTrackStatus);
          send({ event: "userJoined", data: currentUserPresence });
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
      send({ event: "userLeft", data: { userId: currentUser.id } });
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
    const presenceState = supabaseChannelRef.current.presenceState<UserPresenceState>();

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
