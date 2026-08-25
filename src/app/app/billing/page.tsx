import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { requireOrgPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { BillingActions } from "@/components/billing/billing-actions";

type PageProps = {
  searchParams: Promise<{ checkout?: string }>;
};

export default async function BillingPage({ searchParams }: PageProps) {
  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) redirect("/register");

  await requireOrgPermission(
    session.user.id,
    organizationId,
    PERMISSIONS["org:read"],
  );

  const { checkout } = await searchParams;

  const [plans, subscription] = await Promise.all([
    prisma.plan.findMany({
      where: { isActive: true },
      orderBy: { priceMonthly: "asc" },
    }),
    prisma.subscription.findUnique({
      where: { organizationId },
      include: { plan: true },
    }),
  ]);

  const canManageBilling = ["OWNER", "ADMIN"].includes(
    session.user.activeOrganizationRole ?? "",
  );

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="text-sm text-muted">
          Current plan:{" "}
          <span className="font-medium text-foreground">
            {subscription?.plan.name ?? "Free"}
          </span>{" "}
          · {subscription?.status ?? "ACTIVE"}
        </p>
        {checkout === "success" ? (
          <p className="mt-2 text-sm text-accent">Checkout completed successfully.</p>
        ) : null}
        {checkout === "cancel" ? (
          <p className="mt-2 text-sm text-muted">Checkout was canceled.</p>
        ) : null}
      </div>

      <BillingActions
        plans={plans}
        activePlanId={subscription?.planId}
        canManageBilling={canManageBilling}
        stripeConfigured={Boolean(process.env.STRIPE_SECRET_KEY)}
        hasCustomer={Boolean(subscription?.stripeCustomerId)}
      />

      <p className="text-xs text-muted">
        Webhooks: <code>/api/webhooks/stripe</code> handles checkout completion,
        invoice paid, and subscription updates/cancellations.
      </p>
    </div>
  );
}
