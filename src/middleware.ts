import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  console.log("-".repeat(40));
  console.log("middleware.ts: middleware(s)", req.url);
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("middleware.ts supabase.auth.getUser()", user);
  console.log("middleware.ts req.nextUrl.pathname", req.nextUrl.pathname);

  // if user is signed in and the current path is / redirect the user to /account
  if (user && req.nextUrl.pathname === "/auth") {
    console.log("middleware.ts: middleware(s) redirect to /", req.url);
    return NextResponse.redirect(new URL("/", req.url));
  }

  // if user is not signed in and the current path is not / redirect the user to /
  if (!user && req.nextUrl.pathname !== "/auth") {
    console.log("middleware.ts: middleware(s) redirect to /auth", req.url);
    return NextResponse.redirect(new URL("/auth", req.url));
  }

  // const res = NextResponse.next();
  // const supabase = createMiddlewareClient({ req, res });
  // await supabase.auth.getSession();

  console.log("middleware.ts: middleware(s) return res", req.url);
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
     */
    "/((?!api|_next/static|_next/image|favicon.ico|auth/callback).*)",
  ],
};
