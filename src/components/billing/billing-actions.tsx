"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import {
  createBillingPortalAction,
  createCheckoutSessionAction,
} from "@/lib/actions/billing";
import { Button } from "@/components/ui/button";

export function BillingActions({
  plans,
  activePlanId,
  canManageBilling,
  stripeConfigured,
  hasCustomer,
}: {
  plans: Array<{
    id: string;
    name: string;
    description: string | null;
    tier: string;
    priceMonthly: number;
    features: unknown;
  }>;
  activePlanId?: string;
  canManageBilling: boolean;
  stripeConfigured: boolean;
  hasCustomer: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function upgrade(tier: "PRO" | "ENTERPRISE") {
    startTransition(async () => {
      const result = await createCheckoutSessionAction(tier);
      if (result?.error) toast.error(result.error);
    });
  }

  function openPortal() {
    startTransition(async () => {
      const result = await createBillingPortalAction();
      if (result?.error) toast.error(result.error);
    });
  }

  return (
    <>
      {canManageBilling && hasCustomer ? (
        <div className="mb-2 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={openPortal}
          >
            Open customer portal
          </Button>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => {
          const features = Array.isArray(plan.features)
            ? (plan.features as string[])
            : [];
          const active = activePlanId === plan.id;
          return (
            <div
              key={plan.id}
              className={`rounded-lg border bg-card p-5 ${
                active ? "border-accent" : "border-border"
              }`}
            >
              <h2 className="text-lg font-semibold">{plan.name}</h2>
              <p className="mt-1 text-sm text-muted">{plan.description}</p>
              <p className="mt-4 text-3xl font-semibold tracking-tight">
                {plan.priceMonthly === 0
                  ? "Free"
                  : `$${(plan.priceMonthly / 100).toFixed(0)}`}
                {plan.priceMonthly > 0 ? (
                  <span className="text-sm font-normal text-muted">/mo</span>
                ) : null}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-muted">
                {features.map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
              {plan.tier === "FREE" || active ? (
                <Button className="mt-6 w-full" variant="secondary" disabled>
                  {active ? "Current plan" : "Included"}
                </Button>
              ) : (
                <Button
                  className="mt-6 w-full"
                  disabled={!canManageBilling || !stripeConfigured || pending}
                  onClick={() =>
                    upgrade(plan.tier as "PRO" | "ENTERPRISE")
                  }
                >
                  {!stripeConfigured
                    ? "Configure Stripe to upgrade"
                    : canManageBilling
                      ? "Upgrade"
                      : "Admin required"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
