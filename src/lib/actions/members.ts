"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import {
  acceptInvite,
  inviteOrgMember,
  listOrgInvites,
  listOrgMembers,
} from "@/lib/services/members";
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

export async function listMembersAction() {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) return { error: "No organization", data: [], invites: [] };

  try {
    const canInvite = ["OWNER", "ADMIN"].includes(
      session.user.activeOrganizationRole ?? "",
    );
    const [data, invites] = await Promise.all([
      listOrgMembers(session.user.id, organizationId),
      canInvite
        ? listOrgInvites(session.user.id, organizationId)
        : Promise.resolve([]),
    ]);
    return { data, invites };
  } catch (error) {
    return { error: toErrorMessage(error), data: [], invites: [] };
  }
}

export async function inviteMemberAction(formData: FormData) {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) return { error: "No organization" };

  try {
    const invite = await inviteOrgMember(session.user.id, organizationId, {
      email: String(formData.get("email") ?? ""),
      role: (formData.get("role") as "ADMIN" | "MEMBER" | "VIEWER") || "MEMBER",
    });
    revalidatePath("/app/settings/members");
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    return {
      data: invite,
      inviteUrl: `${appUrl}/invite/${invite.token}`,
    };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}

export async function acceptInviteAction(token: string) {
  const session = await requireSession();
  try {
    const result = await acceptInvite(session.user.id, token);
    revalidatePath("/app");
    return { data: result };
  } catch (error) {
    return { error: toErrorMessage(error) };
  }
}
