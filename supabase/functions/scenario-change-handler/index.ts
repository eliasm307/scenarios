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
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.26.0";
import type { Database } from "../../../src/types/supabase.d.ts";
import type { SessionRow, ScenarioRow } from "../../../src/types/databaseRows.ts";
import { generateScenarios } from "../_utils/openai.ts";

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

    if (payload.record.scenario_options?.length) {
      console.log(`session ${payload.record.id} has scenarios, returning`);
      return new Response(JSON.stringify({ message: "existing scenarios" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Create a Supabase client with the Auth context of the logged in user.
    // see default env variables here https://supabase.com/docs/guides/functions/secrets#default-secrets
    const supabase = createClient<Database>(
      // Supabase API URL - env var exported by default.
      Deno.env.get("SUPABASE_URL") ?? "",
      // Supabase API ANON KEY - env var exported by default.
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      // Create client with Auth context of the user that called the function.
      // This way your row-level-security (RLS) policies are applied.
      // { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );

    const { data: exampleScenarioRows, error } = await supabase.rpc("get_example_scenarios_fn");
    if (error) {
      // eslint-disable-next-line no-console
      console.error(
        `Get example scenarios error: ${error.message} (${error.code}) \nDetails: ${error.details} \nHint: ${error.hint}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw error;
    }
    const exampleScenarios = exampleScenarioRows.map(({ text }: ScenarioRow) => text);
    console.log("exampleScenarios", exampleScenarios);

    console.log("generating scenarios");
    const newScenarios = await generateScenarios(exampleScenarios);
    console.log("newScenarios", newScenarios);

    const updateSessionResponse = await supabase
      .from("sessions")
      .update({ scenario_options: newScenarios })
      .match({ id: payload.record.id });

    if (updateSessionResponse.error) {
      // eslint-disable-next-line no-console
      console.error(
        `Update session error: ${updateSessionResponse.error.message} (${updateSessionResponse.error.code}) \nDetails: ${updateSessionResponse.error.details} \nHint: ${updateSessionResponse.error.hint}`,
      );
      // eslint-disable-next-line @typescript-eslint/no-throw-literal
      throw updateSessionResponse.error;
    }
    console.log("updateSessionResponse", updateSessionResponse);

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

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
