import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import type { NextAuthConfig } from "next-auth";
import { prisma } from "@/lib/db/prisma";
import { signInSchema } from "@/lib/validations/auth";
import "./types";

const providers: NextAuthConfig["providers"] = [
  Credentials({
    id: "credentials",
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const parsed = signInSchema.safeParse(credentials);
      if (!parsed.success) {
        return null;
      }

      const { email, password } = parsed.data;

      const user = await prisma.user.findFirst({
        where: { email, deletedAt: null },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          passwordHash: true,
        },
      });

      if (!user?.passwordHash) {
        return null;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return null;
      }

      const membership = await prisma.organizationMember.findFirst({
        where: { userId: user.id, deletedAt: null },
        orderBy: { joinedAt: "asc" },
        select: { organizationId: true, role: true },
      });

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
        activeOrganizationId: membership?.organizationId ?? null,
        activeOrganizationRole: membership?.role ?? null,
      };
    },
  }),
];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.push(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

/** Node.js runtime Auth.js instance (Prisma adapter + Credentials). */
export const { handlers, auth, signIn, signOut } = NextAuth({
  pages: {
    signIn: "/login",
    error: "/login",
  },
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: Number(process.env.AUTH_SESSION_MAX_AGE ?? 60 * 60 * 24 * 30),
  },
  providers,
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id!;
        token.activeOrganizationId = user.activeOrganizationId ?? null;
        token.activeOrganizationRole = user.activeOrganizationRole ?? null;

        if (!token.activeOrganizationId) {
          const membership = await prisma.organizationMember.findFirst({
            where: { userId: user.id!, deletedAt: null },
            orderBy: { joinedAt: "asc" },
            select: { organizationId: true, role: true },
          });
          token.activeOrganizationId = membership?.organizationId ?? null;
          token.activeOrganizationRole = membership?.role ?? null;
        }
      }

      if (trigger === "update" && session?.activeOrganizationId) {
        const nextOrgId = session.activeOrganizationId;
        const membership = await prisma.organizationMember.findFirst({
          where: {
            userId: token.id,
            organizationId: nextOrgId,
            deletedAt: null,
          },
          select: { organizationId: true, role: true },
        });

        if (membership) {
          token.activeOrganizationId = membership.organizationId;
          token.activeOrganizationRole = membership.role;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.activeOrganizationId = token.activeOrganizationId ?? null;
        session.user.activeOrganizationRole =
          token.activeOrganizationRole ?? null;
      }
      return session;
    },
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
});
