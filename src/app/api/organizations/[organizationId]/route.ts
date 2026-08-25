import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { withOrgPermission, PERMISSIONS } from "@/lib/rbac";

/**
 * GET /api/organizations/:organizationId
 * Requires org:read
 */
export const GET = withOrgPermission(
  PERMISSIONS["org:read"],
  async ({ membership }) => {
    const organization = await prisma.organization.findFirst({
      where: {
        id: membership.organizationId,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        createdAt: true,
        subscription: {
          select: {
            status: true,
            billingInterval: true,
            currentPeriodEnd: true,
            plan: {
              select: {
                name: true,
                tier: true,
                features: true,
              },
            },
          },
        },
        _count: {
          select: {
            members: true,
            projects: true,
            teams: true,
          },
        },
      },
    });

    if (!organization) {
      return NextResponse.json(
        { error: "Organization not found", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      data: organization,
      meta: { role: membership.role },
    });
  },
);
