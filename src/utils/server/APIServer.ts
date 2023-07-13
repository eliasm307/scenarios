import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { User } from "@supabase/supabase-js";
import type { SessionUser, SessionRow, MessageRow, ScenarioRow } from "../../types";
import { getSupabaseServer } from "./supabase";
import { generateScenarios } from "./openai";
import API from "../common/API";

export default class APIServer extends API {
  constructor(cookies: () => ReadonlyRequestCookies) {
    super(getSupabaseServer(cookies));
  }

  override ai = {
    createScenarios: async () => {
      const { data: exampleScenarioRows, error } = await this.supabase.rpc(
        "get_example_scenarios_fn",
      );
      if (error) {
        throw new Error(`Get example scenarios error: ${error.message}`);
      }

      const exampleScenarios = exampleScenarioRows.map(({ text }: ScenarioRow) => text);
      // eslint-disable-next-line no-console
      console.log("createScenarios, exampleScenarios", exampleScenarios);
      return generateScenarios(exampleScenarios);
    },
  } satisfies API["ai"];

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

  async createSession(sessionId?: number) {
    const sessionResponse = await this.supabase
      .from("sessions")
      .insert({
        id: sessionId,
        stage: "scenario-selection" as SessionRow["stage"],
        scenario_options: await this.ai.createScenarios(),
        // scenario_options: [
        //   "You discover a magical book that can grant any wish, but each wish shortens your life by five years. Would you use the book?",
        //   "You're a scientist who has discovered a cure for a rare, deadly disease. However, the cure involves a procedure that is considered highly unethical. Do you proceed to save lives?",
        //   "You're a struggling artist and a wealthy collector offers to buy all your work for a sum that would solve all your financial problems. But he intends to destroy all the art after purchase. Do you sell your art to him?",
        // ],
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
