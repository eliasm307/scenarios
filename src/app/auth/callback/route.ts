import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(req: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  // eslint-disable-next-line no-console
  console.log("auth callback for request from", req.url);

  if (code) {
    // this updates cookies with the session so server components can access it
    await createRouteHandlerClient({ cookies }).auth.exchangeCodeForSession(code);
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(origin);
}
