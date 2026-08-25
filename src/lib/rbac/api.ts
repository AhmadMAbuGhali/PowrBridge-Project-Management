import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import type { AppSession } from "@/lib/auth/types";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  requireOrgPermission,
  requireProjectPermission,
  type OrgMembershipContext,
  type ProjectMembershipContext,
} from "./guard";
import type { Permission } from "./permissions";

type OrgHandler = (ctx: {
  session: AppSession;
  membership: OrgMembershipContext;
  request: Request;
  params: Record<string, string>;
}) => Promise<Response> | Response;

type ProjectHandler = (ctx: {
  session: AppSession;
  access: ProjectMembershipContext;
  request: Request;
  params: Record<string, string>;
}) => Promise<Response> | Response;

/**
 * Wrap a Route Handler with auth + org-scoped RBAC.
 * Expects `organizationId` in route params (or pass `resolveOrgId`).
 */
export function withOrgPermission(
  permission: Permission,
  handler: OrgHandler,
  options?: {
    resolveOrgId?: (
      request: Request,
      params: Record<string, string>,
    ) => string | Promise<string>;
  },
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => {
    try {
      const session = await requireSession();
      const params = await context.params;
      const organizationId = options?.resolveOrgId
        ? await options.resolveOrgId(request, params)
        : params.organizationId;

      if (!organizationId) {
        return NextResponse.json(
          { error: "organizationId is required" },
          { status: 400 },
        );
      }

      const membership = await requireOrgPermission(
        session.user.id,
        organizationId,
        permission,
      );

      return await handler({ session, membership, request, params });
    } catch (error) {
      return handleRbacError(error);
    }
  };
}

/**
 * Wrap a Route Handler with auth + project-scoped RBAC.
 * Expects `projectId` in route params (or pass `resolveProjectId`).
 */
export function withProjectPermission(
  permission: Permission,
  handler: ProjectHandler,
  options?: {
    resolveProjectId?: (
      request: Request,
      params: Record<string, string>,
    ) => string | Promise<string>;
  },
) {
  return async (
    request: Request,
    context: { params: Promise<Record<string, string>> },
  ) => {
    try {
      const session = await requireSession();
      const params = await context.params;
      const projectId = options?.resolveProjectId
        ? await options.resolveProjectId(request, params)
        : params.projectId;

      if (!projectId) {
        return NextResponse.json(
          { error: "projectId is required" },
          { status: 400 },
        );
      }

      const access = await requireProjectPermission(
        session.user.id,
        projectId,
        permission,
      );

      return await handler({ session, access, request, params });
    } catch (error) {
      return handleRbacError(error);
    }
  };
}

export function handleRbacError(error: unknown): NextResponse {
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof NotFoundError
  ) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }

  console.error("[rbac]", error);
  return NextResponse.json(
    { error: "Internal server error", code: "INTERNAL" },
    { status: 500 },
  );
}
