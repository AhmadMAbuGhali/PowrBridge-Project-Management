import type { NextAuthConfig } from "next-auth";

/**
 * Edge-compatible Auth.js config (no Prisma / Node-only deps).
 * Used by `src/middleware.ts`.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.AUTH_SESSION_MAX_AGE ?? 60 * 60 * 24 * 30),
  },
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      const isAuthRoute =
        pathname.startsWith("/login") || pathname.startsWith("/register");

      const isInviteRoute = pathname.startsWith("/invite");

      const isPublicRoute =
        pathname === "/" ||
        pathname.startsWith("/api/auth") ||
        pathname.startsWith("/api/webhooks") ||
        pathname.startsWith("/api/attachments/file") ||
        pathname.startsWith("/pricing");

      if (isInviteRoute) {
        return true;
      }

      if (isAuthRoute) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/app", request.nextUrl));
        }
        return true;
      }

      if (isPublicRoute) {
        return true;
      }

      // Protect /app and all other authenticated surfaces
      if (pathname.startsWith("/app") || pathname.startsWith("/api")) {
        return isLoggedIn;
      }

      return true;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
} satisfies NextAuthConfig;
