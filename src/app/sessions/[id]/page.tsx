/* eslint-disable @typescript-eslint/no-throw-literal */
import "server-only";

import { cookies } from "next/headers";
import type { Message } from "ai";
import { Box, Grid } from "../../../components/ChakraUI.client";
import NavBar from "../../../components/NavBar.client";
import GameSession from "../../../components/GameSession.client";
import type { MessageRow } from "../../../types";
import APIServer from "../../../utils/server/APIServer";

function messageRowToChatMessage(messageRow: MessageRow): Message {
  return {
    id: String(messageRow.id),
    content: messageRow.content,
    role: messageRow.author_role as Message["role"],
    createdAt: new Date(messageRow.updated_at),
    // name: message.author_id!,
  };
}

export default async function SessionPage({ params: { id } }: { params: { id: string } }) {
  const sessionId = Number(id);
  if (isNaN(sessionId)) {
    // ! ID will be used in SQL query, so need to make sure it's a number to prevent SQL injection
    throw new Error(`Session id not a number, it is "${id}"`);
  }

  const API = new APIServer(cookies);
  const userProfile = await API.getUserProfile();
  const sessionRow = (await API.getSession(sessionId)) || (await API.createSession(sessionId));

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
          currentUser={{
            id: userProfile.id,
            name: userProfile.name,
          }}
          existing={{
            session: sessionRow,
            chatMessages,
          }}
        />
      </Box>
    </Grid>
  );
}
