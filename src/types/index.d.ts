import type { useDisclosure } from "@chakra-ui/react";
import type { Message } from "ai";
import type { Database } from "./supabase";

export type ChakraDisclosure = ReturnType<typeof useDisclosure>;

export type SessionUser = {
  id: string;
  name: string;
  joinTimeMs: number;
};

export type BroadcastEventFrom<TAction extends { event: string }> = TAction & {
  type: REALTIME_LISTEN_TYPES.BROADCAST;
};

type ExtendTable<
  OriginalTable extends Record<string, unknown>,
  NewTable extends {
    [key in keyof OriginalTable]: OriginalTable[key];
  },
> = Omit<OriginalTable, keyof NewTable> & NewTable;

export type SessionData = ExtendTable<
  Database["public"]["Tables"]["sessions"]["Row"],
  {
    created_at: string;
    id: number;
    scenario_options: string[];
    /**
     * @key UserId
     * @key Index (0-based) of the user's vote (where -1 means voting to skip)
     */
    scenario_option_votes: Record<string, number>;
    /**
     * @key UserId
     * @value A map of User IDs to whether the user thinks that user will say yes or no to the scenario
     */
    scenario_outcome_votes: Record<string, Record<string, boolean>>;
    stage: "scenario-selection" | "scenario-outcome-selection" | "scenario-outcome-reveal";
  }
>;

export type SessionMessageData = ExtendTable<
  Database["public"]["Tables"]["messages"]["Row"],
  {
    author_role: Message["role"];
  }
>;
