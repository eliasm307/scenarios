import "server-only";

import { cookies } from "next/headers";
import { Box, Grid } from "../../../components/ChakraUI.client";
import NavBar from "../../../components/NavBar.client";
import GameSession from "../../../components/GameSession.client";
import { getSupabaseServer } from "../../../utils/server/supabase";
import { SessionData } from "../../../types";
import { Message } from "ai";

export default async function SessionPage({ params: { id } }: { params: { id: string } }) {
  const sessionId = Number(id);
  if (isNaN(sessionId)) {
    // ! ID will be used in SQL query, so need to make sure it's a number to prevent SQL injection
    throw new Error(`Session id not a number, it is "${id}"`);
  }

  const supabase = getSupabaseServer(cookies);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No user found");
  }

  const userProfile = await supabase
    .from("user_profiles")
    .select("user_name")
    .eq("user_id", user.id)
    .single();

  if (!userProfile.data) {
    throw new Error("No user profile found");
  }

  let getSessionResult = await supabase.from("sessions").select("*").eq("id", sessionId).single();

  if (!getSessionResult.data) {
    console.log("Creating session", sessionId);
    getSessionResult = await supabase
      .from("sessions")
      .insert({
        id: sessionId,
        stage: "scenario-selection" as SessionData["stage"],
        // todo generate these from API
        scenario_options: [
          "You discover a magical book that can grant any wish, but each wish shortens your life by five years. Would you use the book?",
          "You're a scientist who has discovered a cure for a rare, deadly disease. However, the cure involves a procedure that is considered highly unethical. Do you proceed to save lives?",
          "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
        ],
      })
      .select()
      .single();

    if (!getSessionResult.data) {
      throw new Error("Could not create session");
    }
  }

  let messages: Message[] = [];
  if (getSessionResult.data.stage !== "scenario-selection") {
    const { data: messagesData, error } = await supabase
      .from("messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: true });

    if (error) {
      throw error;
    }

    messages =
      messagesData?.map((message) => ({
        content: message.content!,
        id: String(message.id),
        role: message.author_role as Message["role"],
        createdAt: new Date(message.updated_at!),
        // name: message.author_id!,
      })) ?? [];
  }

  let scenarioText: string | null = null;
  if (getSessionResult.data.selected_scenario_id) {
    const { data: scenario, error } = await supabase
      .from("scenarios")
      .select("text")
      .eq("id", getSessionResult.data.selected_scenario_id)
      .single();

    if (error) {
      throw error;
    }

    scenarioText = scenario?.text ?? null;
  }

  return (
    <Grid minHeight='100dvh' overflow='hidden' templateRows='auto 1fr' position='fixed' inset={0}>
      <NavBar zIndex={2} />
      <Box zIndex={1} overflowY='auto'>
        <GameSession
          currentUser={{
            id: user.id,
            name: userProfile.data.user_name,
            joinTimeMs: Date.now(),
          }}
          initial={{
            session: getSessionResult.data as SessionData,
            messages,
            scenarioText,
          }}
        />
      </Box>
    </Grid>
  );
}
