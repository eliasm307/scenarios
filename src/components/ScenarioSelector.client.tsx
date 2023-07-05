/* eslint-disable no-console */

"use client";

import { Badge, Center, HStack, Heading, Spinner, Text, VStack, useToast } from "@chakra-ui/react";
import type { Reducer } from "react";
import { useCallback, useEffect, useReducer, useState } from "react";
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
      data: undefined;
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

    case BroadcastEventName.UserVoted:
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

  useEffect(() => console.log("ScenarioSelector - new sessionState", state), [state]);

  const toast = useToast();

  const broadcastVoteFor = useCallback(
    (optionId: string | null) => {
      console.log("broadcastVoteFor", optionId);
      void channel.send({
        type: REALTIME_LISTEN_TYPES.BROADCAST,
        event: BroadcastEventName.UserVoted,
        data: { userId: currentUser.id, optionId },
      } satisfies BroadcastEvent);
    },
    [channel, currentUser.id],
  );

  const broadcastNewOptions = useCallback(
    async (newOptions: ScenarioOption[]) => {
      const event: BroadcastEvent = {
        type: REALTIME_LISTEN_TYPES.BROADCAST,
        event: BroadcastEventName.NewScenarioOptions,
        data: newOptions,
      };
      send(event);
      // send(event);
      console.log("broadcastNewOptions", event);
      try {
        const result = await channel.send(event);
        console.log("broadcastNewOptions result", result);
      } catch (error) {
        console.error("broadcastNewOptions error", error);
      }
    },
    [channel],
  );

  useEffect(() => {
    Object.values(BroadcastEventName).forEach((event) => {
      channel.on(REALTIME_LISTEN_TYPES.BROADCAST, { event }, send as any);
    });
    channel.subscribe();

    return () => {
      void getSupabaseClient().removeChannel(channel);
    };
  }, [channel]);

  useEffect(() => {
    send({ event: "usersUpdated", data: users });
  }, [users]);

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
        return broadcastNewOptions(scenarios.map(scenarioTextToOption));
      })
      .catch((error) => {
        console.error(error);
        send({ event: "error", data: error instanceof Error ? error.message : error });
      });

    return () => abortController.abort();
  }, [state.resetOptions, broadcastNewOptions]);

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
              onSelect: () => broadcastVoteFor(scenario.id),
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
            onSelect: () => broadcastVoteFor(null),
            isSelected: state.userIdToVotedOptionMap[currentUser.id] === null,
          },
        ]}
      />
    </VStack>
  );
}
