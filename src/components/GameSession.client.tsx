/* eslint-disable no-console */
// example https://github.com/supabase/realtime/blob/main/demo/pages/%5B...slug%5D.tsx
// example https://github.com/supabase/supabase/blob/master/examples/slack-clone/nextjs-slack-clone/lib/Store.js

"use client";

import React, { useEffect, useReducer, useRef } from "react";
import type { Message } from "ai";
import { Center, Text, useToast } from "@chakra-ui/react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { REALTIME_LISTEN_TYPES, REALTIME_PRESENCE_LISTEN_EVENTS } from "@supabase/supabase-js";
import ScenarioSelector from "./ScenarioSelector.client";
import ScenarioChat from "./ScenarioChat.client";
import { getSupabaseClient } from "../utils/client/supabase";
import type { BroadcastEventFrom, SessionRow, SessionUser } from "../types";
import OutcomesReveal from "./OutcomesReveal.client";

type State = {
  users: SessionUser[];
  currentUser: SessionUser;
  session: SessionRow;
};

type Action =
  | {
      event: "usersUpdated";
      data: SessionUser[];
    }
  | {
      event: "sessionUpdated";
      data: SessionRow;
    }
  | {
      event: BroadcastEventName.UserNameUpdated;
      data: UserNameUpdatedPayload;
    }
  | {
      event: "scenarioTextUpdated";
      data: string;
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

    case "sessionUpdated": {
      return { ...state, session: action.data };
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

function useLogic({ existing: initial, currentUser }: Props) {
  const toast = useToast();
  const supabaseChannelRef = useRef<RealtimeChannel>();
  const [state, send] = useReducer(reducer, null, () => {
    return {
      users: [],
      currentUser,
      session: {
        ...initial.session,
      },
      // scenario:
      //   existing?.scenario ??
      //   "" ?? // todo remove this and default scenario below
      //   "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
    } satisfies State;
  });

  // need this so the use effect for subscribing to realtime can run once only and also access the latest state
  const stateRef = useRef(state);
  useEffect(() => {
    console.log("GameSession - new sessionState", state);
    // eslint-disable-next-line functional-core/purity
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const sessionKey = `Session-${state.session.id}`;
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
    // ! presence state seems to be readonly after being tracked, need to listen to broadcast or DB events to update state
    channel
      .on("presence", { event: "sync" }, () => {
        const presenceStateMap = channel.presenceState<SessionUser>();
        const newUsers = presenceStateMap[sessionKey] || [];
        console.log("presence sync", { newUsers, presenceStateMap });
        send({ event: "usersUpdated", data: [...newUsers] });
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
      );

    function handleBroadcastMessage(message: BroadcastEvent) {
      console.log("GameSession: received broadcast", message.event, message.data);
      send(message as any);
    }

    Object.values(BroadcastEventName).forEach((event) => {
      channel.on(REALTIME_LISTEN_TYPES.BROADCAST, { event }, handleBroadcastMessage as any);
    });

    const subscription = channel.subscribe(async (status, error) => {
      // ? when do these fire?
      if (status === "SUBSCRIBED") {
        // delay to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
        const presenceTrackStatus = await channel.track(currentUser);
        if (presenceTrackStatus !== "ok") {
          console.error("presenceTrackStatus after join", presenceTrackStatus);
        }
      }
      if (status === "CLOSED") {
        console.error("CLOSED", error);
      }
      if (error || status === "CHANNEL_ERROR") {
        console.error("CHANNEL_ERROR", error);
      }
      if (status === "TIMED_OUT") {
        console.error("TIMED_OUT", error);
      }
    });

    return () => {
      void getSupabaseClient().removeChannel(subscription);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, []);

  return {
    currentUser,
    users: state.users,
    session: state.session,
  };
}

type Props = {
  existing: {
    chatMessages: Message[];
    session: SessionRow;
  };
  currentUser: SessionUser;
};

export default function GameSession(props: Props): React.ReactElement {
  const { currentUser, users, session } = useLogic(props);

  if (users.length < 2) {
    return (
      <Center as='section' height='100%'>
        <Text>Waiting for more players to join...</Text>
      </Center>
    );
  }

  if (session.stage === "scenario-selection") {
    return (
      <ScenarioSelector
        scenarioOptions={session.scenario_options}
        optionVotes={session.scenario_option_votes}
        currentUser={currentUser}
        users={users}
        selectedOptionId={session.id}
        voteId={session.scenario_option_votes?.[currentUser.id] || null}
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
        users={users}
        outcomeVotes={session.scenario_outcome_votes || {}}
      />
    );
  }

  if (session.stage === "scenario-outcome-reveal") {
    return (
      <OutcomesReveal
        sessionId={session.id}
        currentUser={currentUser}
        outcomeVotes={session.scenario_outcome_votes}
        users={users}
      />
    );
  }

  throw new Error(`Unexpected session stage ${session.stage}`);
}
