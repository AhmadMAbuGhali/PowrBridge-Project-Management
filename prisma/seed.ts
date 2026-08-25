import { PrismaClient, type PlanTier } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PLANS: Array<{
  name: string;
  tier: PlanTier;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  maxMembers: number | null;
  maxProjects: number | null;
  maxStorageMb: number | null;
  features: string[];
}> = [
  {
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
  {
    name: "Pro",
    tier: "PRO",
    description: "For growing teams that need more power",
    priceMonthly: 1200,
    priceYearly: 12000,
    maxMembers: 50,
    maxProjects: 100,
    maxStorageMb: 50_000,
    features: [
      "Up to 50 members",
      "Unlimited projects",
      "Advanced analytics",
      "Priority support",
      "File attachments",
    ],
  },
  {
    name: "Enterprise",
    tier: "ENTERPRISE",
    description: "For organizations with advanced security & scale needs",
    priceMonthly: 0,
    priceYearly: 0,
    maxMembers: null,
    maxProjects: null,
    maxStorageMb: null,
    features: [
      "Unlimited members & projects",
      "SSO / SAML",
      "Audit exports",
      "Dedicated success manager",
      "Custom retention",
    ],
  },
];

async function seedPlans() {
  for (const plan of PLANS) {
    await prisma.plan.upsert({
      where: { tier: plan.tier },
      create: plan,
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        maxMembers: plan.maxMembers,
        maxProjects: plan.maxProjects,
        maxStorageMb: plan.maxStorageMb,
        features: plan.features,
        isActive: true,
      },
    });
  }
}

async function seedDemoWorkspace() {
  const email = "demo@powrbridge.app";
  const passwordHash = await bcrypt.hash("Demo1234!", 12);
  const freePlan = await prisma.plan.findUniqueOrThrow({ where: { tier: "FREE" } });

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      name: "Demo Owner",
      email,
      passwordHash,
    },
    update: {
      name: "Demo Owner",
      passwordHash,
      deletedAt: null,
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: "powrbridge-demo" },
    create: {
      name: "PowrBridge Demo",
      slug: "powrbridge-demo",
      ownerId: user.id,
      members: {
        create: { userId: user.id, role: "OWNER" },
      },
      subscription: {
        create: {
          planId: freePlan.id,
          status: "ACTIVE",
          billingInterval: "MONTHLY",
        },
      },
    },
    update: {
      name: "PowrBridge Demo",
      deletedAt: null,
      ownerId: user.id,
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      role: "OWNER",
    },
    update: { role: "OWNER", deletedAt: null },
  });

  const team = await prisma.team.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "core",
      },
    },
    create: {
      organizationId: organization.id,
      name: "Core",
      slug: "core",
      description: "Product & engineering",
      members: { create: { userId: user.id } },
    },
    update: {
      name: "Core",
      description: "Product & engineering",
      deletedAt: null,
    },
  });

  await prisma.teamMember.upsert({
    where: { teamId_userId: { teamId: team.id, userId: user.id } },
    create: { teamId: team.id, userId: user.id },
    update: {},
  });

  const project = await prisma.project.upsert({
    where: {
      organizationId_slug: {
        organizationId: organization.id,
        slug: "product-launch",
      },
    },
    create: {
      organizationId: organization.id,
      teamId: team.id,
      name: "Product Launch",
      slug: "product-launch",
      description: "Ship the PowrBridge PM MVP",
      color: "#0F766E",
      createdById: user.id,
      members: { create: { userId: user.id, role: "ADMIN" } },
    },
    update: {
      name: "Product Launch",
      description: "Ship the PowrBridge PM MVP",
      teamId: team.id,
      deletedAt: null,
      isArchived: false,
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: { projectId: project.id, userId: user.id },
    },
    create: { projectId: project.id, userId: user.id, role: "ADMIN" },
    update: { role: "ADMIN" },
  });

  const existingTasks = await prisma.task.count({
    where: { projectId: project.id, deletedAt: null },
  });

  if (existingTasks === 0) {
    const samples = [
      {
        title: "Map competitor feature matrix",
        status: "BACKLOG" as const,
        priority: "MEDIUM" as const,
        days: 5,
      },
      {
        title: "Finalize auth + RBAC flows",
        status: "TODO" as const,
        priority: "HIGH" as const,
        days: 1,
      },
      {
        title: "Ship Kanban optimistic updates",
        status: "IN_PROGRESS" as const,
        priority: "URGENT" as const,
        days: 0,
      },
      {
        title: "Review billing webhook coverage",
        status: "IN_REVIEW" as const,
        priority: "HIGH" as const,
        days: -1,
      },
      {
        title: "Publish launch checklist",
        status: "DONE" as const,
        priority: "LOW" as const,
        days: -3,
      },
    ];

    for (let i = 0; i < samples.length; i++) {
      const sample = samples[i]!;
      await prisma.task.create({
        data: {
          projectId: project.id,
          number: i + 1,
          title: sample.title,
          status: sample.status,
          priority: sample.priority,
          position: (i + 1) * 1000,
          dueDate: new Date(Date.now() + sample.days * 86_400_000),
          completedAt: sample.status === "DONE" ? new Date() : null,
          createdById: user.id,
          assignees: { create: { userId: user.id } },
        },
      });
    }
  }

  console.log("Demo workspace ready:");
  console.log("  email:    demo@powrbridge.app");
  console.log("  password: Demo1234!");
}

async function main() {
  await seedPlans();
  await seedDemoWorkspace();
  console.log(`Seeded ${PLANS.length} subscription plans + demo data`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
