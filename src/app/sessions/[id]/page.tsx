import "server-only";

import { cookies } from "next/headers";
import { Box, Grid } from "../../../components/ChakraUI.client";
import NavBar from "../../../components/NavBar.client";
import GameSession from "../../../components/GameSession.client";
import { getSupabaseServer } from "../../../utils/server/supabase";
import { SessionData } from "../../../types";

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

  let getSessionResult = await supabase
    .from("sessions_view")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!getSessionResult.data) {
    console.log("Creating session", sessionId);
    getSessionResult = await supabase
      .from("sessions")
      .insert({
        id: sessionId,
        stage: "scenario-outcome-selection",
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
          }}
        />
      </Box>
    </Grid>
  );
}
