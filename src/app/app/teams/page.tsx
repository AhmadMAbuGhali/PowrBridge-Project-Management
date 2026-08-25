import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { listTeams } from "@/lib/services/teams";
import { TeamsView } from "@/components/teams/teams-view";

export default async function TeamsPage() {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) redirect("/register");

  const teams = await listTeams(session.user.id, organizationId);
  return <TeamsView teams={teams} />;
}
