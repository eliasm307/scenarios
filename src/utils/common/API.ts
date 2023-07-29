/* eslint-disable no-console */
import type { UseToastOptions } from "@chakra-ui/react";
import type { getSupabaseClient } from "../client/supabase";
import type { MessageRow, SessionRow, UserProfileRow } from "../../types";
import type { Database } from "../../types/supabase";

export default class API {
  constructor(protected supabase: ReturnType<typeof getSupabaseClient>) {}

  sessions = {
    moveToOutcomeRevealStage: async (sessionId: number): Promise<void | UseToastOptions> => {
      const response = await this.supabase
        .from("sessions")
        .update({ stage: "scenario-outcome-reveal" } satisfies Partial<SessionRow>)
        .eq("id", sessionId);

      if (response.error) {
        const title = "Error updating session stage";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }
    },

    generateNewScenarioOptions: async (sessionId: number): Promise<void | UseToastOptions> => {
      const response = await this.supabase
        .from("sessions")
        // will trigger a function that generates new scenario options
        .update({ scenario_options: [] } satisfies Partial<SessionRow>)
        .eq("id", sessionId);

      if (response.error) {
        const title = "Error generating new scenario options";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }
    },

    voteForUserOutcome: async (
      config: Database["public"]["Functions"]["vote_for_outcome"]["Args"],
    ): Promise<void | UseToastOptions> => {
      console.log("voteForUserOutcome config", config);
      const result = await this.supabase.rpc("vote_for_outcome", config);
      console.log("voteForUserOutcome result", result);
      if (result.error) {
        const title = "Outcome Voting Error";
        console.error(title, result.error);
        return { status: "error", title, description: result.error.message };
      }
    },

    voteForScenarioOption: async (
      config: Database["public"]["Functions"]["vote_for_option"]["Args"],
    ): Promise<void | UseToastOptions> => {
      const result = await this.supabase.rpc("vote_for_option", config);
      if (result.error) {
        const title = "Scenario Voting Error";
        console.error(title, result.error);
        return { status: "error", title, description: result.error.message };
      }
    },

    lockMessaging: async ({
      sessionId,
      lockedByUserId,
    }: {
      sessionId: number;
      lockedByUserId: string;
    }): Promise<void | UseToastOptions> => {
      const response = await this.supabase
        .from("sessions")
        .update({ messaging_locked_by_user_id: lockedByUserId })
        .eq("id", sessionId);

      if (response.error) {
        const title = "Error locking session";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }
    },

    unlockMessaging: async (sessionId: number): Promise<void | UseToastOptions> => {
      const response = await this.supabase
        .from("sessions")
        .update({ messaging_locked_by_user_id: null })
        .eq("id", sessionId);

      if (response.error) {
        const title = "Error un-locking session";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }
    },
  };

  messages = {
    add: async (
      message: Pick<MessageRow, "author_id" | "author_role" | "content" | "session_id">,
    ): Promise<void | UseToastOptions> => {
      const response = await this.supabase.from("messages").insert([message]);

      if (response.error) {
        const title = "Error adding message";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }
    },
  };

  userProfiles = {
    update: async ({
      userId,
      updates,
    }: {
      userId: string;
      updates: Partial<UserProfileRow>;
    }): Promise<void | UseToastOptions> => {
      const response = await this.supabase
        .from("user_profiles")
        .update(updates)
        .eq("user_id", userId);

      if (response.error) {
        const title = "Error updating user name";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }
    },
  };
}
