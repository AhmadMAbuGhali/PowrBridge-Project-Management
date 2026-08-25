import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { listOrgInvites, listOrgMembers } from "@/lib/services/members";
import { MembersView } from "@/components/settings/members-view";

export default async function MembersPage() {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) redirect("/register");

  const canInvite = ["OWNER", "ADMIN"].includes(
    session.user.activeOrganizationRole ?? "",
  );

  const [members, invites] = await Promise.all([
    listOrgMembers(session.user.id, organizationId),
    canInvite
      ? listOrgInvites(session.user.id, organizationId)
      : Promise.resolve([]),
  ]);

  return (
    <MembersView
      members={members}
      invites={invites}
      canInvite={canInvite}
      appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
    />
  );
}
