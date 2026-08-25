import type { OrgRole } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      email: string;
      activeOrganizationId?: string | null;
      activeOrganizationRole?: OrgRole | null;
    };
  }

  interface User {
    activeOrganizationId?: string | null;
    activeOrganizationRole?: OrgRole | null;
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id: string;
    activeOrganizationId?: string | null;
    activeOrganizationRole?: OrgRole | null;
  }
}

declare module "@auth/core/types" {
  interface Session {
    activeOrganizationId?: string;
  }
}

export type AppSessionUser = {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  activeOrganizationId?: string | null;
  activeOrganizationRole?: OrgRole | null;
};

export type AppSession = {
  user: AppSessionUser;
  expires: string;
};

export type SessionUpdatePayload = {
  activeOrganizationId?: string;
};
