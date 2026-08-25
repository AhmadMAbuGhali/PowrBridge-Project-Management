import { auth } from "@/lib/auth/config";
import { AuthenticationError } from "@/lib/rbac/guard";
import type { OrgRole } from "@prisma/client";
import type { AppSession } from "./types";
import "./types";

export { auth, signIn, signOut, handlers } from "./config";

type AuthSessionLike = {
  expires: string;
  user?: {
    id?: string;
    email?: string | null;
    name?: string | null;
    image?: string | null;
    activeOrganizationId?: string | null;
    activeOrganizationRole?: OrgRole | null;
  };
};

function toAppSession(session: AuthSessionLike | null): AppSession | null {
  if (!session?.user?.id || !session.user.email) {
    return null;
  }

  return {
    expires: session.expires,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      image: session.user.image,
      activeOrganizationId: session.user.activeOrganizationId ?? null,
      activeOrganizationRole: session.user.activeOrganizationRole ?? null,
    },
  };
}

export async function requireSession(): Promise<AppSession> {
  const session = toAppSession((await auth()) as AuthSessionLike | null);

  if (!session) {
    throw new AuthenticationError();
  }

  return session;
}

export async function getSession(): Promise<AppSession | null> {
  return toAppSession((await auth()) as AuthSessionLike | null);
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

export async function requireActiveOrganization(): Promise<{
  session: AppSession;
  organizationId: string;
  role: NonNullable<AppSession["user"]["activeOrganizationRole"]>;
}> {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  const role = session.user.activeOrganizationRole;

  if (!organizationId || !role) {
    throw new AuthenticationError(
      "No active organization. Select or create an organization first.",
    );
  }

  return { session, organizationId, role };
}
