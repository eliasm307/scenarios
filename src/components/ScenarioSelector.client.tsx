/* eslint-disable no-console */

"use client";

import { Badge, Center, HStack, Heading, Spinner, Text, VStack, useToast } from "@chakra-ui/react";
import type { Reducer } from "react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import APIClient from "../utils/client/APIClient";
import type { ChoiceConfig } from "./ChoiceGrid.client";
import ChoiceGrid from "./ChoiceGrid.client";
import type { BroadcastEventFrom, SessionUser } from "../types";
import { getSupabaseClient } from "../utils/client/supabase";

type ScenarioOption = {
  text: string;
  id: string;
};

function scenarioTextToOption(scenarioText: string, id: number): ScenarioOption {
  return {
    id: String(id),
    text: scenarioText,
  };
}

type State = {
  scenarioOptions: ScenarioOption[];
  selectedScenario?: string;
  isLoading: boolean;
  /**
   * Map of user IDs to the option they voted for.
   * If a user has not voted, their ID will not be in this map.
   *
   * @remark A vote for `null` means the user has voted to reset the options.
   */
  userIdToVotedOptionMap: Record<string, string | null>;
  resetOptions: boolean;
  users: SessionUser[];
  currentUser: SessionUser;
};

type Action =
  | {
      event: BroadcastEventName.NewScenarioOptions;
      data: ScenarioOption[];
    }
  | {
      event: "loading";
      data?: undefined;
    }
  | {
      event: BroadcastEventName.UserVoted;
      data?: OptionVotePayload;
    }
  | {
      event: "usersUpdated";
      data: SessionUser[];
    }
  | {
      event: "error";
      data: string;
    }
  | {
      event: BroadcastEventName.RequestLatestSessionState;
      data: { toUserId: string; fromUserId: string };
    }
  | {
      event: BroadcastEventName.LatestSessionState;
      data: {
        toUserId: string;
        sessionData: Pick<
          State,
          "scenarioOptions" | "selectedScenario" | "isLoading" | "userIdToVotedOptionMap"
        >;
      };
    };

type BroadcastEvent = BroadcastEventFrom<Action>;

const reducer: Reducer<State, Action> = (state, action) => {
  console.log("ScenarioSelector reducer", action.event, { state, action });
  switch (action.event) {
    case BroadcastEventName.NewScenarioOptions:
      return {
        ...state,
        scenarioOptions: [...action.data],
        isLoading: false,
        resetOptions: false,
        userIdToVotedOptionMap: {}, // restart voting
      };

    case "loading":
      return {
        ...state,
        isLoading: true,
      };

    case BroadcastEventName.UserVoted: {
      if (!action.data) {
        throw new Error(`Action "${action.event}" data is undefined`);
      }
      const newState = {
        ...state,
        userIdToVotedOptionMap: {
          ...state.userIdToVotedOptionMap,
          [action.data.userId]: action.data.optionId,
        },
      };

      const voteIds = Object.values(newState.userIdToVotedOptionMap);
      const votingComplete = voteIds.length === newState.users.length;
      if (votingComplete) {
        newState.userIdToVotedOptionMap = {}; // dont need this anymore
        const majorityVoteId = getMajorityVoteId(voteIds);
        if (majorityVoteId) {
          console.log("majorityVoteId", majorityVoteId);
          newState.selectedScenario = state.scenarioOptions.find(
            (option) => option.id === majorityVoteId,
          )!.text;
        } else {
          // the oldest session user has the responsibility of regenerating the options
          const oldestUser = newState.users[0];
          console.log("no winning vote", oldestUser.name, "will reset options");
          newState.resetOptions = state.currentUser.id === oldestUser.id;
          newState.isLoading = true;
        }
      }

      return newState;
    }

    case BroadcastEventName.RequestLatestSessionState: {
      return state;
    }

    case BroadcastEventName.LatestSessionState: {
      // refreshing all users with the latest state
      return { ...state, ...action.data.sessionData };
    }

    case "usersUpdated":
      return {
        ...state,
        users: action.data,
      };

    case "error":
      // todo improve error handling
      throw Error(action.data);

    default:
      return state;
  }
};

function getMajorityVoteId<T>(arr: T[]): T | null {
  const itemToOccurrenceCountMap = arr.reduce((acc, item) => {
    const count = acc.get(item) ?? 0;
    acc.set(item, count + 1);
    return acc;
  }, new Map<T, number>());

  const maxItemEntry = [...itemToOccurrenceCountMap.entries()].reduce((entryA, entryB) => {
    return (entryB[1] > entryA[1] ? entryB : entryA) as [T, number];
  })[0];

  const maxCounts = [...itemToOccurrenceCountMap.values()].filter(
    (count) => count === itemToOccurrenceCountMap.get(maxItemEntry),
  );

  if (maxCounts.length > 1) {
    // There are multiple items with the same max count, so there is no most frequent item
    return null;
  }

  return maxItemEntry as T;
}

enum BroadcastEventName {
  UserVoted = "UserVoted",
  NewScenarioOptions = "NewOptions",
  RequestLatestSessionState = "RequestLatestSessionState",
  LatestSessionState = "LatestSessionState",
}

type OptionVotePayload = {
  userId: string;
  /**
   * @remark A vote for `null` means the user has voted to reset the options.
   */
  optionId: string | null;
};

type Props = {
  onScenarioSelected: (scenario: string) => void;
  initialScenarioOptions: string[];
  users: SessionUser[];
  currentUser: SessionUser;
  sessionId: string;
};

export default function ScenarioSelector({
  onScenarioSelected,
  initialScenarioOptions,
  sessionId,
  users,
  currentUser,
}: Props): React.ReactElement {
  const toast = useToast();
  const [channel] = useState(() => {
    const sessionKey = `Session-${sessionId}-voting`;
    const supabase = getSupabaseClient();
    const channels = supabase.getChannels();
    if (channels.length) {
      console.log(
        "ScenarioSelector channels",
        channels.map((c) => c.topic),
      );
    }
    return supabase.channel(sessionKey, {
      config: {
        broadcast: {
          // wait for server to acknowledge sent messages before resolving send message promise
          ack: true,
          // send own messages to self
          self: true,
        },
        // presence: {
        //   key: sessionKey,
        // },
      },
    });
  });

  const [state, send] = useReducer(
    reducer,
    null,
    () =>
      ({
        scenarioOptions: initialScenarioOptions.map(scenarioTextToOption),
        users,
        userIdToVotedOptionMap: {},
        isLoading: !initialScenarioOptions.length,
        resetOptions: !initialScenarioOptions.length,
        currentUser,
      } satisfies State),
  );
  const stateRef = useRef(state);
  useEffect(() => {
    console.log("ScenarioSelector - new sessionState", state);
    stateRef.current = state;
  }, [state]);

  const broadcast = useCallback(
    async (action: Action) => {
      console.log("ScenarioSelector:send broadcast", action.event, action.data);
      if (action.event === BroadcastEventName.NewScenarioOptions) {
        send(action); // early update
      }
      try {
        const result = await channel.send({
          ...action,
          type: REALTIME_LISTEN_TYPES.BROADCAST,
        } satisfies BroadcastEvent);
        console.log(action.event, "broadcast result", result);
      } catch (error) {
        console.error("broadcastNewOptions error", error);
      }
    },
    [channel],
  );

  useEffect(() => {
    function handleBroadcastMessage(message: BroadcastEvent) {
      console.log("ScenarioSelector:handleBroadcastMessage", message.event, message.data);
      if (
        message.event === BroadcastEventName.RequestLatestSessionState &&
        message.data.toUserId === stateRef.current.currentUser.id
      ) {
        return new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
          return broadcast({
            event: BroadcastEventName.LatestSessionState,
            data: {
              toUserId: message.data.fromUserId,
              sessionData: {
                isLoading: stateRef.current.isLoading,
                scenarioOptions: stateRef.current.scenarioOptions,
                selectedScenario: stateRef.current.selectedScenario,
                userIdToVotedOptionMap: stateRef.current.userIdToVotedOptionMap,
              },
            },
          });
        });
      }
      console.log(
        "ScenarioSelector:handleBroadcastMessage - ignoring message",
        message.event,
        message.data,
        {},
      );

      send(message);
    }
    Object.values(BroadcastEventName).forEach((event) => {
      channel.on(REALTIME_LISTEN_TYPES.BROADCAST, { event }, handleBroadcastMessage as any);
    });
    channel.subscribe();

    return () => {
      void getSupabaseClient().removeChannel(channel);
    };
  }, [channel]);

  useEffect(() => {
    if (state.users.length < 2) {
      console.log("ScenarioSelector - not enough users to refresh state");
      return;
    }
    void new Promise((resolve) => setTimeout(resolve, 1000)).then(() => {
      const otherUser = stateRef.current.users.find(
        (user) => user.id !== stateRef.current.currentUser.id,
      );
      if (!otherUser) {
        console.log("ScenarioSelector - no other user to refresh state");
        return;
      }
      return broadcast({
        event: BroadcastEventName.RequestLatestSessionState,
        data: { fromUserId: stateRef.current.currentUser.id, toUserId: otherUser.id },
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run on mount to sync state
  }, [state.users]);

  useEffect(() => {
    if (users !== state.users) {
      send({ event: "usersUpdated", data: users });
    }
  }, [users, state.users]);

  useEffect(() => {
    if (state.selectedScenario) {
      toast({ title: "The group has voted for a scenario!" });
      onScenarioSelected(state.selectedScenario);
    }
  }, [onScenarioSelected, state.selectedScenario, toast]);

  useEffect(() => {
    if (!state.resetOptions) {
      return;
    }

    console.log("regenerating options");
    const abortController = new AbortController();
    send({ event: "loading" });
    // todo handle error
    void APIClient.getScenarios(abortController.signal)
      .then(({ scenarios }) => {
        console.log("got scenarios", scenarios);
        return broadcast({
          event: BroadcastEventName.NewScenarioOptions,
          data: scenarios.map(scenarioTextToOption),
        });
      })
      .catch((error) => {
        console.error(error);
        send({ event: "error", data: error instanceof Error ? error.message : error });
      });

    return () => abortController.abort();
  }, [state.resetOptions, broadcast]);

  if (state.isLoading || !state.users.length) {
    return (
      <Center as='section' height='100%'>
        <Spinner />
      </Center>
    );
  }

  return (
    <VStack as='section' m={3}>
      <Heading textAlign='center'>Vote for a Scenario to Play!</Heading>
      <HStack>
        <span>Waiting to vote: </span>
        {state.users
          .filter((user) => {
            const hasNotVoted = typeof state.userIdToVotedOptionMap[user.id] === "undefined";
            return hasNotVoted;
          })
          .map((user) => (
            <Badge key={user.id} colorScheme={user.id === state.currentUser.id ? "green" : "gray"}>
              {user.name}
            </Badge>
          ))}
      </HStack>
      <ChoiceGrid
        choices={[
          ...state.scenarioOptions.map(
            (scenario): ChoiceConfig => ({
              ...scenario,
              id: scenario.id,
              onSelect: () =>
                broadcast({
                  event: BroadcastEventName.UserVoted,
                  data: { userId: currentUser.id, optionId: scenario.id },
                }),
              isSelected: state.userIdToVotedOptionMap[currentUser.id] === scenario.id,
              // todo make into component
              content: (
                <VStack>
                  <HStack>
                    {state.users
                      .filter((user) => {
                        const hasVoted = state.userIdToVotedOptionMap[user.id] === scenario.id;
                        return hasVoted;
                      })
                      .map((user) => (
                        <Badge
                          key={user.id}
                          colorScheme={user.id === state.currentUser.id ? "green" : "gray"}
                        >
                          {user.name}
                        </Badge>
                      ))}
                  </HStack>
                  <Text align='center' marginTop='auto' display='block'>
                    {scenario.text}
                  </Text>
                </VStack>
              ),
            }),
          ),
          {
            id: "re-generate",
            text: "🆕 Vote to generate new scenarios",
            content: (
              <VStack>
                <HStack>
                  {state.users
                    .filter((user) => {
                      const hasVoted = state.userIdToVotedOptionMap[user.id] === null;
                      return hasVoted;
                    })
                    .map((user) => (
                      <Badge
                        key={user.id}
                        colorScheme={user.id === state.currentUser.id ? "green" : "gray"}
                      >
                        {user.name}
                      </Badge>
                    ))}
                </HStack>
                <Text align='center' marginTop='auto' display='block'>
                  🆕 Vote to generate new scenarios
                </Text>
              </VStack>
            ),
            onSelect: () =>
              broadcast({
                event: BroadcastEventName.UserVoted,
                data: { userId: currentUser.id, optionId: null },
              }),
            isSelected: state.userIdToVotedOptionMap[currentUser.id] === null,
          },
        ]}
      />
    </VStack>
  );
}
