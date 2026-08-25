# PowrBridge PM

High-performance B2B project management (Linear / ClickUp-class) built with Next.js 16, Prisma, Auth.js, and PostgreSQL.

## Step 1 — Foundation (complete)

- Project structure & `.env.example`
- Full Prisma domain schema (multi-tenant + billing + collaboration)
- Auth.js (NextAuth v5) with Credentials + optional Google/GitHub
- RBAC permission matrix, guards, and route middleware

## Step 3 — Collaboration, calendar, analytics, billing (complete)

- Activity log on project/task mutations
- Notification center (read/unread) + live refresh
- SSE realtime bridge (`/api/realtime`) for live board updates
- Command palette (`⌘K`)
- Calendar view for due-dated tasks
- Analytics dashboard (velocity, completion, workload)
- Stripe webhook handler (`invoice.paid`, subscription updated/deleted)
- Billing page with seeded plan tiers

## Quick start

```bash
cp .env.example .env.local
# Set AUTH_SECRET (openssl rand -base64 32)

# Start Postgres + Redis (requires Docker)
docker compose up -d

npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Demo account** (after seed):
- Email: `demo@powrbridge.app`
- Password: `Demo1234!`


## Architecture (Step 1)

```
src/
  app/
    api/auth/[...nextauth]/   # Auth.js handlers
    api/organizations/[id]/  # Example RBAC-protected route
  lib/
    auth/                     # Auth config, session helpers, registration
    rbac/                     # Permissions, guards, API wrappers
    db/prisma.ts              # Prisma singleton
    validations/              # Zod schemas
  middleware.ts               # Edge auth gate
prisma/
  schema.prisma               # Domain model
  seed.ts                     # Free / Pro / Enterprise plans
```

### Tenancy & RBAC

```
Organization → Team → Project → Task
Org roles: Owner · Admin · Member · Viewer
```

Use `requireOrgPermission` / `requireProjectPermission` in server code, or wrap Route Handlers with `withOrgPermission` / `withProjectPermission`.

### Auth

- JWT sessions (Credentials-compatible)
- Active organization id + role on the session token
- Edge middleware protects `/app` and `/api` (except auth + webhooks)

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Next.js (Turbopack) |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:migrate` | Create / apply migrations |
| `npm run db:seed` | Seed subscription plans |
| `npm run db:studio` | Prisma Studio |

## Improvements

- Task detail drawer (status, priority, due date, description, comments, delete)
- File attachments on tasks (local storage; S3-ready schema)
- Org members + invite links (`/app/settings/members`, `/invite/:token`)
- Project activity feed
- Dark / light theme toggle
- ⌘K quick project create + project search
- Stripe Checkout + Customer Portal actions
- Admin billing permission
- Richer Kanban add form (priority + due date) with overdue styling
# PowrBridge-Project-Management
