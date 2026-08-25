import { randomUUID } from "crypto";
import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db/prisma";
import { requireProjectPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/services/activity";
import { publishRealtime } from "@/lib/realtime/bus";

const MAX_BYTES = 10 * 1024 * 1024; // 10MB
const LOCAL_DIR = path.join(process.cwd(), "storage", "uploads");

export async function listAttachments(userId: string, taskId: string) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: { projectId: true },
  });
  if (!task) throw new Error("Task not found");

  await requireProjectPermission(userId, task.projectId, PERMISSIONS["task:read"]);

  return prisma.attachment.findMany({
    where: { taskId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      url: true,
      createdAt: true,
      uploadedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

export async function uploadAttachment(
  userId: string,
  taskId: string,
  file: { name: string; type: string; size: number; bytes: Buffer },
) {
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw new Error("File must be between 1 byte and 10MB");
  }

  const task = await prisma.task.findFirst({
    where: { id: taskId, deletedAt: null },
    select: {
      id: true,
      projectId: true,
      project: { select: { organizationId: true } },
    },
  });
  if (!task) throw new Error("Task not found");

  await requireProjectPermission(
    userId,
    task.projectId,
    PERMISSIONS["task:attach"],
  );

  const ext = path.extname(file.name).slice(0, 20);
  const storageKey = `${task.project.organizationId}/${taskId}/${randomUUID()}${ext}`;
  const localName = storageKey.replaceAll("/", "__");

  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(path.join(LOCAL_DIR, localName), file.bytes);

  const url = `/api/attachments/file/${encodeURIComponent(localName)}`;

  const attachment = await prisma.attachment.create({
    data: {
      taskId,
      uploadedById: userId,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
      storageKey,
      url,
    },
    select: {
      id: true,
      fileName: true,
      fileSize: true,
      mimeType: true,
      url: true,
      createdAt: true,
    },
  });

  await logActivity({
    actorId: userId,
    action: "ATTACHMENT_ADDED",
    entityType: "attachment",
    entityId: attachment.id,
    organizationId: task.project.organizationId,
    projectId: task.projectId,
    taskId,
    metadata: { fileName: attachment.fileName, fileSize: attachment.fileSize },
  });

  publishRealtime({
    type: "task.attachment",
    organizationId: task.project.organizationId,
    projectId: task.projectId,
    payload: { taskId, attachment },
  });

  return attachment;
}

export async function deleteAttachment(userId: string, attachmentId: string) {
  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, deletedAt: null },
    select: {
      id: true,
      storageKey: true,
      fileName: true,
      taskId: true,
      task: {
        select: {
          projectId: true,
          project: { select: { organizationId: true } },
        },
      },
    },
  });

  if (!attachment) throw new Error("Attachment not found");

  await requireProjectPermission(
    userId,
    attachment.task.projectId,
    PERMISSIONS["task:attach"],
  );

  await prisma.attachment.update({
    where: { id: attachmentId },
    data: { deletedAt: new Date() },
  });

  const localName = attachment.storageKey.replaceAll("/", "__");
  await unlink(path.join(LOCAL_DIR, localName)).catch(() => undefined);

  await logActivity({
    actorId: userId,
    action: "ATTACHMENT_REMOVED",
    entityType: "attachment",
    entityId: attachmentId,
    organizationId: attachment.task.project.organizationId,
    projectId: attachment.task.projectId,
    taskId: attachment.taskId,
    metadata: { fileName: attachment.fileName },
  });
}
