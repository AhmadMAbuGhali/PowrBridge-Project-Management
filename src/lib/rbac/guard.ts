import { OrgRole, ProjectRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import {
  type Permission,
  orgRoleHasPermission,
  projectRoleHasPermission,
} from "./permissions";

export class AuthorizationError extends Error {
  readonly status = 403;
  readonly code = "FORBIDDEN";

  constructor(message = "You do not have permission to perform this action") {
    super(message);
    this.name = "AuthorizationError";
  }
}

export class AuthenticationError extends Error {
  readonly status = 401;
  readonly code = "UNAUTHORIZED";

  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationError";
  }
}

export class NotFoundError extends Error {
  readonly status = 404;
  readonly code = "NOT_FOUND";

  constructor(message = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export type OrgMembershipContext = {
  organizationId: string;
  userId: string;
  role: OrgRole;
};

export type ProjectMembershipContext = {
  projectId: string;
  organizationId: string;
  userId: string;
  orgRole: OrgRole | null;
  projectRole: ProjectRole | null;
};

/**
 * Resolve the caller's organization membership (active, non-soft-deleted).
 */
export async function getOrgMembership(
  userId: string,
  organizationId: string,
): Promise<OrgMembershipContext | null> {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
      organizationId,
      deletedAt: null,
      organization: { deletedAt: null },
    },
    select: {
      organizationId: true,
      userId: true,
      role: true,
    },
  });

  return membership;
}

/**
 * Resolve effective access to a project: org membership and optional project membership.
 * Org OWNER/ADMIN always inherit full project access.
 */
export async function getProjectAccess(
  userId: string,
  projectId: string,
): Promise<ProjectMembershipContext | null> {
  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, organizationId: true },
  });

  if (!project) {
    return null;
  }

  const [orgMembership, projectMembership] = await Promise.all([
    prisma.organizationMember.findFirst({
      where: {
        userId,
        organizationId: project.organizationId,
        deletedAt: null,
      },
      select: { role: true },
    }),
    prisma.projectMember.findUnique({
      where: {
        projectId_userId: { projectId, userId },
      },
      select: { role: true },
    }),
  ]);

  if (!orgMembership && !projectMembership) {
    return null;
  }

  return {
    projectId: project.id,
    organizationId: project.organizationId,
    userId,
    orgRole: orgMembership?.role ?? null,
    projectRole: projectMembership?.role ?? null,
  };
}

export function canOrg(
  membership: OrgMembershipContext | null,
  permission: Permission,
): boolean {
  if (!membership) return false;
  return orgRoleHasPermission(membership.role, permission);
}

/**
 * Effective project permission:
 * 1. Org OWNER / ADMIN → grant via org matrix
 * 2. Else project role → project matrix
 * 3. Else org MEMBER/VIEWER with no project seat → deny project mutations
 *    (VIEWER org can still read if they have org:read-scoped project:read via org)
 */
export function canProject(
  access: ProjectMembershipContext | null,
  permission: Permission,
): boolean {
  if (!access) return false;

  if (access.orgRole === "OWNER" || access.orgRole === "ADMIN") {
    return orgRoleHasPermission(access.orgRole, permission);
  }

  if (access.projectRole) {
    return projectRoleHasPermission(access.projectRole, permission);
  }

  // Org members without an explicit project seat: read-only via org VIEWER/MEMBER read perms
  if (access.orgRole && permission.endsWith(":read")) {
    return orgRoleHasPermission(access.orgRole, permission);
  }

  return false;
}

export async function requireOrgPermission(
  userId: string,
  organizationId: string,
  permission: Permission,
): Promise<OrgMembershipContext> {
  const membership = await getOrgMembership(userId, organizationId);

  if (!membership) {
    throw new NotFoundError("Organization not found or access denied");
  }

  if (!canOrg(membership, permission)) {
    throw new AuthorizationError(
      `Missing permission: ${permission} on organization`,
    );
  }

  return membership;
}

export async function requireProjectPermission(
  userId: string,
  projectId: string,
  permission: Permission,
): Promise<ProjectMembershipContext> {
  const access = await getProjectAccess(userId, projectId);

  if (!access) {
    throw new NotFoundError("Project not found or access denied");
  }

  if (!canProject(access, permission)) {
    throw new AuthorizationError(
      `Missing permission: ${permission} on project`,
    );
  }

  return access;
}

/**
 * Assert the actor's org role is strictly higher than the target's
 * (prevents admins from demoting owners, etc.).
 */
export function assertCanManageRole(
  actorRole: OrgRole,
  targetRole: OrgRole,
): void {
  const rank: Record<OrgRole, number> = {
    OWNER: 4,
    ADMIN: 3,
    MEMBER: 2,
    VIEWER: 1,
  };

  if (actorRole === "OWNER") return;

  if (rank[actorRole] <= rank[targetRole]) {
    throw new AuthorizationError(
      "You cannot manage a member with an equal or higher role",
    );
  }
}
