import { prisma } from "@/lib/db/prisma";
import { requireOrgPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";

export async function getOrganizationAnalytics(
  userId: string,
  organizationId: string,
) {
  await requireOrgPermission(userId, organizationId, PERMISSIONS["org:read"]);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    projectCount,
    taskTotal,
    taskDone,
    taskOverdue,
    tasksByStatus,
    tasksByPriority,
    completedThisWeek,
    createdThisWeek,
    workload,
  ] = await Promise.all([
    prisma.project.count({
      where: { organizationId, deletedAt: null, isArchived: false },
    }),
    prisma.task.count({
      where: { deletedAt: null, project: { organizationId, deletedAt: null } },
    }),
    prisma.task.count({
      where: {
        deletedAt: null,
        status: "DONE",
        project: { organizationId, deletedAt: null },
      },
    }),
    prisma.task.count({
      where: {
        deletedAt: null,
        status: { notIn: ["DONE", "CANCELLED"] },
        dueDate: { lt: now },
        project: { organizationId, deletedAt: null },
      },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: {
        deletedAt: null,
        project: { organizationId, deletedAt: null },
      },
      _count: { _all: true },
    }),
    prisma.task.groupBy({
      by: ["priority"],
      where: {
        deletedAt: null,
        project: { organizationId, deletedAt: null },
      },
      _count: { _all: true },
    }),
    prisma.task.count({
      where: {
        deletedAt: null,
        status: "DONE",
        completedAt: { gte: weekAgo },
        project: { organizationId, deletedAt: null },
      },
    }),
    prisma.task.count({
      where: {
        deletedAt: null,
        createdAt: { gte: weekAgo },
        project: { organizationId, deletedAt: null },
      },
    }),
    prisma.taskAssignee.groupBy({
      by: ["userId"],
      where: {
        task: {
          deletedAt: null,
          status: { notIn: ["DONE", "CANCELLED"] },
          project: { organizationId, deletedAt: null },
        },
      },
      _count: { _all: true },
    }),
  ]);

  const assigneeIds = workload.map((w) => w.userId);
  const users = assigneeIds.length
    ? await prisma.user.findMany({
        where: { id: { in: assigneeIds } },
        select: { id: true, name: true, email: true, image: true },
      })
    : [];

  const userMap = new Map(users.map((u) => [u.id, u]));

  return {
    projectCount,
    taskTotal,
    taskDone,
    taskOverdue,
    completionRate: taskTotal === 0 ? 0 : Math.round((taskDone / taskTotal) * 100),
    velocity: {
      completedThisWeek,
      createdThisWeek,
    },
    tasksByStatus: Object.fromEntries(
      tasksByStatus.map((row) => [row.status, row._count._all]),
    ),
    tasksByPriority: Object.fromEntries(
      tasksByPriority.map((row) => [row.priority, row._count._all]),
    ),
    workload: workload
      .map((row) => ({
        user: userMap.get(row.userId) ?? {
          id: row.userId,
          name: "Unknown",
          email: "",
          image: null,
        },
        openTasks: row._count._all,
      }))
      .sort((a, b) => b.openTasks - a.openTasks),
  };
}

export async function listOrganizationCalendarTasks(
  userId: string,
  organizationId: string,
  rangeStart: Date,
  rangeEnd: Date,
) {
  await requireOrgPermission(userId, organizationId, PERMISSIONS["task:read"]);

  return prisma.task.findMany({
    where: {
      deletedAt: null,
      dueDate: { gte: rangeStart, lte: rangeEnd },
      project: { organizationId, deletedAt: null },
    },
    orderBy: { dueDate: "asc" },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      number: true,
      project: {
        select: { id: true, name: true, color: true },
      },
    },
  });
}
