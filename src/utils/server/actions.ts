/* eslint-disable no-console */

"use server";

import "server-only";

import { cookies } from "next/headers";
import { getSupabaseServer } from "./supabase";
import type { ScenarioRow, SessionRow } from "../../types";
import { generateScenarios } from "./openai";

export async function invokeCreateSessionAction() {
  console.log("createSessionAction invoked");
  const supabase = getSupabaseServer(cookies);

  const sessionResponse = await supabase
    .from("sessions")
    .insert({
      stage: "scenario-selection" as SessionRow["stage"],
      scenario_options: await invokeCreateScenariosAction(),
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

async function invokeCreateScenariosAction() {
  console.log("createScenariosAction invoked");
  const supabase = getSupabaseServer(cookies);

  const { data: exampleScenarioRows, error } = await supabase.rpc("get_example_scenarios_fn");
  if (error) {
    // eslint-disable-next-line no-console
    console.trace(
      `Get example scenarios error: ${error.message} (${error.code}) \nDetails: ${error.details} \nHint: ${error.hint}`,
    );
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw error;
  }

  const exampleScenarios = exampleScenarioRows.map(({ text }: ScenarioRow) => text);

  console.log("createScenarios, exampleScenarios", exampleScenarios);
  return generateScenarios(exampleScenarios);
}
