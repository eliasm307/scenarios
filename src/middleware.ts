/* eslint-disable no-console */
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

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
    console.log("middleware", "redirecting to /");
    return NextResponse.redirect(new URL("/", req.url));
  }

  // todo allow this to redirect to the initial page the user was trying to access
  // if user is not signed in and the current path is not / redirect the user to /
  if (!session?.user && req.nextUrl.pathname !== "/auth") {
    console.log("middleware", "redirecting to /auth");
    return NextResponse.redirect(new URL("/auth", req.url));
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
    "/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)",
  ],
};
