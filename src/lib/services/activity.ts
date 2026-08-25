import type { ActivityAction, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";

type LogActivityInput = {
  actorId: string;
  action: ActivityAction;
  entityType: string;
  entityId: string;
  organizationId?: string | null;
  projectId?: string | null;
  taskId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export async function logActivity(input: LogActivityInput) {
  return prisma.activityLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      organizationId: input.organizationId ?? null,
      projectId: input.projectId ?? null,
      taskId: input.taskId ?? null,
      metadata: input.metadata,
    },
  });
}

export async function listProjectActivity(projectId: string, limit = 50) {
  return prisma.activityLog.findMany({
    where: { projectId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      action: true,
      entityType: true,
      entityId: true,
      metadata: true,
      createdAt: true,
      actor: {
        select: { id: true, name: true, image: true, email: true },
      },
    },
  });
}
