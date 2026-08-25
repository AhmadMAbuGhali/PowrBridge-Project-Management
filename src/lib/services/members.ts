import { prisma } from "@/lib/db/prisma";
import { requireOrgPermission, assertCanManageRole } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { createNotification } from "@/lib/services/notifications";
import { logActivity } from "@/lib/services/activity";
import type { OrgRole } from "@prisma/client";
import { inviteMemberSchema } from "@/lib/validations/auth";

export async function listOrgMembers(userId: string, organizationId: string) {
  await requireOrgPermission(userId, organizationId, PERMISSIONS["org:read"]);

  return prisma.organizationMember.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { joinedAt: "asc" },
    select: {
      id: true,
      role: true,
      joinedAt: true,
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });
}

export async function listOrgInvites(userId: string, organizationId: string) {
  await requireOrgPermission(
    userId,
    organizationId,
    PERMISSIONS["org:manage_members"],
  );

  return prisma.organizationInvite.findMany({
    where: { organizationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
    },
  });
}

export async function inviteOrgMember(
  actorId: string,
  organizationId: string,
  raw: { email: string; role?: "ADMIN" | "MEMBER" | "VIEWER" },
) {
  const membership = await requireOrgPermission(
    actorId,
    organizationId,
    PERMISSIONS["org:invite"],
  );

  const input = inviteMemberSchema.parse(raw);
  assertCanManageRole(membership.role, input.role);

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existingUser) {
    const already = await prisma.organizationMember.findFirst({
      where: {
        organizationId,
        userId: existingUser.id,
        deletedAt: null,
      },
    });
    if (already) throw new Error("User is already a member");
  }

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invite = await prisma.organizationInvite.upsert({
    where: {
      organizationId_email: { organizationId, email: input.email },
    },
    create: {
      organizationId,
      email: input.email,
      role: input.role,
      invitedById: actorId,
      expiresAt,
      status: "PENDING",
      token: crypto.randomUUID().replaceAll("-", ""),
    },
    update: {
      role: input.role,
      invitedById: actorId,
      expiresAt,
      status: "PENDING",
      token: crypto.randomUUID().replaceAll("-", ""),
    },
    select: {
      id: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
    },
  });

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true },
  });

  if (existingUser) {
    await createNotification({
      userId: existingUser.id,
      type: "ORG_INVITE",
      title: `Invite to ${org?.name ?? "workspace"}`,
      body: `You were invited as ${input.role}`,
      href: `/invite/${invite.token}`,
      organizationId,
    });
  }

  await logActivity({
    actorId,
    action: "MEMBER_ADDED",
    entityType: "invite",
    entityId: invite.id,
    organizationId,
    metadata: { email: input.email, role: input.role },
  });

  return invite;
}

export async function acceptInvite(userId: string, token: string) {
  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    include: {
      organization: { select: { id: true, name: true, deletedAt: true } },
    },
  });

  if (!invite || invite.status !== "PENDING") {
    throw new Error("Invite is invalid or already used");
  }
  if (invite.expiresAt < new Date()) {
    await prisma.organizationInvite.update({
      where: { id: invite.id },
      data: { status: "EXPIRED" },
    });
    throw new Error("Invite has expired");
  }
  if (invite.organization.deletedAt) {
    throw new Error("Organization no longer exists");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
    throw new Error("Sign in with the invited email address to accept");
  }

  await prisma.$transaction(async (tx) => {
    await tx.organizationMember.upsert({
      where: {
        organizationId_userId: {
          organizationId: invite.organizationId,
          userId,
        },
      },
      create: {
        organizationId: invite.organizationId,
        userId,
        role: invite.role,
      },
      update: {
        role: invite.role,
        deletedAt: null,
      },
    });

    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: { status: "ACCEPTED" },
    });
  });

  return {
    organizationId: invite.organizationId,
    organizationName: invite.organization.name,
    role: invite.role as OrgRole,
  };
}

export async function getInvitePreview(token: string) {
  const invite = await prisma.organizationInvite.findUnique({
    where: { token },
    select: {
      email: true,
      role: true,
      status: true,
      expiresAt: true,
      organization: { select: { name: true, slug: true } },
    },
  });
  return invite;
}
