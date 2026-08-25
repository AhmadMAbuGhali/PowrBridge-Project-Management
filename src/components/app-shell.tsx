import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  CreditCard,
  FolderKanban,
  LogOut,
  Users,
  UsersRound,
} from "lucide-react";
import { logoutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { CommandPalette } from "@/components/command-palette";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { RealtimeBridge } from "@/components/realtime-bridge";
import { ThemeToggle } from "@/components/theme-toggle";
import { OrgSwitcher } from "@/components/org-switcher";
import type { AppSession } from "@/lib/auth/types";

const NAV = [
  { href: "/app", label: "Projects", icon: FolderKanban },
  { href: "/app/teams", label: "Teams", icon: UsersRound },
  { href: "/app/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/app/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/app/settings/members", label: "Members", icon: Users },
  { href: "/app/billing", label: "Billing", icon: CreditCard },
];

export function AppShell({
  session,
  children,
  projects = [],
  organizations = [],
}: {
  session: AppSession;
  children: React.ReactNode;
  projects?: Array<{ id: string; name: string }>;
  organizations?: Array<{
    role: string;
    organization: { id: string; name: string; slug: string };
  }>;
}) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card px-4 py-6 md:flex md:flex-col">
        <Link href="/app" className="mb-8 px-2 text-sm font-semibold tracking-tight">
          PowrBridge PM
        </Link>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground hover:bg-background"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto space-y-3 border-t border-border pt-4">
          <div className="px-2">
            <p className="truncate text-sm font-medium">{session.user.name}</p>
            <p className="truncate text-xs text-muted">{session.user.email}</p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-6">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-sm font-semibold md:hidden">
              PowrBridge PM
            </Link>
            <OrgSwitcher
              organizations={organizations}
              activeOrganizationId={session.user.activeOrganizationId}
            />
            <kbd className="hidden rounded border border-border px-1.5 py-0.5 text-[10px] text-muted lg:inline">
              ⌘K
            </kbd>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <NotificationCenter />
            <form action={logoutAction} className="md:hidden">
              <Button type="submit" variant="ghost" size="sm">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
      <CommandPalette projects={projects} />
      <RealtimeBridge />
    </div>
  );
}
