import type { Prisma, TaskStatus } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { requireProjectPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/services/activity";
import { createNotification } from "@/lib/services/notifications";
import { publishRealtime } from "@/lib/realtime/bus";
import type {
  CreateTaskInput,
  MoveTaskInput,
  UpdateTaskInput,
} from "@/lib/validations/project";

const taskSelect = {
  id: true,
  projectId: true,
  number: true,
  title: true,
  description: true,
  status: true,
  priority: true,
  dueDate: true,
  position: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
  assignees: {
    select: {
      user: {
        select: { id: true, name: true, image: true, email: true },
      },
    },
  },
} satisfies Prisma.TaskSelect;

export type TaskDTO = Prisma.TaskGetPayload<{ select: typeof taskSelect }>;

async function getProjectOrg(projectId: string) {
  return prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: { id: true, organizationId: true, name: true },
  });
}

export async function listTasks(userId: string, projectId: string) {
  await requireProjectPermission(userId, projectId, PERMISSIONS["task:read"]);

  return prisma.task.findMany({
    where: { projectId, deletedAt: null, parentId: null },
    orderBy: [{ status: "asc" }, { position: "asc" }],
    select: taskSelect,
  });
}

export async function createTask(
  userId: string,
  projectId: string,
  input: CreateTaskInput,
) {
  await requireProjectPermission(userId, projectId, PERMISSIONS["task:create"]);
  const project = await getProjectOrg(projectId);
  if (!project) throw new Error("Project not found");

  const last = await prisma.task.findFirst({
    where: { projectId },
    orderBy: { number: "desc" },
    select: { number: true },
  });

  const maxPos = await prisma.task.aggregate({
    where: { projectId, status: input.status, deletedAt: null },
    _max: { position: true },
  });

  const position = input.position ?? (maxPos._max.position ?? 0) + 1000;

  const task = await prisma.task.create({
    data: {
      projectId,
      number: (last?.number ?? 0) + 1,
      title: input.title,
      description: input.description,
      status: input.status,
      priority: input.priority,
      dueDate: input.dueDate ?? null,
      parentId: input.parentId ?? null,
      position,
      createdById: userId,
      assignees: input.assigneeIds?.length
        ? { create: input.assigneeIds.map((id) => ({ userId: id })) }
        : undefined,
    },
    select: taskSelect,
  });

  await logActivity({
    actorId: userId,
    action: "CREATED",
    entityType: "task",
    entityId: task.id,
    organizationId: project.organizationId,
    projectId,
    taskId: task.id,
    metadata: { title: task.title, status: task.status },
  });

  if (input.assigneeIds?.length) {
    await Promise.all(
      input.assigneeIds
        .filter((id) => id !== userId)
        .map((assigneeId) =>
          createNotification({
            userId: assigneeId,
            type: "TASK_ASSIGNED",
            title: `Assigned to #${task.number} ${task.title}`,
            body: `In ${project.name}`,
            href: `/app/projects/${projectId}`,
            organizationId: project.organizationId,
            projectId,
            taskId: task.id,
          }),
        ),
    );
  }

  publishRealtime({
    type: "task.created",
    organizationId: project.organizationId,
    projectId,
    payload: task,
  });

  return task;
}

export async function updateTask(
  userId: string,
  taskId: string,
  input: UpdateTaskInput,
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: { id: true, projectId: true, status: true, title: true },
  });

  if (!existing) throw new Error("Task not found");

  await requireProjectPermission(
    userId,
    existing.projectId,
    PERMISSIONS["task:update"],
  );

  const project = await getProjectOrg(existing.projectId);
  if (!project) throw new Error("Project not found");

  const task = await prisma.$transaction(async (tx) => {
    if (input.assigneeIds) {
      await tx.taskAssignee.deleteMany({ where: { taskId } });
      if (input.assigneeIds.length) {
        await tx.taskAssignee.createMany({
          data: input.assigneeIds.map((id) => ({ taskId, userId: id })),
        });
      }
    }

    const nextStatus = input.status;

    return tx.task.update({
      where: { id: taskId },
      data: {
        title: input.title,
        description: input.description,
        status: nextStatus,
        priority: input.priority,
        dueDate: input.dueDate === undefined ? undefined : input.dueDate,
        position: input.position,
        completedAt:
          nextStatus === "DONE" ? new Date() : nextStatus ? null : undefined,
      },
      select: taskSelect,
    });
  });

  const action =
    input.status && input.status !== existing.status
      ? "STATUS_CHANGED"
      : input.assigneeIds
        ? "ASSIGNED"
        : "UPDATED";

  await logActivity({
    actorId: userId,
    action,
    entityType: "task",
    entityId: task.id,
    organizationId: project.organizationId,
    projectId: existing.projectId,
    taskId: task.id,
    metadata: {
      from: existing.status,
      to: task.status,
      title: task.title,
    },
  });

  publishRealtime({
    type: "task.updated",
    organizationId: project.organizationId,
    projectId: existing.projectId,
    payload: task,
  });

  return task;
}

export async function moveTask(
  userId: string,
  taskId: string,
  input: MoveTaskInput,
) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: { id: true, projectId: true, status: true, title: true, number: true },
  });

  if (!existing) throw new Error("Task not found");

  await requireProjectPermission(
    userId,
    existing.projectId,
    PERMISSIONS["task:update"],
  );

  const project = await getProjectOrg(existing.projectId);
  if (!project) throw new Error("Project not found");

  const task = await prisma.task.update({
    where: { id: taskId },
    data: {
      status: input.status as TaskStatus,
      position: input.position,
      completedAt: input.status === "DONE" ? new Date() : null,
    },
    select: taskSelect,
  });

  await logActivity({
    actorId: userId,
    action: "STATUS_CHANGED",
    entityType: "task",
    entityId: task.id,
    organizationId: project.organizationId,
    projectId: existing.projectId,
    taskId: task.id,
    metadata: {
      from: existing.status,
      to: input.status,
      title: existing.title,
    },
  });

  publishRealtime({
    type: "task.moved",
    organizationId: project.organizationId,
    projectId: existing.projectId,
    payload: task,
  });

  return task;
}

export async function deleteTask(userId: string, taskId: string) {
  const existing = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: { id: true, projectId: true, title: true },
  });

  if (!existing) throw new Error("Task not found");

  await requireProjectPermission(
    userId,
    existing.projectId,
    PERMISSIONS["task:delete"],
  );

  const project = await getProjectOrg(existing.projectId);

  await prisma.task.update({
    where: { id: taskId },
    data: { deletedAt: new Date() },
  });

  if (project) {
    await logActivity({
      actorId: userId,
      action: "DELETED",
      entityType: "task",
      entityId: taskId,
      organizationId: project.organizationId,
      projectId: existing.projectId,
      taskId,
      metadata: { title: existing.title },
    });

    publishRealtime({
      type: "task.deleted",
      organizationId: project.organizationId,
      projectId: existing.projectId,
      payload: { id: taskId },
    });
  }
}
