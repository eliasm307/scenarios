/* eslint-disable functional-core/purity */
/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable no-console */

// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import type { GenericWebhookPayload } from "../_utils/types.ts";
import type { MessageRow } from "../../../src/types/databaseRows.ts";
import {
  isRequestAuthorised,
  supabaseAdminClient,
} from "../_utils/supabase.ts";
import { messageRowToChatMessage } from "../_utils/pure.ts";
import { createScenarioChatResponseStream } from "../_utils/openai/createScenarioChatResponse.ts";
import { streamAndPersist } from "../_utils/general.ts";
import { ACTIVE_OPENAI_MODEL } from "../_utils/openai/general.ts";
import { isTruthy } from "../../../src/utils/general.ts";

serve(async (req) => {
  try {
    const payload: GenericWebhookPayload<MessageRow> = await req.json();
    console.log(
      "handling message create event payload",
      JSON.stringify(payload, null, 2),
    );

    if (!isRequestAuthorised(req)) {
      console.log("unauthorized");
      return new Response(JSON.stringify({ message: "unauthorized" }), {
        headers: { "Content-Type": "application/json" },
        status: 401,
      });
    }

    if (payload.type !== "INSERT") {
      console.log("not an insert event, ignoring it");
      return new Response(JSON.stringify({ message: "not an insert event" }), {
        headers: { "Content-Type": "application/json" },
        status: 200,
      });
    }

    const newMessageRow = payload.record;
    if (newMessageRow.author_role === "user") {
      console.log("user message, generating response");
      try {
        await setAiIsResponding({
          sessionId: newMessageRow.session_id,
          isResponding: true,
        });
        await generateResponse(newMessageRow);
      } finally {
        await setAiIsResponding({
          sessionId: newMessageRow.session_id,
          isResponding: false,
        });
      }
    }

    console.log(
      "done handling message event:",
      JSON.stringify(payload, null, 2),
    );
    return new Response(JSON.stringify({ message: "ok" }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    });

    // handle general webhook errors
  } catch (error) {
    console.error("general webhook error", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.stack : String(error),
      }),
      {
        headers: { "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

async function setAiIsResponding({
  sessionId,
  isResponding,
}: {
  sessionId: number;
  isResponding: boolean;
}) {
  const updateSessionResponse = await supabaseAdminClient
    .from("sessions")
    .update({ ai_is_responding: isResponding })
    .eq("id", sessionId);

  // todo add retry logic as this can hang up games
  if (updateSessionResponse.error) {
    console.error("error updating session", updateSessionResponse.error);
    throw updateSessionResponse.error;
  }
}

async function generateResponse(newMessageRow: MessageRow) {
  console.log(
    "generating response for message",
    JSON.stringify(newMessageRow, null, 2),
  );

  const [messageRows, sessionScenario] = await Promise.all([
    supabaseAdminClient
      .from("messages")
      .select("*")
      .eq("session_id", newMessageRow.session_id)
      .order("inserted_at", { ascending: true })
      .then((response) => {
        if (response.error) {
          console.error("error fetching session messages", response.error);
          throw response.error;
        }
        const messageRowsData = response.data as MessageRow[];
        console.log(
          `fetched session ${newMessageRow.session_id} messages:`,
          JSON.stringify(messageRowsData, null, 2),
        );
        return messageRowsData;
      }),
    supabaseAdminClient
      .from("sessions")
      .select("selected_scenario_text")
      .eq("id", newMessageRow.session_id)
      .single()
      .then((response) => {
        if (response.error) {
          console.error("error fetching session", response.error);
          throw response.error;
        }

        const scenario = response.data.selected_scenario_text;
        if (!scenario) {
          const error =
            `no scenario text for session ${newMessageRow.session_id}`;
          console.error(error);
          throw new Error(error);
        }

        console.log(
          `fetched session ${newMessageRow.session_id} scenario`,
          scenario,
        );
        return scenario;
      }),
  ]);

  const userIds = new Set(
    messageRows
      .filter((messageRow) => messageRow.author_role === "user")
      .map((messageRow) => messageRow.author_id)
      .filter(isTruthy),
  );
  const getUsersRequest = await supabaseAdminClient
    .from("user_profiles")
    .select("user_id, user_name")
    .in("user_id", [...userIds]);
  if (getUsersRequest.error) {
    console.error("error fetching users", getUsersRequest.error);
    throw getUsersRequest.error;
  }

  const userIdToNameMap = new Map(
    getUsersRequest.data.map((
      userProfile,
    ) => [userProfile.user_id, userProfile.user_name]),
  );

  const sessionChatMessagesWithAuthorNames = messageRows
    .map(messageRowToChatMessage)
    .map((chatMessage, i) => {
      if (chatMessage.role === "user") {
        const userId = messageRows[i].author_id;
        const userName = userId && userIdToNameMap.get(userId);
        if (userName) {
          chatMessage.content = `${userName}: ${chatMessage.content}`;
        }
      }
      return chatMessage;
    });

  const responseMessageStream = await createScenarioChatResponseStream({
    messages: sessionChatMessagesWithAuthorNames,
    scenario: sessionScenario,
  });

  // only create a response message if everything went well and we are ready to stream the message
  const createResponseMessageResponse = await supabaseAdminClient
    .from("messages")
    .insert(
      {
        author_id: null,
        author_role: "assistant",
        author_ai_model_id: ACTIVE_OPENAI_MODEL,
        content: "",
        session_id: newMessageRow.session_id,
      } satisfies Omit<
        Required<MessageRow>,
        "id" | "inserted_at" | "updated_at"
      >,
    )
    .select("id")
    .single();

  if (createResponseMessageResponse.error) {
    console.error(
      "error creating response message row",
      createResponseMessageResponse.error,
    );
    throw createResponseMessageResponse.error;
  }

  try {
    await streamAndPersist({
      persistenceEntityName: "AI chat response message",
      streamValueName: "AI chat response message",
      stream: responseMessageStream,
      persistLatestValue: (latestResponseMessageContent) =>
        latestResponseMessageContent &&
        updateMessageRow({
          id: createResponseMessageResponse.data.id,
          content: latestResponseMessageContent,
        }),
    });

    console.log(
      "done generating response for message",
      JSON.stringify(newMessageRow, null, 2),
    );
  } catch (error) {
    // delete the response message row if we failed to generate a response
    await supabaseAdminClient
      .from("messages")
      .delete()
      .eq("id", createResponseMessageResponse.data.id);

    console.error("error generating response for message", error);
    throw error;
  }
}

async function updateMessageRow(
  { id, content }: { id: number; content: string },
) {
  const updateMessageResponse = await supabaseAdminClient
    .from("messages")
    .update({ content })
    .eq("id", id);

  if (updateMessageResponse.error) {
    console.error("error updating message row", updateMessageResponse.error);
    throw updateMessageResponse.error;
  }
}

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'
