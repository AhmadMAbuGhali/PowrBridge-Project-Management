import { requireSession } from "@/lib/auth/session";
import { listOrganizationCalendarTasks } from "@/lib/services/analytics";
import { CalendarView } from "@/components/calendar/calendar-view";
import { redirect } from "next/navigation";

export default async function CalendarPage() {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) redirect("/register");

  const now = new Date();
  const tasks = await listOrganizationCalendarTasks(
    session.user.id,
    organizationId,
    new Date(now.getFullYear(), now.getMonth() - 2, 1),
    new Date(now.getFullYear(), now.getMonth() + 3, 0),
  );

  return <CalendarView tasks={tasks} />;
}
