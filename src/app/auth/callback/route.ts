import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getSupabaseServer } from "../../../utils/server/supabase";

export async function GET(req: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    // this updates cookies with the session so server components can access it
    await getSupabaseServer().auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(origin);
}
