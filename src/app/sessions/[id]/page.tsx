/* eslint-disable @typescript-eslint/no-throw-literal */
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Box, Grid } from "../../../components/ChakraUI.client";
import NavBar from "../../../components/NavBar.client";
import GameSession from "../../../components/GameSession.client";
import APIServer from "../../../utils/server/APIServer";
import type { MessageRow } from "../../../types";

export default async function SessionPage({ params: { id } }: { params: { id: string } }) {
  const sessionId = Number(id);
  if (isNaN(sessionId)) {
    // ! ID will be used in SQL query, so need to make sure it's a number to prevent SQL injection
    return redirect("/");
  }

  const API = new APIServer(cookies);
  const currentUser = await API.getCurrentSessionUser();
  const sessionRow = await API.getSession(sessionId);
  if (!sessionRow) {
    // session doesn't exist yet
    return redirect("/");
  }

  // todo this should not run here as it means all the session users will try to generate new options
  // if (sessionRow.stage === "scenario-selection" && !sessionRow.scenario_options?.length) {
  //   await API.sessions.generateNewScenarioOptions(sessionId);
  // }

  let messageRows: MessageRow[] = [];
  if (sessionRow.stage !== "scenario-selection") {
    messageRows = await API.getSessionMessages(sessionId);
  }

  return (
    <Grid
      minHeight={{ md: "100dvh" }}
      height={{ base: "100dvh", md: undefined }}
      overflow='hidden'
      templateRows='auto 1fr'
      position='fixed'
      inset={0}
    >
      <NavBar zIndex={2} />
      <Box zIndex={1} overflow='hidden'>
        <GameSession
          currentUser={currentUser}
          existing={{
            session: sessionRow,
            messageRows,
          }}
        />
      </Box>
    </Grid>
  );
}
