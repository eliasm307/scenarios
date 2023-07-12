/* eslint-disable @typescript-eslint/no-throw-literal */
import "server-only";

import { cookies } from "next/headers";
import type { Message } from "ai";
import { Box, Grid } from "../../../components/ChakraUI.client";
import NavBar from "../../../components/NavBar.client";
import GameSession from "../../../components/GameSession.client";
import { getSupabaseServer } from "../../../utils/server/supabase";
import type { MessageRow, SessionRow, SessionUser } from "../../../types";

async function getUserProfile(): Promise<SessionUser> {
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

  return {
    id: user.id,
    name: userProfile.data.user_name,
  };
}

async function getSession(sessionId: number) {
  const supabase = getSupabaseServer(cookies);
  const session = await supabase.from("sessions").select().eq("id", sessionId).single();

  if (session.error) {
    throw new Error(`Get session error: ${session.error.message}`);
  }

  return session.data as SessionRow | null;
}

async function createSession(sessionId?: number) {
  const supabase = getSupabaseServer(cookies);
  const sessionResponse = await supabase
    .from("sessions")
    .insert({
      id: sessionId,
      stage: "scenario-selection" as SessionRow["stage"],
      // todo generate these from API
      scenario_options: [
        "You discover a magical book that can grant any wish, but each wish shortens your life by five years. Would you use the book?",
        "You're a scientist who has discovered a cure for a rare, deadly disease. However, the cure involves a procedure that is considered highly unethical. Do you proceed to save lives?",
        "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
      ],
    })
    .select()
    .single();

  if (sessionResponse.error) {
    throw new Error(`Create session error: ${sessionResponse.error.message}`);
  }

  return sessionResponse.data as SessionRow;
}

async function getSessionMessages(sessionId: number) {
  const supabase = getSupabaseServer(cookies);
  const { data: messages, error } = await supabase
    .from("messages")
    .select()
    .eq("session_id", sessionId)
    .order("updated_at", { ascending: true });

  if (error) {
    throw new Error(`Get session messages error: ${error.message}`);
  }

  return (messages || []) as MessageRow[];
}

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

  const userProfile = await getUserProfile();

  let sessionRow = await getSession(sessionId);
  if (!sessionRow) {
    sessionRow = await createSession(sessionId);
  }

  let chatMessages: Message[] = [];
  if (sessionRow.stage !== "scenario-selection") {
    const messageRows = await getSessionMessages(sessionId);
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
