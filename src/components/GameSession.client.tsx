/* eslint-disable no-console */
// example https://github.com/supabase/realtime/blob/main/demo/pages/%5B...slug%5D.tsx
// example https://github.com/supabase/supabase/blob/master/examples/slack-clone/nextjs-slack-clone/lib/Store.js

"use client";

import React, { useCallback, useEffect, useReducer, useRef } from "react";
import type { Message } from "ai";
import { Center, Spinner, useToast } from "@chakra-ui/react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { REALTIME_LISTEN_TYPES, REALTIME_PRESENCE_LISTEN_EVENTS } from "@supabase/supabase-js";
import ScenarioSelector from "./ScenarioSelector.client";
import ScenarioChat from "./ScenarioChat.client";
import { getSupabaseClient } from "../utils/client/supabase";
import type { BroadcastEventFrom, SessionData, SessionUser } from "../types";

type State = {
  users: SessionUser[];
  currentUser: SessionUser;
  session: SessionData;
  scenarioText: string | null;
};

type Action =
  | {
      event: "usersUpdated";
      data: SessionUser[];
    }
  | {
      event: "sessionUpdated";
      data: SessionData;
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

    case "scenarioTextUpdated": {
      return { ...state, scenarioText: action.data };
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
  initial: {
    messages: Message[];
    session: SessionData;
    scenarioText: string | null;
  };
  currentUser: SessionUser;
};

export default function GameSession({ initial, currentUser }: Props): React.ReactElement {
  const toast = useToast();
  const supabaseChannelRef = useRef<RealtimeChannel>();
  const [state, send] = useReducer(reducer, null, () => {
    return {
      users: [],
      currentUser,
      session: {
        ...initial.session,
      },
      scenarioText: initial.scenarioText,
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
            // todo debug why this doesn't find the user that left in left presences
            toast({ title: `${leftUser?.name || leftPresence.id} left` });
          });
        },
      )
      .on<SessionData>(
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
      void getSupabaseClient().removeChannel(subscription);
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

  useEffect(() => {
    if (state.session.selected_scenario_id && !state.scenarioText) {
      void getSupabaseClient()
        .from("scenarios")
        .select("text")
        .eq("id", state.session.selected_scenario_id)
        .single()
        .then(({ data }) => {
          if (!data) {
            throw new Error("No scenario text found");
          }
          send({ event: "scenarioTextUpdated", data: data.text });
        });
    }
  }, [state.scenarioText, state.session.selected_scenario_id, state.session.stage]);

  if (state.session.stage === "scenario-selection") {
    if (!state.session.scenario_options?.length) {
      throw new Error("No initial scenario options provided");
    }
    return (
      <ScenarioSelector
        scenarioOptions={state.session.scenario_options}
        optionVotes={state.session.scenario_option_votes}
        currentUser={state.currentUser}
        users={state.users}
        selectedOptionId={state.session.id}
        voteId={state.session.scenario_option_votes?.[state.currentUser.id] || null}
      />
    );
  }

  if (state.session.stage === "scenario-outcome-selection") {
    if (!state.scenarioText) {
      return (
        <Center width='100%' height='100%'>
          <Spinner />
        </Center>
      );
    }
    return (
      <ScenarioChat
        selectedScenarioText={state.scenarioText}
        initial={initial}
        currentUser={currentUser}
        sessionId={state.session.id}
        sessionLockedByUserId={state.session.messaging_locked_by_user_id}
      />
    );
  }

  throw new Error(`Unexpected session stage ${state.session.stage}`);
}
