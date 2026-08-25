import { OrgRole, ProjectRole } from "@prisma/client";

/**
 * Canonical permission keys used across API routes, server actions, and UI.
 * Format: resource:action
 */
export const PERMISSIONS = {
  // Organization
  "org:read": "org:read",
  "org:update": "org:update",
  "org:delete": "org:delete",
  "org:billing": "org:billing",
  "org:invite": "org:invite",
  "org:manage_members": "org:manage_members",

  // Team
  "team:create": "team:create",
  "team:read": "team:read",
  "team:update": "team:update",
  "team:delete": "team:delete",
  "team:manage_members": "team:manage_members",

  // Project
  "project:create": "project:create",
  "project:read": "project:read",
  "project:update": "project:update",
  "project:delete": "project:delete",
  "project:archive": "project:archive",
  "project:manage_members": "project:manage_members",

  // Task
  "task:create": "task:create",
  "task:read": "task:read",
  "task:update": "task:update",
  "task:delete": "task:delete",
  "task:assign": "task:assign",
  "task:comment": "task:comment",
  "task:attach": "task:attach",

  // Activity / notifications (read-scoped)
  "activity:read": "activity:read",
  "notification:read": "notification:read",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Org-level role → permission matrix */
export const ORG_ROLE_PERMISSIONS: Record<OrgRole, readonly Permission[]> = {
  OWNER: Object.values(PERMISSIONS),
  ADMIN: [
    PERMISSIONS["org:read"],
    PERMISSIONS["org:update"],
    PERMISSIONS["org:billing"],
    PERMISSIONS["org:invite"],
    PERMISSIONS["org:manage_members"],
    PERMISSIONS["team:create"],
    PERMISSIONS["team:read"],
    PERMISSIONS["team:update"],
    PERMISSIONS["team:delete"],
    PERMISSIONS["team:manage_members"],
    PERMISSIONS["project:create"],
    PERMISSIONS["project:read"],
    PERMISSIONS["project:update"],
    PERMISSIONS["project:delete"],
    PERMISSIONS["project:archive"],
    PERMISSIONS["project:manage_members"],
    PERMISSIONS["task:create"],
    PERMISSIONS["task:read"],
    PERMISSIONS["task:update"],
    PERMISSIONS["task:delete"],
    PERMISSIONS["task:assign"],
    PERMISSIONS["task:comment"],
    PERMISSIONS["task:attach"],
    PERMISSIONS["activity:read"],
    PERMISSIONS["notification:read"],
  ],
  MEMBER: [
    PERMISSIONS["org:read"],
    PERMISSIONS["team:read"],
    PERMISSIONS["project:create"],
    PERMISSIONS["project:read"],
    PERMISSIONS["project:update"],
    PERMISSIONS["task:create"],
    PERMISSIONS["task:read"],
    PERMISSIONS["task:update"],
    PERMISSIONS["task:assign"],
    PERMISSIONS["task:comment"],
    PERMISSIONS["task:attach"],
    PERMISSIONS["activity:read"],
    PERMISSIONS["notification:read"],
  ],
  VIEWER: [
    PERMISSIONS["org:read"],
    PERMISSIONS["team:read"],
    PERMISSIONS["project:read"],
    PERMISSIONS["task:read"],
    PERMISSIONS["activity:read"],
    PERMISSIONS["notification:read"],
  ],
};

/** Project-level role → permission matrix (scoped to a single project) */
export const PROJECT_ROLE_PERMISSIONS: Record<
  ProjectRole,
  readonly Permission[]
> = {
  ADMIN: [
    PERMISSIONS["project:read"],
    PERMISSIONS["project:update"],
    PERMISSIONS["project:delete"],
    PERMISSIONS["project:archive"],
    PERMISSIONS["project:manage_members"],
    PERMISSIONS["task:create"],
    PERMISSIONS["task:read"],
    PERMISSIONS["task:update"],
    PERMISSIONS["task:delete"],
    PERMISSIONS["task:assign"],
    PERMISSIONS["task:comment"],
    PERMISSIONS["task:attach"],
    PERMISSIONS["activity:read"],
  ],
  MEMBER: [
    PERMISSIONS["project:read"],
    PERMISSIONS["project:update"],
    PERMISSIONS["task:create"],
    PERMISSIONS["task:read"],
    PERMISSIONS["task:update"],
    PERMISSIONS["task:assign"],
    PERMISSIONS["task:comment"],
    PERMISSIONS["task:attach"],
    PERMISSIONS["activity:read"],
  ],
  VIEWER: [
    PERMISSIONS["project:read"],
    PERMISSIONS["task:read"],
    PERMISSIONS["activity:read"],
  ],
};

export const ROLE_HIERARCHY: Record<OrgRole, number> = {
  OWNER: 4,
  ADMIN: 3,
  MEMBER: 2,
  VIEWER: 1,
};

export function roleAtLeast(role: OrgRole, minimum: OrgRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}

export function orgRoleHasPermission(
  role: OrgRole,
  permission: Permission,
): boolean {
  return ORG_ROLE_PERMISSIONS[role].includes(permission);
}

export function projectRoleHasPermission(
  role: ProjectRole,
  permission: Permission,
): boolean {
  return PROJECT_ROLE_PERMISSIONS[role].includes(permission);
}
