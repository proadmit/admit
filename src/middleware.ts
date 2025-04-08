import { authMiddleware, clerkClient } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

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
  async afterAuth(auth, req) {
    // Handle authenticated users
    if (auth.userId) {
      const user = await clerkClient.users.getUser(auth.userId);
      const hasCompletedPersonalInfo = user?.unsafeMetadata?.hasCompletedPersonalInfo;
      const isPersonalInfoPage = req.nextUrl.pathname === "/personal-info";
      const isDashboardPage = req.nextUrl.pathname.startsWith("/dashboard");

      // If user hasn't completed personal info
      if (!hasCompletedPersonalInfo) {
        // Allow access to personal-info page
        if (isPersonalInfoPage) {
          return NextResponse.next();
        }
        // Redirect to personal-info if trying to access dashboard
        if (isDashboardPage) {
          return NextResponse.redirect(new URL("/personal-info", req.url));
        }
      }
      
      // If user has completed personal info but is trying to access personal-info page
      if (hasCompletedPersonalInfo && isPersonalInfoPage) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }

    // Handle non-authenticated users
    if (!auth.userId && !auth.isPublicRoute) {
      return NextResponse.redirect(new URL("/auth/sign-in", req.url));
    }

    return NextResponse.next();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
}; 