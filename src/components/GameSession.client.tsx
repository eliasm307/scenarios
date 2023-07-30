/* eslint-disable no-console */
// example https://github.com/supabase/realtime/blob/main/demo/pages/%5B...slug%5D.tsx
// example https://github.com/supabase/supabase/blob/master/examples/slack-clone/nextjs-slack-clone/lib/Store.js

"use client";

import React, { useCallback, useEffect, useReducer, useRef } from "react";
import type { UseToastOptions } from "@chakra-ui/react";
import { Center, Spinner, Text, useToast } from "@chakra-ui/react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { REALTIME_LISTEN_TYPES, REALTIME_PRESENCE_LISTEN_EVENTS } from "@supabase/supabase-js";
import ScenarioSelector from "./ScenarioSelector.client";
import ScenarioChat from "./ScenarioChat.client";
import { getSupabaseClient } from "../utils/client/supabase";
import type {
  BroadcastEventFrom,
  MessageRow,
  SessionRow,
  SessionUser,
  UserProfileRow,
} from "../types";
import OutcomesReveal from "./OutcomesReveal.client";

type State = {
  users: SessionUser[];
  currentUser: SessionUser;
  session: SessionRow;
  currentUserHasJoinedSession: boolean;
};

type LocalAction =
  | {
      event: "usersUpdated";
      data: SessionUser[];
    }
  | {
      event: "sessionUpdated";
      data: SessionRow;
    }
  | {
      event: "currentUserHasJoinedSession";
      data: boolean;
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
      data: UseToastOptions;
    }
  | {
      event: `${BroadcastEventName.TypingStateChanged}`;
      data: TypingStateChangedPayload;
    };

type BroadcastEvent = BroadcastEventFrom<BroadcastAction>;

export type BroadcastFunction = (event: BroadcastAction) => void;

type Action = LocalAction | BroadcastAction;

function reducer(state: State, action: Action): State {
  console.log("GameSession reducer action received", action.event, { state, action });
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
      return { ...state, session: action.data };
    }

    case "currentUserHasJoinedSession": {
      return { ...state, currentUserHasJoinedSession: action.data };
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

function useLogic({ existing, currentUser }: Props) {
  const toast = useToast();
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

  // need this so the use effect for subscribing to realtime can run once only and also access the latest state
  const stateRef = useRef(state);
  useEffect(() => {
    console.log("GameSession - new sessionState", state);
    // eslint-disable-next-line functional-core/purity
    stateRef.current = state;
  }, [state]);

  const channelRef = useRef<RealtimeChannel>({} as RealtimeChannel);

  const broadcast: BroadcastFunction = useCallback(
    async (event) => {
      const result = await channelRef.current.send({
        ...event,
        type: REALTIME_LISTEN_TYPES.BROADCAST,
      });
      if (result !== "ok") {
        console.error("broadcast error", result);
        toast({
          status: "error",
          title: "Error sending broadcast message",
          description: result,
        });
      }
    },
    [toast],
  );

  useEffect(() => {
    const sessionKey = `Session-${state.session.id}`;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(sessionKey, {
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
      })
      // ! presence state seems to be readonly after being tracked, need to listen to broadcast or DB events to update state
      .on("presence", { event: "sync" }, () => {
        const currentUsers = stateRef.current.users;
        const presenceStateMap = channel.presenceState<SessionUser>();
        const newUsersRaw = presenceStateMap[sessionKey] || [];
        // prevent duplicate users from users using multiple tabs/browsers/devices, they should all be the same user
        const uniqueNewUsers = newUsersRaw.filter((newUser, newUserIndex) => {
          // ie if the same user exists at different indexes then one is a duplicate, we take the first one as the real one
          const isDuplicateUser =
            newUsersRaw.findIndex((user) => user.id === newUser.id) !== newUserIndex;
          if (isDuplicateUser) {
            console.log("duplicate user", { newUser, newUsersRaw });
          }
          return !isDuplicateUser;
        });

        if (uniqueNewUsers.length > 0) {
          console.log("presence sync", {
            newUsers: uniqueNewUsers,
            presenceStateMap,
            oldUsers: currentUsers,
          });
          send({ event: "usersUpdated", data: [...uniqueNewUsers] });
        } else {
          console.log("presence sync but no new users", { presenceStateMap, currentUsers });
        }
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
          newPresences
            // dont notify about self joining
            .filter((newUser) => newUser.id !== currentUser.id)
            .forEach((presence) => {
              toast({ title: `${presence.name} joined` });
            });
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
            toast({ title: `${leftUser?.name || leftPresence.id} left` });
          });
        },
      )
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

    // this is to try and prevent the connection from being closed due to inactivity
    // const pingIntervalId = setInterval(
    //   () =>
    //     channel.send({
    //       type: REALTIME_LISTEN_TYPES.BROADCAST,
    //       event: "ping",
    //     }),
    //   10_000,
    // );

    function handleBroadcastMessage(message: BroadcastEvent) {
      if (message.event === BroadcastEventName.Toast) {
        toast(message.data);
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

    const subscription = channel.subscribe(async (status, error) => {
      // ? when do these fire?
      if (status === "SUBSCRIBED") {
        // delay to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
        const presenceTrackStatus = await channel.track({
          ...currentUser,
          isCurrentUser: false,
        } satisfies SessionUser);

        if (presenceTrackStatus !== "ok") {
          console.error("presenceTrackStatus after join", presenceTrackStatus);
          toast({
            status: "error",
            title: "Failed to join session",
            description: presenceTrackStatus,
          });
        }
      }
      if (status === "CLOSED") {
        console.error("CLOSED");
        toast({
          title: "Session closed",
        });
      }
      if (error || status === "CHANNEL_ERROR") {
        console.error("CHANNEL_ERROR", error);
        toast({
          status: "error",
          title: "Session error",
          description: error?.message,
        });
      }
      if (status === "TIMED_OUT") {
        console.error("TIMED_OUT");
        toast({
          status: "error",
          title: "Session timed out",
        });
      }
    });

    return () => {
      // clearInterval(pingIntervalId);
      void supabase.removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, []);

  useEffect(() => {
    if (state.currentUserHasJoinedSession) {
      return;
    }
    const currentUserHasJoined = state.users.some((user) => user.id === currentUser.id);
    send({ event: "currentUserHasJoinedSession", data: currentUserHasJoined });
  }, [currentUser, send, state.currentUserHasJoinedSession, state.users]);

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
      <Center as='section' height='100%'>
        <Spinner />
      </Center>
    );
  }

  if (users.length < 2) {
    return (
      <Center as='section' height='100%'>
        <Text>Waiting for more players to join...</Text>
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
      <ScenarioSelector
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
      <ScenarioChat
        selectedScenarioText={session.selected_scenario_text}
        existing={props.existing}
        currentUser={currentUser}
        sessionId={session.id}
        sessionLockedByUserId={session.messaging_locked_by_user_id}
        selectedScenarioImagePath={session.selected_scenario_image_path}
        users={users}
        outcomeVotes={session.scenario_outcome_votes || {}}
        broadcast={broadcast}
      />
    );
  }

  if (session.stage === "scenario-outcome-reveal") {
    if (!session.selected_scenario_text) {
      throw new Error("Missing selected_scenario_text");
    }
    return (
      <OutcomesReveal
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
