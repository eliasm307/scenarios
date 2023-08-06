/* eslint-disable no-console */

"use server";

import "server-only";

import { cookies } from "next/headers";
import type { UseToastOptions } from "@chakra-ui/react";
import { getSupabaseServer } from "./supabase";
import type { ScenarioRow, SessionRow } from "../../types";
import { parseUserRatingKey, isTruthy } from "../general";

type SupabaseClient = ReturnType<typeof getSupabaseServer>;

export async function invokeCreateSessionAction() {
  console.log("createSessionAction invoked");
  const supabase = getSupabaseServer(cookies);

  const sessionResponse = await supabase
    .from("sessions")
    .insert({
      stage: "scenario-selection" as SessionRow["stage"],
      scenario_options: [], // will trigger new scenario options to be generated
      // scenario_options: [
      //   "You discover a magical book that can grant any wish, but each wish shortens your life by five years. Would you use the book?",
      //   "You're a scientist who has discovered a cure for a rare, deadly disease. However, the cure involves a procedure that is considered highly unethical. Do you proceed to save lives?",
      //   "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
      // ],
    })
    .select()
    .single();

  if (sessionResponse.error) {
    throw new Error(`Create session error: ${sessionResponse.error.message}`);
  }

  console.log("createSessionAction, sessionResponse", sessionResponse.data);
  return sessionResponse.data as SessionRow;
}

export async function invokeResetSessionAction(
  sessionId: number,
): Promise<undefined | UseToastOptions[]> {
  console.log("resetSessionAction invoked");
  // todo handle transition in edge function
  const supabase = getSupabaseServer(cookies);
  const errors = await Promise.all([
    resetSessionRow({ supabase, sessionId }),
    deleteAllScenarioMessages({ supabase, sessionId }),
  ]);
  return errors.filter(isTruthy);
}

export async function invokeMoveSessionToOutcomeSelectionStageAction({
  scenarioText,
  userIdsThatVotedForScenario,
  sessionId,
}: {
  scenarioText: string;
  userIdsThatVotedForScenario: string[];
  sessionId: number;
}): Promise<undefined | UseToastOptions> {
  console.log("moveToOutcomeSelectionStage invoked");
  const supabase = getSupabaseServer(cookies);
  const errorConfig = await saveSessionScenarioOptionRatings(sessionId);
  if (errorConfig) {
    return errorConfig;
  }

  const existingScenarioResponse = await supabase
    .from("scenarios")
    .select("id, rating")
    .eq("text", scenarioText)
    .single();

  if (existingScenarioResponse.error) {
    const title = "Error checking for existing scenario";
    console.error(title, existingScenarioResponse.error);
    return { status: "error", title, description: existingScenarioResponse.error.message };
  }

  const existingScenario = existingScenarioResponse.data;
  const upsertScenarioResponse = await supabase
    .from("scenarios")
    .upsert(
      {
        text: scenarioText,
        voted_by_user_ids: userIdsThatVotedForScenario,
        // if a user has rated this scenario positively AND voted for it then it means its really good so we count that as 2 votes
        rating: (existingScenario?.rating ?? 0) + userIdsThatVotedForScenario.length,
      },
      { onConflict: "text" },
    )
    .select("id")
    .single();

  if (upsertScenarioResponse.error) {
    const title = "Error saving new scenario";
    console.error(title, upsertScenarioResponse.error);
    return { status: "error", title, description: upsertScenarioResponse.error.message };
  }

  // let scenarioId = existingScenario?.id;
  // if (existingScenario) {
  //   const updateScenarioResponse = await supabase
  //     .from("scenarios")
  //     .update({
  //       voted_by_user_ids: userIdsThatVotedForScenario,
  //       // if a user has rated this scenario positively AND voted for it then it means its really good so we count that as 2 votes
  //       rating: existingScenario.rating + userIdsThatVotedForScenario.length,
  //     })
  //     .eq("id", existingScenario.id);

  //   if (updateScenarioResponse.error) {
  //     const title = "Error updating scenario";
  //     console.error(title, updateScenarioResponse.error);
  //     return { status: "error", title, description: updateScenarioResponse.error.message };
  //   }

  //   // no existing scenario found, create a new one
  // } else {
  //   const insertScenarioResponse = await supabase
  //     .from("scenarios")
  //     .insert({
  //       text: scenarioText,
  //       voted_by_user_ids: userIdsThatVotedForScenario,
  //       rating: userIdsThatVotedForScenario.length,
  //     })
  //     .select("id")
  //     .single();

  //   if (insertScenarioResponse.error) {
  //     const title = "Error saving new scenario";
  //     console.error(title, insertScenarioResponse.error);
  //     return { status: "error", title, description: insertScenarioResponse.error.message };
  //   }

  //   scenarioId = insertScenarioResponse.data.id;
  // }

  const response = await supabase
    .from("sessions")
    .update({
      stage: "scenario-outcome-selection",
      selected_scenario_text: scenarioText,
      selected_scenario_id: upsertScenarioResponse.data.id,
      scenario_option_votes: {},
      scenario_outcome_votes: {},
      ai_is_responding: false,
    } satisfies Omit<
      SessionRow,
      | "id"
      | "created_at"
      | "scenario_options"
      | "selected_scenario_image_path"
      | "scenario_options_ai_author_model_id"
    >)
    .eq("id", sessionId);

  if (response.error) {
    const title = "Error updating session stage";
    console.error(title, response.error);
    return { status: "error", title, description: response.error.message };
  }
}

export async function invokeGenerateNewScenarioOptions(
  sessionId: number,
): Promise<void | UseToastOptions> {
  console.log("generateNewScenarioOptions invoked");
  const supabase = getSupabaseServer(cookies);

  // if all vote for new scenarios was unanimous then not taking this as every user saying they didnt like the given scenarios
  // as there could be other reasons for this, e.g. they are good scenarios but too similar to something done recently etc
  const errorConfig = await saveSessionScenarioOptionRatings(sessionId);
  if (errorConfig) {
    return errorConfig;
  }

  const response = await supabase
    .from("sessions")
    // will trigger a function that generates new scenario options
    .update({
      scenario_options: [],
      scenario_option_votes: {},
      ai_is_responding: false,
      scenario_options_ai_author_model_id: null,
    } satisfies Omit<
      SessionRow,
      | "id"
      | "stage"
      | "created_at"
      | "scenario_outcome_votes"
      | "selected_scenario_id"
      | "selected_scenario_image_path"
      | "selected_scenario_text"
    >)
    .eq("id", sessionId);

  if (response.error) {
    const title = "Error triggering new scenario options generation";
    console.error(title, response.error);
    return { status: "error", title, description: response.error.message };
  }
}

async function saveSessionScenarioOptionRatings(
  sessionId: number,
): Promise<undefined | UseToastOptions> {
  console.log("saveSessionScenarioOptionRatings invoked");
  const supabase = getSupabaseServer(cookies);
  const sessionResponse = await supabase
    .from("sessions")
    .select("scenario_option_votes, scenario_options")
    .eq("id", sessionId)
    .single();

  if (sessionResponse.error) {
    const title = "Error fetching session";
    console.error(title, sessionResponse.error);
    return { status: "error", title, description: sessionResponse.error.message };
  }

  const session = sessionResponse.data;

  const optionVotes = session.scenario_option_votes;
  if (!optionVotes) {
    const title = `Scenario option votes not found for session ${sessionId}`;
    console.error(title);
    return { status: "error", title };
  }

  const scenarioOptions = session.scenario_options;
  if (!scenarioOptions) {
    const title = `Scenario options not found for session ${sessionId}`;
    console.error(title);
    return { status: "error", title };
  }

  console.log("parsing ratings from option votes:", JSON.stringify(optionVotes, null, 2));
  const scenarioRowsWithRatingsMap = Object.entries(optionVotes)
    .map(([key, value]) => {
      const userRatingKey = parseUserRatingKey(key);
      return (
        userRatingKey && {
          ...userRatingKey,
          value,
        }
      );
    })
    .filter(isTruthy)
    .reduce<
      Record<
        string,
        Pick<ScenarioRow, "rating" | "text" | "liked_by_user_ids" | "disliked_by_user_ids">
      >
    >((partialScenarioRows, rating) => {
      console.log("reducing rating:", JSON.stringify(rating, null, 2));
      const scenarioRow = partialScenarioRows[rating.forScenarioOptionIndex] ?? {
        text: scenarioOptions[rating.forScenarioOptionIndex],
        rating: 0,
        disliked_by_user_ids: [],
        liked_by_user_ids: [],
      };

      scenarioRow.rating += rating.value;

      // NOTE: not using if else incase we have other numbers to represent other things in the future
      const isPositiveRating = rating.value === 1;
      if (isPositiveRating) {
        scenarioRow.liked_by_user_ids.push(rating.byUserId);
      }

      const isNegativeRating = rating.value === -1;
      if (isNegativeRating) {
        scenarioRow.disliked_by_user_ids.push(rating.byUserId);
      }

      partialScenarioRows[rating.forScenarioOptionIndex] = scenarioRow;

      return partialScenarioRows;
    }, {});

  const scenarioRowsWithRatings = Object.values(scenarioRowsWithRatingsMap);
  console.log("parsed scenarioRowsWithRatings", JSON.stringify(scenarioRowsWithRatings));

  console.log("saving scenarioRowsWithRatings:");
  const upsertScenariosWithRatingsResponse = await supabase
    .from("scenarios")
    .upsert(scenarioRowsWithRatings, { onConflict: "text" })
    .select("id");

  if (upsertScenariosWithRatingsResponse.error) {
    const title = `Error saving ratings for scenario option`;
    console.error(
      title,
      upsertScenariosWithRatingsResponse.error,
      `\nScenarioRowData: ${JSON.stringify(scenarioRowsWithRatings, null, 2)}`,
    );
    return {
      status: "error",
      title,
      description: upsertScenariosWithRatingsResponse.error.message,
    };
  }
  console.log(
    `Saved ${scenarioRowsWithRatings.length} scenario option rating(s) for session ${sessionId}`,
  );
}

async function resetSessionRow({
  supabase,
  sessionId,
}: {
  sessionId: number;
  supabase: SupabaseClient;
}): Promise<UseToastOptions | undefined> {
  // todo handle transition in edge function
  const response = await supabase
    .from("sessions")
    .update({
      stage: "scenario-selection",
      scenario_option_votes: {},
      scenario_options: [], // will trigger new scenario options to be generated
      scenario_outcome_votes: {},
      selected_scenario_text: null,
      selected_scenario_image_path: null,
      selected_scenario_id: null,
      ai_is_responding: false,
    } satisfies Required<
      Omit<SessionRow, "id" | "created_at" | "scenario_options_ai_author_model_id">
    >)
    .eq("id", sessionId);

  if (response.error) {
    const title = "Error resetting session";
    console.error(title, response.error);
    return { status: "error", title, description: response.error.message };
  }
}

async function deleteAllScenarioMessages({
  supabase,
  sessionId,
}: {
  sessionId: number;
  supabase: SupabaseClient;
}): Promise<UseToastOptions | undefined> {
  const response = await supabase.from("messages").delete().eq("session_id", sessionId);

  if (response.error) {
    const title = "Error clearing messages";
    console.error(title, response.error);
    return { status: "error", title, description: response.error.message };
  }
}
