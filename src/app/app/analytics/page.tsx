import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { getOrganizationAnalytics } from "@/lib/services/analytics";
import { AnalyticsDashboard } from "@/components/analytics/analytics-dashboard";

export default async function AnalyticsPage() {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) redirect("/register");

  const data = await getOrganizationAnalytics(session.user.id, organizationId);
  return <AnalyticsDashboard data={data} />;
}
