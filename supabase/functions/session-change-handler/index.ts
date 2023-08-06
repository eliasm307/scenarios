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

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { SessionRow, ScenarioRow } from "../../../src/types/databaseRows.ts";
import { isRequestAuthorised, supabaseAdminClient } from "../_utils/supabase.ts";
import type { GenericWebhookPayload } from "../_utils/types.ts";
import { createImageFromPrompt } from "../_utils/huggingFace.ts";
import { createScenariosStream } from "../_utils/openai/createScenarios.ts";
import { createScenarioImagePrompt } from "../_utils/openai/createScenarioImagePrompt.ts";
import { streamAndPersist } from "../_utils/general.ts";
import { ACTIVE_OPENAI_MODEL } from "../_utils/openai/general.ts";

serve(async (req) => {
  try {
    const payload: GenericWebhookPayload<SessionRow> = await req.json();
    console.log("handling session event payload", JSON.stringify(payload, null, 2));

    if (!isRequestAuthorised(req)) {
      console.log("unauthorized");
      return new Response(JSON.stringify({ message: "unauthorized" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      });
    }

    const newSessionRow = payload.record;
    if (newSessionRow.stage === "scenario-selection") {
      if (!newSessionRow.scenario_options?.length && !newSessionRow.ai_is_responding) {
        console.log(
          "no scenarios, generating new ones, current options:",
          JSON.stringify(newSessionRow.scenario_options, null, 2),
        );
        try {
          await supabaseAdminClient
            .from("sessions")
            .update({ ai_is_responding: true }) // to prevent multiple streams generating scenarios
            .eq("id", newSessionRow.id);
          await generateNewSessionScenarios(newSessionRow.id);
        } finally {
          await supabaseAdminClient
            .from("sessions")
            .update({ ai_is_responding: false })
            .eq("id", newSessionRow.id);
        }
      } else if (!newSessionRow.scenario_options?.length && newSessionRow.ai_is_responding) {
        console.log(
          "no scenarios, however there is already an existing process generating new ones, skipping",
        );
      }

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
      console.debug("nothing to do");
    }

    console.log("done handling session event payload", JSON.stringify(payload, null, 2));
    return new Response(JSON.stringify({ message: "ok" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

    // handle general webhook errors
  } catch (error) {
    console.error("general webhook error", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.stack : String(error) }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

async function generateScenarioImage(scenario: { id: number; text: string }) {
  const imagePrompt = await createScenarioImagePrompt(scenario.text);
  const image = await createImageFromPrompt(imagePrompt);

  const uploadImageResponse = await supabaseAdminClient.storage
    .from("images")
    .upload(`scenario_images/${scenario.id}.jpeg`, image.blob, {
      upsert: false,
      contentType: image.blob.type,
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
      .update({
        image_path: imagePath,
        image_prompt: imagePrompt,
        image_creator_ai_model_id: image.generatedByModelId,
      })
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

function ratingNumberToText(rating: number) {
  if (rating > 0) {
    return `${"very".repeat(rating - 1)} good`.trim();
  }
  if (rating < -1) {
    return `${"very".repeat(Math.abs(rating) - 1)} bad`.trim();
  }
  if (rating === 0) {
    return "mediocre";
  }
}

function scenarioRowToScenarioTextWithRating(scenarioRow: ScenarioRow) {
  return `${scenarioRow.text}\n\n[RATING: ${
    scenarioRow.rating
  } which means it is ${ratingNumberToText(scenarioRow.rating)}]`;
}

async function generateNewSessionScenarios(sessionId: number) {
  const [exampleGoodScenarioRows, exampleBadScenarioRows] = await Promise.all([
    supabaseAdminClient.rpc("get_example_good_scenarios").then(({ error, data }) => {
      if (error) {
        console.error(
          `Get example good scenarios error: ${error.message} (${error.code}) \nDetails: ${error.details} \nHint: ${error.hint}`,
        );
        throw error;
      }
      const exampleGoodScenarios = data.map(scenarioRowToScenarioTextWithRating);
      console.log("exampleGoodScenarios", JSON.stringify(exampleGoodScenarios, null, 2));
      return exampleGoodScenarios;
    }),
    supabaseAdminClient.rpc("get_example_bad_scenarios").then(({ error, data }) => {
      if (error) {
        console.error(
          `Get example bad scenarios error: ${error.message} (${error.code}) \nDetails: ${error.details} \nHint: ${error.hint}`,
        );
        throw error;
      }
      const exampleBadScenarios = data.map(scenarioRowToScenarioTextWithRating);
      console.log("exampleBadScenarios", JSON.stringify(exampleBadScenarios, null, 2));
      return exampleBadScenarios;
    }),
  ]);

  console.log("generating scenarios");
  const newScenariosStream = await createScenariosStream({
    goodScenarios: exampleGoodScenarioRows,
    badScenarios: exampleBadScenarioRows,
  });
  console.log("newScenariosStream", newScenariosStream);

  // reset scenario options
  const resetOptionsResponse = await supabaseAdminClient
    .from("sessions")
    .update({ scenario_option_votes: {}, scenario_options_ai_author_model_id: ACTIVE_OPENAI_MODEL })
    .match({ id: sessionId });

  if (resetOptionsResponse.error) {
    // eslint-disable-next-line no-console
    console.error(
      `Reset session scenario options error: ${resetOptionsResponse.error.message} (${resetOptionsResponse.error.code}) \nDetails: ${resetOptionsResponse.error.details} \nHint: ${resetOptionsResponse.error.hint}`,
    );
    throw resetOptionsResponse.error;
  }

  await streamAndPersist({
    persistenceEntityName: "session",
    streamValueName: "new session scenario options",
    stream: newScenariosStream,
    persistLatestValue: (latestScenarios) =>
      latestScenarios && updateSessionScenarioOptions({ sessionId, latestScenarios }),
  });
}

async function updateSessionScenarioOptions({
  sessionId,
  latestScenarios,
}: {
  sessionId: number;
  latestScenarios: string[];
}) {
  const updateSessionResponse = await supabaseAdminClient
    .from("sessions")
    .update({ scenario_options: latestScenarios })
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
