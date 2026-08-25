"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import {
  createProject,
  listProjects,
  updateProject,
} from "@/lib/services/projects";
import {
  createTask,
  deleteTask,
  listTasks,
  moveTask,
  updateTask,
} from "@/lib/services/tasks";
import {
  createProjectSchema,
  createTaskSchema,
  moveTaskSchema,
  updateProjectSchema,
  updateTaskSchema,
} from "@/lib/validations/project";
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
} from "@/lib/rbac/guard";

function toErrorMessage(error: unknown): string {
  if (
    error instanceof AuthenticationError ||
    error instanceof AuthorizationError ||
    error instanceof NotFoundError
  ) {
    return error.message;
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}

export async function createProjectAction(formData: FormData) {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) {
    return { error: "No active organization" };
  }

  const parsed = createProjectSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
    color: formData.get("color") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid project" };
  }

  try {
    const project = await createProject(
      session.user.id,
      organizationId,
      parsed.data,
    );
    revalidatePath("/app");
    return { data: project };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}

export async function getProjectsAction() {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) return { data: [] };

  try {
    const data = await listProjects(session.user.id, organizationId);
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error), data: [] };
  }
}

export async function updateProjectAction(
  projectId: string,
  input: unknown,
) {
  const session = await requireSession();
  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid project" };
  }

  try {
    const data = await updateProject(session.user.id, projectId, parsed.data);
    revalidatePath("/app");
    revalidatePath(`/app/projects/${projectId}`);
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}

export async function getTasksAction(projectId: string) {
  const session = await requireSession();
  try {
    const data = await listTasks(session.user.id, projectId);
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error), data: [] };
  }
}

export async function createTaskAction(projectId: string, formData: FormData) {
  const session = await requireSession();
  const dueRaw = formData.get("dueDate");
  const parsed = createTaskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    status: formData.get("status") || "TODO",
    priority: formData.get("priority") || "MEDIUM",
    dueDate: dueRaw ? String(dueRaw) : undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid task" };
  }

  try {
    const data = await createTask(session.user.id, projectId, parsed.data);
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath("/app/calendar");
    revalidatePath("/app/analytics");
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}

export async function updateTaskAction(taskId: string, input: unknown) {
  const session = await requireSession();
  const parsed = updateTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid task" };
  }

  try {
    const data = await updateTask(session.user.id, taskId, parsed.data);
    revalidatePath(`/app/projects/${data.projectId}`);
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}

export async function moveTaskAction(taskId: string, input: unknown) {
  const session = await requireSession();
  const parsed = moveTaskSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid move" };
  }

  try {
    const data = await moveTask(session.user.id, taskId, parsed.data);
    revalidatePath(`/app/projects/${data.projectId}`);
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}

export async function deleteTaskAction(taskId: string, projectId: string) {
  const session = await requireSession();
  try {
    await deleteTask(session.user.id, taskId);
    revalidatePath(`/app/projects/${projectId}`);
    revalidatePath("/app/calendar");
    revalidatePath("/app/analytics");
    return { success: true };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}

export async function getTaskDetailAction(taskId: string) {
  const session = await requireSession();
  try {
    const { getTaskDetail } = await import("@/lib/services/comments");
    const data = await getTaskDetail(session.user.id, taskId);
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}

export async function addCommentAction(taskId: string, formData: FormData) {
  const session = await requireSession();
  const { addComment, createCommentSchema } = await import(
    "@/lib/services/comments"
  );
  const parsed = createCommentSchema.safeParse({
    body: formData.get("body"),
    parentId: formData.get("parentId") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid comment" };
  }

  try {
    const data = await addComment(session.user.id, taskId, parsed.data);
    const detail = await (
      await import("@/lib/services/comments")
    ).getTaskDetail(session.user.id, taskId);
    revalidatePath(`/app/projects/${detail.projectId}`);
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}
