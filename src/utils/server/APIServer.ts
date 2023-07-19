import "server-only";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { User } from "@supabase/supabase-js";
import type { SessionUser, SessionRow, MessageRow } from "../../types";
import { getSupabaseServer } from "./supabase";
import API from "../common/API";

export default class APIServer extends API {
  constructor(cookies: () => ReadonlyRequestCookies) {
    super(getSupabaseServer(cookies));
  }

  async getUser(): Promise<User> {
    const {
      data: { user },
      error,
    } = await this.supabase.auth.getUser();

    if (!user) {
      throw new Error("No user found");
    }

    if (error) {
      throw new Error(`Get user error: ${error.message}`);
    }

    return user;
  }

  async getCurrentSessionUser(): Promise<SessionUser> {
    const user = await this.getUser();
    if (!user) {
      throw new Error("No user found");
    }

    const userProfile = await this.supabase
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
      isCurrentUser: true,
      relativeName: "I",
    };
  }

  async getSession(sessionId: number) {
    const session = await this.supabase.from("sessions").select().eq("id", sessionId).single();

    if (session.error) {
      throw new Error(`Get session error: ${session.error.message}`);
    }

    return session.data as SessionRow | null;
  }

  async getSessionMessages(sessionId: number) {
    const { data: messages, error } = await this.supabase
      .from("messages")
      .select()
      .eq("session_id", sessionId)
      .order("updated_at", { ascending: true });

    if (error) {
      throw new Error(`Get session messages error: ${error.message}`);
    }

    return (messages || []) as MessageRow[];
  }
}
