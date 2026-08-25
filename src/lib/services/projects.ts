import { prisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils";
import { requireOrgPermission, requireProjectPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/services/activity";
import { publishRealtime } from "@/lib/realtime/bus";
import type {
  CreateProjectInput,
  UpdateProjectInput,
} from "@/lib/validations/project";

export async function listProjects(userId: string, organizationId: string) {
  await requireOrgPermission(userId, organizationId, PERMISSIONS["project:read"]);

  return prisma.project.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      color: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { tasks: true, members: true } },
    },
  });
}

export async function getProject(userId: string, projectId: string) {
  await requireProjectPermission(userId, projectId, PERMISSIONS["project:read"]);

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      organizationId: true,
      name: true,
      slug: true,
      description: true,
      color: true,
      isArchived: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!project) {
    throw new Error("Project not found");
  }

  return project;
}

export async function createProject(
  userId: string,
  organizationId: string,
  input: CreateProjectInput,
) {
  await requireOrgPermission(
    userId,
    organizationId,
    PERMISSIONS["project:create"],
  );

  const baseSlug = slugify(input.name) || "project";
  let slug = baseSlug;
  let attempt = 0;

  while (
    await prisma.project.findUnique({
      where: {
        organizationId_slug: { organizationId, slug },
      },
      select: { id: true },
    })
  ) {
    attempt += 1;
    slug = `${baseSlug}-${attempt}`;
  }

  const project = await prisma.project.create({
    data: {
      organizationId,
      name: input.name,
      slug,
      description: input.description,
      color: input.color ?? "#0F766E",
      teamId: input.teamId ?? null,
      createdById: userId,
      members: {
        create: {
          userId,
          role: "ADMIN",
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      description: true,
    },
  });

  await logActivity({
    actorId: userId,
    action: "CREATED",
    entityType: "project",
    entityId: project.id,
    organizationId,
    projectId: project.id,
    metadata: { name: project.name },
  });

  publishRealtime({
    type: "project.created",
    organizationId,
    projectId: project.id,
    payload: project,
  });

  return project;
}

export async function updateProject(
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  await requireProjectPermission(
    userId,
    projectId,
    PERMISSIONS["project:update"],
  );

  return prisma.project.update({
    where: { id: projectId },
    data: {
      name: input.name,
      description: input.description,
      color: input.color,
      teamId: input.teamId === undefined ? undefined : input.teamId,
      isArchived: input.isArchived,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      color: true,
      description: true,
      isArchived: true,
    },
  });
}
