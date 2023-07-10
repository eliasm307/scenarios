import "server-only";

import { cookies } from "next/headers";
import { Box, Grid } from "../../../components/ChakraUI.client";
import NavBar from "../../../components/NavBar.client";
import GameSession from "../../../components/GameSession.client";
import { getSupabaseServer } from "../../../utils/server/supabase";
import { SessionData } from "../../../types";

export default async function SessionPage({
  params: { id: sessionId },
}: {
  params: { id: string };
}) {
  if (typeof sessionId !== "string") {
    throw new Error(
      `Invalid session id type, expected string but got "${typeof sessionId}" instead.`,
    );
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

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (!session) {
    throw new Error("No session found");
  }

  let scenario: string | null = null;
  if (session.selected_scenario_id) {
    const { data: scenarioData } = await supabase
      .from("scenarios")
      .select("scenario")
      .eq("id", session.selected_scenario_id)
      .single();

    if (!scenarioData) {
      throw new Error("No scenario found");
    }
  }

  return (
    <Grid minHeight='100dvh' overflow='hidden' templateRows='auto 1fr' position='fixed' inset={0}>
      <NavBar zIndex={2} />
      <Box zIndex={1} overflowY='auto'>
        <GameSession
          currentUser={{ id: user.id, name: userProfile.data.user_name, joinTimeMs: Date.now() }}
          // todo check db for existing scenario and messages and set them here
          // todo only set this if there is no existing selected scenario
          // todo generate these from API
          initial={{
            session: session as SessionData,
            scenario,
          }}
        />
      </Box>
    </Grid>
  );
}
