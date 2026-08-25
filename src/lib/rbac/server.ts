/**
 * Convenient server-side entry for auth + RBAC checks.
 * Prefer these helpers in Server Actions and RSC loaders.
 */
export {
  requireOrgPermission,
  requireProjectPermission,
  canOrg,
  canProject,
  getOrgMembership,
  getProjectAccess,
  assertCanManageRole,
  AuthorizationError,
  AuthenticationError,
  NotFoundError,
  PERMISSIONS,
  type Permission,
} from "@/lib/rbac";

export {
  requireSession,
  getSession,
  getCurrentUserId,
  requireActiveOrganization,
  auth,
} from "@/lib/auth";
