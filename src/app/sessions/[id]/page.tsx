/* eslint-disable @typescript-eslint/no-throw-literal */
import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Grid, VStack } from "../../../components/client/ChakraUI";
import NavBar from "../../../components/client/NavBar";
import GameSession from "../../../components/client/GameSession";
import APIServer from "../../../utils/server/APIServer";
import type { MessageRow } from "../../../types";

export default async function SessionPage({ params: { id } }: { params: { id: string } }) {
  const sessionId = Number(id);
  if (isNaN(sessionId)) {
    // ! ID will be used in SQL query, so need to make sure it's a number to prevent SQL injection
    console.error("invalid session id", id, "parses to", sessionId, "redirecting to home");
    return redirect("/");
  }

  const API = new APIServer(cookies);
  const currentUser = await API.getCurrentSessionUser();
  const sessionRow = await API.getSession(sessionId);
  if (!sessionRow) {
    // session doesn't exist yet
    console.error("session doesn't exist yet", id, "redirecting to home");
    return redirect("/");
  }

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
      <VStack as='section' className='game-session-container' zIndex={1} overflow='hidden'>
        <GameSession
          currentUser={currentUser}
          existing={{
            session: sessionRow,
            messageRows,
          }}
        />
      </VStack>
    </Grid>
  );
}
