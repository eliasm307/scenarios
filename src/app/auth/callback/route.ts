import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");

  if (code) {
    console.log("callback.ts: GET(s) code", code);
    const supabase = createRouteHandlerClient({ cookies });
    const response = await supabase.auth.exchangeCodeForSession(code);
    console.log("callback.ts: GET(s) response", response);
  } else {
    console.log("callback.ts: GET(s) no code");
  }

  console.log("callback.ts: GET(s) redirect to origin", origin);
  // URL to redirect to after sign in process completes
  return NextResponse.redirect(origin);
}
