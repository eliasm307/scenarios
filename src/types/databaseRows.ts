import type { Database } from "./supabase.d.ts";

type ExtendRowData<
  OriginalRowData extends Record<string, unknown>,
  NewRowData extends {
    [key in keyof OriginalRowData]?: OriginalRowData[key];
  },
> = Omit<OriginalRowData, keyof NewRowData> & NewRowData;

export type SessionRow = ExtendRowData<
  Database["public"]["Tables"]["sessions"]["Row"],
  {
    created_at: string;
    id: number;
    /**
     * @key UserId
     * @key Index (0-based) of the user's vote (where -1 means voting to skip)
     */
    scenario_option_votes: Record<string, number>;
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
    author_role: "system" | "user" | "assistant" | "function";
  }
>;

export type UserProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];

export type ScenarioRow = Database["public"]["Tables"]["scenarios"]["Row"];
