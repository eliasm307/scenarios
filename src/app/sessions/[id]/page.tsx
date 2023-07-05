import "server-only";

import { cookies } from "next/headers";
import { Box, Grid } from "../../../components/ChakraUI.client";
import NavBar from "../../../components/NavBar.client";
import GameSession from "../../../components/GameSession.client";
import { getSupabaseServer } from "../../../utils/server/supabase";

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

  return (
    <Grid minHeight='100dvh' overflow='hidden' templateRows='auto 1fr' position='fixed' inset={0}>
      <NavBar zIndex={2} />
      <Box zIndex={1} overflowY='auto'>
        <GameSession
          currentUser={{ id: user.id, name: userProfile.data.user_name, joinTimeMs: Date.now() }}
          sessionId={sessionId}
          // todo check db for existing scenario and messages and set them here
          initial={{
            // todo only set this if there is no existing selected scenario
            // todo generate these from API
            scenarioOptions: [
              "You discover a magical book that can grant any wish, but each wish shortens your life by five years. Would you use the book?",
              "You're a scientist who has discovered a cure for a rare, deadly disease. However, the cure involves a procedure that is considered highly unethical. Do you proceed to save lives?",
              "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
            ],
          }}
        />
      </Box>
    </Grid>
  );
}
