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
  isLoading: boolean;
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
  users: SessionUser[];
  currentUser: SessionUser;
  /**
   * The index of the scenario option voted for by the current user.
   * If the current user has not voted, this will be `null`.
   * If the current user has voted to reset the options, this will be `-1`.
   */
  voteId: number | null;
  selectedOptionId: number;
  scenarioOptions: string[];
};

export default function ScenarioSelector({
  selectedOptionId: sessionId,
  users,
  currentUser,
  scenarioOptions,
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
  const [state, send] = useReducer(reducer, null, {} as State);

  useEffect(() => {
    // if (!state.resetOptions) {
    //   return;
    // }

    console.log("regenerating options");
    const abortController = new AbortController();
    // send({ event: "loading" });
    // todo handle error

    return () => abortController.abort();
  }, []);

  const handleVote = useCallback(async (optionId: number) => {
    // todo check if this is the deciding vote and if so perform relevant session updates e.g. regenerating scenario options or moving the session to the next stage
    const isDecidingVote = false;
    if (!isDecidingVote) {
      await getSupabaseClient().rpc("vote_for_option", {
        user_id: currentUser.id,
        option_id: optionId,
        session_id: sessionId,
      });
      return;
    }
    if (isTie || groupVotedForNewOptions) {
      void APIClient.getScenarios()
        .then(({ scenarios }) => {
          console.log("got scenarios", scenarios);
          return getSupabaseClient().from("sessions").update({ scenario_options: scenarios });
        })
        .catch((error) => {
          console.error(error);
          // send({ event: "error", data: error instanceof Error ? error.message : error });
        });
      return;
    }
    if (winningVoteId) {
      const userVotesForWinningScenario = [""];
      const winningScenario = scenarioOptions[winningVoteId];
      const { data: newScenario } = await getSupabaseClient()
        .from("scenarios")
        .insert({ text: winningScenario, voted_by_user_ids: userVotesForWinningScenario })
        .select("id")
        .single();

      if (!newScenario) {
        throw Error("no new scenario");
      }

      await getSupabaseClient()
        .from("sessions")
        .update({ selected_scenario_id: newScenario.id })
        .eq("id", sessionId);
      return;
    }
  }, []);

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
        {users
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
          ...scenarioOptions.map(
            (text, optionId): ChoiceConfig => ({
              id: optionId,
              text,
              onSelect: () => handleVote(optionId),
              isSelected: state.userIdToVotedOptionMap[currentUser.id] === optionId,
              // todo make into component
              content: (
                <VStack>
                  <HStack>
                    {users
                      .filter((user) => {
                        const hasVoted = state.userIdToVotedOptionMap[user.id] === optionId;
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
                    {text}
                  </Text>
                </VStack>
              ),
            }),
          ),
          {
            id: -1,
            text: "🆕 Vote to generate new scenarios",
            content: (
              <VStack>
                <HStack>
                  {users
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
            onSelect: () => handleVote(-1),
            isSelected: state.userIdToVotedOptionMap[currentUser.id] === null,
          },
        ]}
      />
    </VStack>
  );
}
