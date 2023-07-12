import type { UseToastOptions } from "@chakra-ui/react";
import type { GetScenariosResponseBody } from "../../app/api/scenarios/route";
import { getSupabaseClient } from "./supabase";
import type { SessionRow } from "../../types";

const APIClient = {
  getScenarios: async (signal?: AbortSignal): Promise<GetScenariosResponseBody> => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return {
      scenarios: [
        "You're an accomplished artist whose work has caught the eye of a wealthy buyer. They offer you a massive sum of money for your art, but they also want to buy all future rights to your work, meaning you can no longer sell or display it under your own name. Do you accept their offer?",
        "You're a successful entrepreneur with a bustling café. A big corporation offers to buy your business for a hefty sum, but they plan to change everything that makes your café special. You could retire comfortably with the money, but you'd be selling out your dream. What do you do?",
        "You're a renowned chef with the opportunity to host a cooking show on a popular network. However, the show's producers want you to use only processed and unhealthy ingredients, contrary to your philosophy of using fresh and organic produce. The show promises fame and fortune, but at the cost of your principles. Do you take the offer?",
      ],
    };

    // todo fetch from server
    const response = await fetch("/api/scenarios", { signal });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json() as Promise<GetScenariosResponseBody>;
  },

  session: {
    async moveToOutcomeSelectionStage({
      scenarioText,
      userIdsThatVotedForScenario,
      sessionId,
    }: {
      scenarioText: string;
      userIdsThatVotedForScenario: string[];
      sessionId: number;
    }): Promise<void | UseToastOptions> {
      const supabase = getSupabaseClient();
      const existingScenarioRequest = await supabase
        .from("scenarios")
        .select("id")
        .eq("text", scenarioText)
        .single();

      if (existingScenarioRequest.data) {
        // scenario already exists
        return;
      }

      if (existingScenarioRequest.error) {
        console.error("Error checking for existing scenario", existingScenarioRequest.error);
        return {
          status: "error",
          title: "Error checking for existing scenario",
          description: existingScenarioRequest.error.message,
        };
      }

      const insertScenarioRequest = await getSupabaseClient().from("scenarios").insert({
        text: scenarioText,
        voted_by_user_ids: userIdsThatVotedForScenario,
      });

      if (insertScenarioRequest.error) {
        console.error("Error inserting scenario", insertScenarioRequest.error);
        return {
          status: "error",
          title: "Error inserting scenario",
          description: insertScenarioRequest.error.message,
        };
      }

      const updateSessionStageRequest = await getSupabaseClient()
        .from("sessions")
        .update({
          stage: "scenario-outcome-selection",
          selected_scenario_text: scenarioText,
          scenario_option_votes: {},
          scenario_outcome_votes: {},
          messaging_locked_by_user_id: null,
        } satisfies Partial<SessionRow>)
        .eq("id", sessionId);

      if (updateSessionStageRequest.error) {
        console.error("Error updating session stage", updateSessionStageRequest.error);
        return {
          status: "error",
          title: "Error updating session stage",
          description: updateSessionStageRequest.error.message,
        };
      }
    },

    async generateNewScenarioOptions(sessionId: number): Promise<void | UseToastOptions> {
      try {
        const { scenarios } = await APIClient.getScenarios();
        // eslint-disable-next-line no-console
        console.log("got new scenarios", scenarios);
        const updateSessionResponse = await getSupabaseClient()
          .from("sessions")
          .update({
            scenario_options: scenarios,
            scenario_option_votes: {},
          })
          .eq("id", sessionId);

        if (updateSessionResponse.error) {
          console.error("Error updating session", updateSessionResponse.error);
          return {
            status: "error",
            title: "Error updating session",
            description: updateSessionResponse.error.message,
          };
        }

        // handle get scenarios errors
      } catch (error) {
        console.error("Error generating new scenario options", error);
        return {
          status: "error",
          title: "Error generating new scenario options",
          description: error instanceof Error ? error.message : String(error),
        };
      }
    },

    async reset(sessionId: number): Promise<void | UseToastOptions> {
      const resetSessionResponse = await getSupabaseClient()
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

      if (resetSessionResponse.error) {
        console.error("Error resetting session", resetSessionResponse.error);
        return {
          status: "error",
          title: "Error resetting session",
          description: resetSessionResponse.error.message,
        };
      }
    },
  },
};

export default APIClient;
