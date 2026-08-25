"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  CalendarDays,
  CreditCard,
  FolderKanban,
  LayoutDashboard,
  Plus,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { createProjectAction } from "@/lib/actions/workspace";

export function CommandPalette({
  projects = [],
}: {
  projects?: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  function quickCreateProject() {
    const name = window.prompt("Project name");
    if (!name?.trim()) return;
    const formData = new FormData();
    formData.set("name", name.trim());
    startTransition(async () => {
      const result = await createProjectAction(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Project created");
      setOpen(false);
      if (result.data?.id) router.push(`/app/projects/${result.data.id}`);
      else router.refresh();
    });
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 px-4 pt-[15vh]">
      <button
        type="button"
        aria-label="Close command palette"
        className="absolute inset-0 cursor-default"
        onClick={() => setOpen(false)}
      />
      <Command className="relative z-10 w-full max-w-lg overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted" />
          <Command.Input
            placeholder="Search projects or jump to…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted"
            autoFocus
          />
          <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted">
            esc
          </kbd>
        </div>
        <Command.List className="max-h-80 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm text-muted">
            No results
          </Command.Empty>

          <Command.Group heading="Actions" className="px-1 py-2 text-xs text-muted">
            <Command.Item
              value="create project"
              disabled={pending}
              onSelect={quickCreateProject}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background"
            >
              <Plus className="h-4 w-4" /> New project
            </Command.Item>
          </Command.Group>

          <Command.Group heading="Navigate" className="px-1 py-2 text-xs text-muted">
            <Command.Item
              value="projects home"
              onSelect={() => go("/app")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background"
            >
              <FolderKanban className="h-4 w-4" /> Projects
            </Command.Item>
            <Command.Item
              value="teams"
              onSelect={() => go("/app/teams")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background"
            >
              <FolderKanban className="h-4 w-4" /> Teams
            </Command.Item>
            <Command.Item
              value="calendar"
              onSelect={() => go("/app/calendar")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background"
            >
              <CalendarDays className="h-4 w-4" /> Calendar
            </Command.Item>
            <Command.Item
              value="analytics"
              onSelect={() => go("/app/analytics")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background"
            >
              <LayoutDashboard className="h-4 w-4" /> Analytics
            </Command.Item>
            <Command.Item
              value="members"
              onSelect={() => go("/app/settings/members")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background"
            >
              <Plus className="h-4 w-4" /> Members
            </Command.Item>
            <Command.Item
              value="billing"
              onSelect={() => go("/app/billing")}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background"
            >
              <CreditCard className="h-4 w-4" /> Billing
            </Command.Item>
          </Command.Group>

          {projects.length > 0 ? (
            <Command.Group heading="Projects" className="px-1 py-2 text-xs text-muted">
              {projects.map((project) => (
                <Command.Item
                  key={project.id}
                  value={`project ${project.name}`}
                  onSelect={() => go(`/app/projects/${project.id}`)}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground aria-selected:bg-background"
                >
                  <FolderKanban className="h-4 w-4" />
                  {project.name}
                </Command.Item>
              ))}
            </Command.Group>
          ) : null}
        </Command.List>
      </Command>
    </div>
  );
}
