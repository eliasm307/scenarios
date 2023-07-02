/* eslint-disable no-console */
// example https://github.com/supabase/realtime/blob/main/demo/pages/%5B...slug%5D.tsx

"use client";

import React, { useEffect, useState } from "react";
import type { Message } from "ai";
import { useToast } from "@chakra-ui/react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import ScenarioSelector from "./ScenarioSelector.client";
import ScenarioChat from "./ScenarioChat.client";
import { getSupabaseClient } from "../utils/client/supabase";
import { useUserContext } from "../app/providers";

type Props = {
  sessionId: string;
  existing?: {
    scenario?: string;
    messages?: Message[];
  };
  initial: {
    scenarioOptions: string[];
  };
};

type UserPresenceState = {
  userId: string;
  userName: string;
  online_at: string;
  foo: string;
};

export default function GameSession({ sessionId, existing, initial }: Props): React.ReactElement {
  const [scenario, setScenario] = useState(
    existing?.scenario ??
      "" ??
      "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
  );
  const { user, userProfile } = useUserContext();
  const toast = useToast();

  const channelRef = React.useRef<RealtimeChannel>();

  useEffect(() => {
    const prescenceKey = `Session-${sessionId}`;
    const supabase = getSupabaseClient();
    const channelA = supabase.channel("room-1", {
      config: {
        broadcast: {
          // wait for server to acknowledge sent messages before resolving send message promise
          ack: true,
          // dont send own messages to self
          self: false,
        },
        presence: {
          key: prescenceKey,
        },
      },
    });

    channelRef.current = channelA;

    // ! prescence state seems to be readonly after being tracked, need to listen to broadcast or DB events to update state
    channelA
      .on("presence", { event: "sync" }, () => {
        const newState = channelA.presenceState<UserPresenceState>();
        const prescences = newState[prescenceKey];
        const userNames = prescences.map((p) => p.userName);
        console.log("sync", userNames);
        toast({
          title: `SYNC: ${userNames.join(", ")} are here`,
        });
      })
      .on<UserPresenceState>(
        "presence",
        { event: "join" },
        ({ key: sessionPresenceKey, newPresences, currentPresences }) => {
          console.log("join", {
            sessionPresenceKey,
            newPresences,
            currentPresences,
          });
          newPresences.forEach((presence) => {
            toast({
              title: `${presence.userName} joined`,
            });
          });
        },
      )
      .on<UserPresenceState>(
        "presence",
        { event: "leave" },
        ({ key: sessionPresenceKey, leftPresences, currentPresences }) => {
          console.log("leave", { sessionPresenceKey, leftPresences, currentPresences });
          leftPresences.forEach((presence) => {
            toast({
              title: `${presence.userName} left`,
            });
          });
        },
      )
      .subscribe(async (status, error) => {
        // ? when do these fire?
        if (status === "SUBSCRIBED") {
          const presenceTrackStatus = await channelA.track({
            userId: user.id,
            userName: userProfile.user_name,
            online_at: new Date().toISOString(),
            foo: "bar",
          } satisfies UserPresenceState);
          console.log(presenceTrackStatus);
        }
        if (status === "CLOSED") {
          await channelA.untrack();
        }
        if (error || status === "CHANNEL_ERROR") {
          console.error("CHANNEL_ERROR", error);
        }
        if (status === "TIMED_OUT") {
          console.error("TIMED_OUT", error);
        }
      });

    return () => {
      void supabase.removeChannel(channelA);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, []);

  useEffect(() => {
    if (channelRef.current) {
      const prescenceState = channelRef.current.presenceState<UserPresenceState>();

      toast({
        title: `Local name change to ${userProfile.user_name}`,
      });
      channelRef.current.presence.state;

      // todo implement
      console.log("to handle my username change prescenceState", prescenceState);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run once
  }, [userProfile.user_name]);

  if (!scenario) {
    if (!initial.scenarioOptions.length) {
      throw new Error("No initial scenario options provided");
    }
    return (
      <ScenarioSelector
        onScenarioSelected={setScenario}
        initialScenarioOptions={initial.scenarioOptions}
      />
    );
  }

  return <ScenarioChat scenario={scenario} existing={existing} />;
}
