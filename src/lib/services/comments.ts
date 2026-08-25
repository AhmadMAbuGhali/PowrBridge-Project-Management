import { prisma } from "@/lib/db/prisma";
import { requireProjectPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/services/activity";
import { createNotification } from "@/lib/services/notifications";
import { publishRealtime } from "@/lib/realtime/bus";
import { z } from "zod";

export const createCommentSchema = z.object({
  body: z.string().trim().min(1).max(10_000),
  parentId: z.string().cuid().optional().nullable(),
});

export async function getTaskDetail(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: {
      id: true,
      projectId: true,
      number: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      position: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: { id: true, name: true, email: true, image: true },
      },
      assignees: {
        select: {
          user: { select: { id: true, name: true, email: true, image: true } },
        },
      },
      comments: {
        where: { deletedAt: null, parentId: null },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          body: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: { id: true, name: true, email: true, image: true },
          },
          replies: {
            where: { deletedAt: null },
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              body: true,
              createdAt: true,
              author: {
                select: { id: true, name: true, email: true, image: true },
              },
            },
          },
        },
      },
      attachments: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          mimeType: true,
          url: true,
          createdAt: true,
        },
      },
      project: {
        select: { id: true, name: true, organizationId: true, color: true },
      },
    },
  });

  if (!task) throw new Error("Task not found");

  await requireProjectPermission(
    userId,
    task.projectId,
    PERMISSIONS["task:read"],
  );

  return task;
}

export async function addComment(
  userId: string,
  taskId: string,
  raw: z.infer<typeof createCommentSchema>,
) {
  const input = createCommentSchema.parse(raw);

  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: {
      id: true,
      projectId: true,
      number: true,
      title: true,
      createdById: true,
      project: { select: { organizationId: true, name: true } },
      assignees: { select: { userId: true } },
    },
  });

  if (!task) throw new Error("Task not found");

  await requireProjectPermission(
    userId,
    task.projectId,
    PERMISSIONS["task:comment"],
  );

  const comment = await prisma.comment.create({
    data: {
      taskId,
      authorId: userId,
      body: input.body,
      parentId: input.parentId ?? null,
    },
    select: {
      id: true,
      body: true,
      createdAt: true,
      author: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
  });

  await logActivity({
    actorId: userId,
    action: "COMMENTED",
    entityType: "comment",
    entityId: comment.id,
    organizationId: task.project.organizationId,
    projectId: task.projectId,
    taskId,
    metadata: { preview: input.body.slice(0, 120) },
  });

  const notifyIds = new Set<string>([
    task.createdById,
    ...task.assignees.map((a) => a.userId),
  ]);
  notifyIds.delete(userId);

  await Promise.all(
    [...notifyIds].map((uid) =>
      createNotification({
        userId: uid,
        type: "TASK_COMMENT",
        title: `New comment on #${task.number} ${task.title}`,
        body: input.body.slice(0, 140),
        href: `/app/projects/${task.projectId}?task=${taskId}`,
        organizationId: task.project.organizationId,
        projectId: task.projectId,
        taskId,
      }),
    ),
  );

  publishRealtime({
    type: "task.commented",
    organizationId: task.project.organizationId,
    projectId: task.projectId,
    payload: { taskId, comment },
  });

  return comment;
}
