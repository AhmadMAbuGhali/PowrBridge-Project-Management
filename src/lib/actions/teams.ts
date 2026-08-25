"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { createTeam, createTeamSchema, listTeams } from "@/lib/services/teams";
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

export async function listTeamsAction() {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) return { data: [] };

  try {
    const data = await listTeams(session.user.id, organizationId);
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error), data: [] };
  }
}

export async function createTeamAction(formData: FormData) {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) return { error: "No active organization" };

  const parsed = createTeamSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid team" };
  }

  try {
    const data = await createTeam(session.user.id, organizationId, parsed.data);
    revalidatePath("/app/teams");
    return { data };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}
