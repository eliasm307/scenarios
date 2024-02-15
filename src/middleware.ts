/* eslint-disable no-console */
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

const REDIRECT_AFTER_AUTH_QUERY_PARAM_NAME = "next";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  console.log("middleware", "req.url", req.url, "res.url", res.url);

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error(`Get session error: ${error.message} (${error.status}) \nStack: ${error.stack}`);
    throw error;
  }

  // if user is signed in and the current path is / redirect the user to /account
  if (session?.user && req.nextUrl.pathname === "/auth") {
    const nextPath = req.nextUrl.searchParams.get(REDIRECT_AFTER_AUTH_QUERY_PARAM_NAME);
    // dont redirect to urls on different origins
    const nextPathSafe = nextPath?.startsWith("/") ? nextPath : null;
    const targetUrl = new URL(nextPathSafe || "/", req.url);
    console.log("middleware authenticated", "redirecting to", targetUrl.toString());

    // todo investigate this doesn't change the url in the browser
    return NextResponse.redirect(targetUrl, { url: targetUrl.toString() });
  }

  // if user is not signed in and the current path is not / redirect the user to /
  if (!session?.user && req.nextUrl.pathname !== "/auth") {
    const targetUrl = new URL("/auth", req.url);
    if (req.nextUrl.pathname !== "/") {
      // if the user is trying to access a page other than the home page save the target so we can redirect them back after they sign in
      targetUrl.searchParams.set(REDIRECT_AFTER_AUTH_QUERY_PARAM_NAME, req.nextUrl.pathname);
    }
    console.log("middleware not authenticated", "redirecting to:", targetUrl.toString());
    return NextResponse.redirect(targetUrl);
  }

  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - auth/callback (auth callback route)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|auth/callback).*)",
  ],
};
