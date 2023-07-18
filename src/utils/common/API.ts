/* eslint-disable no-console */
import type { UseToastOptions } from "@chakra-ui/react";
import type { getSupabaseClient } from "../client/supabase";
import type { GetScenariosResponseBody } from "../../app/api/scenarios/route";
import type { MessageRow, SessionRow } from "../../types";
import type { Database } from "../../types/supabase";

export default class API {
  constructor(protected supabase: ReturnType<typeof getSupabaseClient>) {}

  ai = {
    createScenarios: async (signal?: AbortSignal): Promise<string[]> => {
      // await new Promise((resolve) => setTimeout(resolve, 2000));
      // return {
      //   scenarios: [
      //     "You're an accomplished artist whose work has caught the eye of a wealthy buyer. They offer you a massive sum of money for your art, but they also want to buy all future rights to your work, meaning you can no longer sell or display it under your own name. Do you accept their offer?",
      //     "You're a successful entrepreneur with a bustling café. A big corporation offers to buy your business for a hefty sum, but they plan to change everything that makes your café special. You could retire comfortably with the money, but you'd be selling out your dream. What do you do?",
      //     "You're a renowned chef with the opportunity to host a cooking show on a popular network. However, the show's producers want you to use only processed and unhealthy ingredients, contrary to your philosophy of using fresh and organic produce. The show promises fame and fortune, but at the cost of your principles. Do you take the offer?",
      //   ],
      // };

      const response = await fetch("/api/scenarios", { signal });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const data: GetScenariosResponseBody = await response.json();
      return data.scenarios;
    },
  };

  sessions = {
    moveToOutcomeSelectionStage: async ({
      scenarioText,
      userIdsThatVotedForScenario,
      sessionId,
    }: {
      scenarioText: string;
      userIdsThatVotedForScenario: string[];
      sessionId: number;
    }): Promise<void | UseToastOptions> => {
      const { supabase } = this;
      const existingScenarioResponse = await supabase
        .from("scenarios")
        .select("id")
        .eq("text", scenarioText);

      console.log("existingScenarioResponse", existingScenarioResponse);

      if (existingScenarioResponse.error) {
        const title = "Error checking for existing scenario";
        console.error(title, existingScenarioResponse.error);
        return { status: "error", title, description: existingScenarioResponse.error.message };
      }

      if (!existingScenarioResponse.data.length) {
        const insertScenarioResponse = await this.supabase.from("scenarios").insert({
          text: scenarioText,
          voted_by_user_ids: userIdsThatVotedForScenario,
        });

        if (insertScenarioResponse.error) {
          const title = "Error saving new scenario";
          console.error(title, insertScenarioResponse.error);
          return { status: "error", title, description: insertScenarioResponse.error.message };
        }
      } else {
        // scenario already exists, this should only happen in dev
      }

      const response = await this.supabase
        .from("sessions")
        .update({
          stage: "scenario-outcome-selection",
          selected_scenario_text: scenarioText,
          scenario_option_votes: {},
          scenario_outcome_votes: {},
          messaging_locked_by_user_id: null,
        } satisfies Partial<SessionRow>)
        .eq("id", sessionId);

      if (response.error) {
        const title = "Error updating session stage";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }
    },

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

    voteForUserOutcome: async (
      config: Database["public"]["Functions"]["vote_for_outcome"]["Args"],
    ): Promise<void | UseToastOptions> => {
      const result = await this.supabase.rpc("vote_for_outcome", config);
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

    generateNewScenarioOptions: async (sessionId: number): Promise<void | UseToastOptions> => {
      try {
        const scenarios = await this.ai.createScenarios();
        const response = await this.supabase
          .from("sessions")
          .update({
            scenario_options: scenarios,
            scenario_option_votes: {},
          })
          .eq("id", sessionId);

        if (response.error) {
          const title = "Error updating session";
          console.error(title, response.error);
          return { status: "error", title, description: response.error.message };
        }

        // handle get scenarios errors
      } catch (error) {
        const title = "Error generating new scenario options";
        console.error(title, error);
        return {
          status: "error",
          title,
          description: error instanceof Error ? error.message : String(error),
        };
      }
    },

    reset: async (sessionId: number): Promise<void | UseToastOptions> => {
      let response = await this.supabase
        .from("sessions")
        .update({
          stage: "scenario-selection",
          messaging_locked_by_user_id: null,
          scenario_option_votes: {},
          scenario_options: [],
          scenario_outcome_votes: {},
          selected_scenario_text: null,
        } satisfies Omit<SessionRow, "id" | "created_at">)
        .eq("id", sessionId);

      if (response.error) {
        const title = "Error resetting session";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }

      const [scenario_options] = await Promise.all([
        this.ai.createScenarios(),
        this.messages.clearForScenario(sessionId),
      ]);

      response = await this.supabase
        .from("sessions")
        .update({
          scenario_options,
        } satisfies Partial<SessionRow>)
        .eq("id", sessionId);

      if (response.error) {
        const title = "Error generating new scenarios session";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
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
    clearForScenario: async (sessionId: number): Promise<void | UseToastOptions> => {
      const response = await this.supabase.from("messages").delete().eq("session_id", sessionId);

      if (response.error) {
        const title = "Error clearing messages";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }
    },
  };

  userProfiles = {
    update: async ({
      newName,
      userId,
    }: {
      newName: string;
      userId: string;
    }): Promise<void | UseToastOptions> => {
      const response = await this.supabase
        .from("user_profiles")
        .update({ user_name: newName })
        .eq("user_id", userId);

      if (response.error) {
        const title = "Error updating user name";
        console.error(title, response.error);
        return { status: "error", title, description: response.error.message };
      }
    },
  };
}
