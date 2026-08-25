"use server";

import { redirect } from "next/navigation";
import Stripe from "stripe";
import { requireSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { requireOrgPermission } from "@/lib/rbac/guard";
import { PERMISSIONS } from "@/lib/rbac/permissions";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function createCheckoutSessionAction(planTier: "PRO" | "ENTERPRISE") {
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe is not configured. Set STRIPE_SECRET_KEY in .env." };
  }

  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) return { error: "No active organization" };

  await requireOrgPermission(
    session.user.id,
    organizationId,
    PERMISSIONS["org:billing"],
  );

  const plan = await prisma.plan.findUnique({ where: { tier: planTier } });
  if (!plan) return { error: "Plan not found" };

  const priceId =
    plan.stripePriceMonthlyId ||
    (planTier === "PRO"
      ? process.env.STRIPE_PRICE_PRO_MONTHLY
      : process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY);

  if (!priceId) {
    return {
      error:
        "Missing Stripe price ID. Set STRIPE_PRICE_PRO_MONTHLY / ENTERPRISE in env.",
    };
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  let customerId = subscription?.stripeCustomerId ?? undefined;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: session.user.name ?? undefined,
      metadata: { organizationId, userId: session.user.id },
    });
    customerId = customer.id;
    await prisma.subscription.update({
      where: { organizationId },
      data: { stripeCustomerId: customerId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/app/billing?checkout=success`,
    cancel_url: `${appUrl}/app/billing?checkout=cancel`,
    metadata: { organizationId, planTier },
    subscription_data: {
      metadata: { organizationId, planId: plan.id },
    },
  });

  if (!checkout.url) return { error: "Could not create checkout session" };
  redirect(checkout.url);
}

export async function createBillingPortalAction() {
  const stripe = getStripe();
  if (!stripe) {
    return { error: "Stripe is not configured." };
  }

  const session = await requireSession();
  const organizationId = session.user.activeOrganizationId;
  if (!organizationId) return { error: "No active organization" };

  await requireOrgPermission(
    session.user.id,
    organizationId,
    PERMISSIONS["org:billing"],
  );

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId },
  });

  if (!subscription?.stripeCustomerId) {
    return { error: "No Stripe customer yet. Upgrade to a paid plan first." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const portal = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${appUrl}/app/billing`,
  });

  redirect(portal.url);
}
