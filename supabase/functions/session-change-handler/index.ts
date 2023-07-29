/* eslint-disable functional-core/purity */
/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-console */
// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// handling secrets: https://supabase.com/docs/guides/functions/secrets
// see https://supabase.com/docs/guides/functions/auth
// structuring: https://supabase.com/docs/guides/functions/quickstart#organizing-your-edge-functions

// eslint-disable-next-line import/no-unresolved
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import type { SessionRow, ScenarioRow } from "../../../src/types/databaseRows.ts";
import { createScenarioImagePrompt, generateScenariosStream } from "../_utils/openai.ts";
import { supabaseAdminClient } from "../_utils/supabase.ts";
import { generateImageFromPrompt } from "../_utils/huggingFace.ts";

// eslint-disable-next-line no-console
console.log("Hello from Functions!");

interface WebhookPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: SessionRow;
  schema: "public";
  old_record: null | SessionRow;
}

serve(async (req) => {
  try {
    const payload: WebhookPayload = await req.json();
    console.log("handling event payload", payload);

    if (
      req.headers.get("Authorization") !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
    ) {
      console.log("unauthorized");
      return new Response(JSON.stringify({ message: "unauthorized" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      });
    }

    const newSessionRow = payload.record;
    if (!newSessionRow.scenario_options?.length) {
      console.log("no scenarios, generating new ones");
      await generateNewSessionScenarios(newSessionRow.id);

      // make sure scenario image is loaded in outcome selection stage
    } else if (
      newSessionRow.stage === "scenario-outcome-selection" &&
      !newSessionRow.selected_scenario_image_path
    ) {
      console.log("no scenario image, generating new one");
      if (!newSessionRow.selected_scenario_id) {
        throw new Error("selected_scenario_id is null");
      }
      if (!newSessionRow.selected_scenario_text) {
        throw new Error("selected_scenario_text is null");
      }
      await generateScenarioImage({
        id: newSessionRow.selected_scenario_id,
        text: newSessionRow.selected_scenario_text,
      });

      // no known action to take
    } else {
      console.log("nothing to do");
    }

    console.log("done");
    return new Response(JSON.stringify({ message: "ok" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("general webhook error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    });
  }
});

async function generateScenarioImage(scenario: { id: number; text: string }) {
  const imagePrompt = await createScenarioImagePrompt(scenario.text);
  const imageBlob = await generateImageFromPrompt(imagePrompt);

  const uploadImageResponse = await supabaseAdminClient.storage
    .from("images")
    .upload(`scenario_images/${scenario.id}.jpeg`, imageBlob, {
      upsert: false,
      contentType: imageBlob.type,
    });

  if (uploadImageResponse.error) {
    console.error(
      `Upload image error: ${uploadImageResponse.error.message} (${uploadImageResponse.error.name}) \nCause: ${uploadImageResponse.error.cause} \nStack: ${uploadImageResponse.error.stack}`,
    );
    throw uploadImageResponse.error;
  }
  console.log("uploadImageResponse", uploadImageResponse);

  const imagePath = uploadImageResponse.data.path;
  console.log("imagePath", imagePath);

  await Promise.all([
    supabaseAdminClient
      .from("sessions")
      .update({ selected_scenario_image_path: imagePath })
      .eq("selected_scenario_id", scenario.id)
      .then((response) => {
        if (response.error) {
          console.error(
            `Update session scenario image url error: ${response.error.message} (${response.error.code}) \nDetails: ${response.error.details} \nHint: ${response.error.hint}`,
          );
          throw response.error;
        }
        console.log("update session scenario image url response", response);
      }),
    supabaseAdminClient
      .from("scenarios")
      .update({ image_path: imagePath, image_prompt: imagePrompt })
      .eq("id", scenario.id)
      .then((response) => {
        if (response.error) {
          console.error(
            `Update scenario image url error: ${response.error.message} (${response.error.code}) \nDetails: ${response.error.details} \nHint: ${response.error.hint}`,
          );
          throw response.error;
        }
        console.log("update scenario image url response", response);
      }),
  ]);
}

async function generateNewSessionScenarios(sessionId: number) {
  const { data: exampleScenarioRows, error } = await supabaseAdminClient.rpc(
    "get_example_scenarios_fn",
  );
  if (error) {
    console.error(
      `Get example scenarios error: ${error.message} (${error.code}) \nDetails: ${error.details} \nHint: ${error.hint}`,
    );
    throw error;
  }
  const exampleScenarios = exampleScenarioRows.map(({ text }: ScenarioRow) => text);
  console.log("exampleScenarios", exampleScenarios);

  console.log("generating scenarios");
  const newScenariosStream = await generateScenariosStream(exampleScenarios);
  console.log("newScenariosStream", newScenariosStream);

  let newScenarios: string[] = [];

  console.log("creating session update interval");
  let count = 1;
  const intervalId = setInterval(async () => {
    console.log("session update interval call", count++);
    await updateSessionScenarioOptions({ sessionId, newScenarios });
  }, 100);

  console.log("starting scenarios stream");
  for await (const scenarios of newScenariosStream) {
    newScenarios = scenarios;
  }
  clearInterval(intervalId);
  console.log("scenarios stream ended, new scenarios", JSON.stringify(newScenarios, null, 2));

  // make sure we are up to date
  // ! not providing a way for UI to know when this is done, assuming users will wait for scenarios to finishing generating
  await updateSessionScenarioOptions({ sessionId, newScenarios });
  console.log("newScenarios", newScenarios);
}

async function updateSessionScenarioOptions({
  sessionId,
  newScenarios,
}: {
  sessionId: number;
  newScenarios: string[];
}) {
  const updateSessionResponse = await supabaseAdminClient
    .from("sessions")
    .update({ scenario_options: newScenarios, scenario_option_votes: {} })
    .match({ id: sessionId });

  if (updateSessionResponse.error) {
    // eslint-disable-next-line no-console
    console.error(
      `Update session error: ${updateSessionResponse.error.message} (${updateSessionResponse.error.code}) \nDetails: ${updateSessionResponse.error.details} \nHint: ${updateSessionResponse.error.hint}`,
    );
    // eslint-disable-next-line @typescript-eslint/no-throw-literal
    throw updateSessionResponse.error;
  }
}

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
