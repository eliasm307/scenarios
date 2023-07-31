/* eslint-disable no-console */

"use server";

import "server-only";

import { cookies } from "next/headers";
import type { UseToastOptions } from "@chakra-ui/react";
import { getSupabaseServer } from "./supabase";
import type { SessionRow } from "../../types";
import { isTruthy } from "../general";

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

  let scenarioId = existingScenarioResponse.data[0]?.id;
  if (!existingScenarioResponse.data.length) {
    const insertScenarioResponse = await supabase
      .from("scenarios")
      .insert({
        text: scenarioText,
        voted_by_user_ids: userIdsThatVotedForScenario,
      })
      .select("id");

    if (insertScenarioResponse.error) {
      const title = "Error saving new scenario";
      console.error(title, insertScenarioResponse.error);
      return { status: "error", title, description: insertScenarioResponse.error.message };
    }

    scenarioId = insertScenarioResponse.data[0].id;
  } else {
    // scenario already exists, this should only happen in dev
  }

  // todo handle transition in edge function
  const response = await supabase
    .from("sessions")
    .update({
      stage: "scenario-outcome-selection",
      selected_scenario_text: scenarioText,
      selected_scenario_id: scenarioId,
      scenario_option_votes: {},
      scenario_outcome_votes: {},
      ai_is_responding: false,
    } satisfies Omit<
      SessionRow,
      "id" | "created_at" | "scenario_options" | "selected_scenario_image_path"
    >)
    .eq("id", sessionId);

  if (response.error) {
    const title = "Error updating session stage";
    console.error(title, response.error);
    return { status: "error", title, description: response.error.message };
  }
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
    } satisfies Required<Omit<SessionRow, "id" | "created_at">>)
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
