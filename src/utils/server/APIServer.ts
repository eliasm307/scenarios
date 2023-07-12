import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { SessionUser, SessionRow, MessageRow } from "../../types";
import { getSupabaseServer } from "./supabase";

export default class APIServer {
  private supabase: ReturnType<typeof getSupabaseServer>;

  constructor(cookies: () => ReadonlyRequestCookies) {
    this.supabase = getSupabaseServer(cookies);
  }

  async getUserProfile(): Promise<SessionUser> {
    const {
      data: { user },
    } = await this.supabase.auth.getUser();

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
    };
  }

  async getSession(sessionId: number) {
    const session = await this.supabase.from("sessions").select().eq("id", sessionId).single();

    if (session.error) {
      throw new Error(`Get session error: ${session.error.message}`);
    }

    return session.data as SessionRow | null;
  }

  async createSession(sessionId?: number) {
    const sessionResponse = await this.supabase
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
