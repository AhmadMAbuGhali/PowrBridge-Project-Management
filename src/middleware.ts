import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth/auth.config";

/**
 * Edge middleware — uses the lightweight authConfig (no Prisma adapter).
 * Protects app routes; public/auth routes are allowed via `authorized` callback.
 */
export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
