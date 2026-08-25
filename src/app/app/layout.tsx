import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { listProjects } from "@/lib/services/projects";
import { listUserOrganizations } from "@/lib/services/teams";
import { AppShell } from "@/components/app-shell";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireSession();
  } catch {
    redirect("/login");
  }

  const organizationId = session.user.activeOrganizationId;
  const [projects, organizations] = await Promise.all([
    organizationId
      ? listProjects(session.user.id, organizationId).catch(() => [])
      : Promise.resolve([]),
    listUserOrganizations(session.user.id),
  ]);

  return (
    <AppShell
      session={session}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
      organizations={organizations}
    >
      {children}
    </AppShell>
  );
}
