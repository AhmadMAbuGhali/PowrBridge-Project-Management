import { prisma } from "@/lib/db/prisma";
import { requireOrgPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { slugify } from "@/lib/utils";
import { logActivity } from "@/lib/services/activity";
import { z } from "zod";

export const createTeamSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).optional(),
});

export async function listTeams(userId: string, organizationId: string) {
  await requireOrgPermission(userId, organizationId, PERMISSIONS["team:read"]);

  return prisma.team.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      createdAt: true,
      _count: { select: { members: true, projects: true } },
    },
  });
}

export async function createTeam(
  userId: string,
  organizationId: string,
  raw: z.infer<typeof createTeamSchema>,
) {
  await requireOrgPermission(userId, organizationId, PERMISSIONS["team:create"]);
  const input = createTeamSchema.parse(raw);

  const baseSlug = slugify(input.name) || "team";
  let slug = baseSlug;
  let attempt = 0;
  while (
    await prisma.team.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
      select: { id: true },
    })
  ) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const team = await prisma.team.create({
    data: {
      organizationId,
      name: input.name,
      slug,
      description: input.description,
      members: { create: { userId } },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
    },
  });

  await logActivity({
    actorId: userId,
    action: "CREATED",
    entityType: "team",
    entityId: team.id,
    organizationId,
    metadata: { name: team.name },
  });

  return team;
}

export async function listUserOrganizations(userId: string) {
  return prisma.organizationMember.findMany({
    where: { userId, deletedAt: null, organization: { deletedAt: null } },
    orderBy: { joinedAt: "asc" },
    select: {
      role: true,
      organization: {
        select: { id: true, name: true, slug: true },
      },
    },
  });
}
