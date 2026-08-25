import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { listProjects } from "@/lib/services/projects";
import { ProjectsView } from "@/components/projects/projects-view";

export default async function AppDashboardPage() {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;

  if (!organizationId) {
    redirect("/register");
  }

  const projects = await listProjects(session.user.id, organizationId);

  return <ProjectsView projects={projects} />;
}
