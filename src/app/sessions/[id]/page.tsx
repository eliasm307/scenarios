/* eslint-disable @typescript-eslint/no-throw-literal */
import "server-only";

import { cookies } from "next/headers";
import type { Message } from "ai";
import { redirect } from "next/navigation";
import { Box, Grid } from "../../../components/ChakraUI.client";
import NavBar from "../../../components/NavBar.client";
import GameSession from "../../../components/GameSession.client";
import APIServer from "../../../utils/server/APIServer";
import { messageRowToChatMessage } from "../../../utils/general";

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

  if (sessionRow.stage === "scenario-selection" && sessionRow.scenario_options.length === 0) {
    await API.sessions.generateNewScenarioOptions(sessionId);
  }

  let chatMessages: Message[] = [];
  if (sessionRow.stage !== "scenario-selection") {
    const messageRows = await API.getSessionMessages(sessionId);
    chatMessages = messageRows.map(messageRowToChatMessage);
  }

  return (
    <Grid minHeight='100dvh' overflow='hidden' templateRows='auto 1fr' position='fixed' inset={0}>
      <NavBar zIndex={2} />
      <Box zIndex={1} overflowY='auto'>
        <GameSession
          currentUser={currentUser}
          existing={{
            session: sessionRow,
            chatMessages,
          }}
        />
      </Box>
    </Grid>
  );
}
