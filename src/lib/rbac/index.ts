export {
  PERMISSIONS,
  ORG_ROLE_PERMISSIONS,
  PROJECT_ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  roleAtLeast,
  orgRoleHasPermission,
  projectRoleHasPermission,
  type Permission,
} from "./permissions";

export {
  AuthorizationError,
  AuthenticationError,
  NotFoundError,
  getOrgMembership,
  getProjectAccess,
  canOrg,
  canProject,
  requireOrgPermission,
  requireProjectPermission,
  assertCanManageRole,
  type OrgMembershipContext,
  type ProjectMembershipContext,
} from "./guard";

export { withOrgPermission, withProjectPermission, handleRbacError } from "./api";
