import bcrypt from "bcryptjs";
import type { PlanTier } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { slugify } from "@/lib/utils";
import { signUpSchema, type SignUpInput } from "@/lib/validations/auth";

const SALT_ROUNDS = 12;

/**
 * Register a user with email/password and bootstrap a personal organization
 * (Owner) plus a Free-tier subscription.
 */
export async function registerUser(raw: SignUpInput) {
  const input = signUpSchema.parse(raw);

  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });

  if (existing) {
    throw new Error("An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
  const orgName = input.organizationName?.trim() || `${input.name}'s Workspace`;
  const baseSlug = slugify(orgName) || "workspace";

  const freePlan = await ensureFreePlan();

  const result = await prisma.$transaction(async (tx) => {
    let slug = baseSlug;
    let attempt = 0;
    while (
      await tx.organization.findUnique({ where: { slug }, select: { id: true } })
    ) {
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const user = await tx.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
      },
      select: { id: true, email: true, name: true },
    });

    const organization = await tx.organization.create({
      data: {
        name: orgName,
        slug,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: "OWNER",
          },
        },
        subscription: {
          create: {
            planId: freePlan.id,
            status: "ACTIVE",
            billingInterval: "MONTHLY",
          },
        },
      },
      select: { id: true, name: true, slug: true },
    });

    return { user, organization };
  });

  return result;
}

async function ensureFreePlan() {
  const existing = await prisma.plan.findUnique({
    where: { tier: "FREE" as PlanTier },
  });

  if (existing) return existing;

  return prisma.plan.create({
    data: {
      name: "Free",
      tier: "FREE",
      description: "For individuals getting started",
      priceMonthly: 0,
      priceYearly: 0,
      maxMembers: 5,
      maxProjects: 3,
      maxStorageMb: 500,
      features: [
        "Up to 5 members",
        "3 projects",
        "Kanban & calendar",
        "Basic activity log",
      ],
    },
  });
}
