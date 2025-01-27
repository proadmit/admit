import { authMiddleware } from "@clerk/nextjs";
import { NextResponse } from "next/server";

export default authMiddleware({
  // Routes that can be accessed while signed out
  publicRoutes: [
    "/",
    "/auth/sign-in",
    "/auth/sign-up",
    "/api/stripe/webhook",
  ],
  // Routes that can always be accessed, and have
  // no authentication information
  ignoredRoutes: [
    "/api/stripe/webhook",
  ],
  // Handle authentication and redirects
  afterAuth(auth, req) {
    // If user tries to access dashboard without being logged in, redirect to home
    if (!auth.userId && req.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 