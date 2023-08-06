import type { useDisclosure } from "@chakra-ui/react";
import type { Message } from "ai";
import type { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import type { Database } from "./supabase.ts";

export type ChakraDisclosure = ReturnType<typeof useDisclosure>;

export type SessionUser = {
  id: string;
  /** The user profile name */
  name: string;
  /** The user profile name except when its the current session user it is in the first person ie "I" */
  relativeName: string;
  isCurrentUser: boolean;
  preferredVoiceName?: string;
  preferredVoiceRate?: number;
  isTyping?: boolean;
};

export type BroadcastEventFrom<TAction extends { event: string }> = TAction & {
  type: REALTIME_LISTEN_TYPES.BROADCAST;
};

type ExtendRowData<
  OriginalRowData extends Record<string, unknown>,
  NewRowData extends {
    [key in keyof OriginalRowData]?: OriginalRowData[key];
  },
> = Omit<OriginalRowData, keyof NewRowData> & NewRowData;

export type SessionRow = ExtendRowData<
  Database["public"]["Tables"]["sessions"]["Row"],
  {
    /**
     * @key UserId
     * @key Index (0-based) of the user's vote (where -1 means voting to skip)
     */
    scenario_option_votes: Record<string, number | null | undefined>;
    /**
     * @key UserId
     * @value A map of User IDs to whether the user thinks that user will say yes or no to the scenario
     */
    scenario_outcome_votes: Record<string, Record<string, boolean | undefined> | undefined>;
    stage: "scenario-selection" | "scenario-outcome-selection" | "scenario-outcome-reveal";
  }
>;

export type MessageRow = ExtendRowData<
  Database["public"]["Tables"]["messages"]["Row"],
  {
    author_role: Message["role"];
  }
>;

export type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

export type ScenarioRow = Database["public"]["Tables"]["scenarios"]["Row"];
