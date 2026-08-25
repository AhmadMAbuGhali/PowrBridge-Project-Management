"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createProjectAction } from "@/lib/actions/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Project = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  color: string;
  isArchived: boolean;
  _count: { tasks: number; members: number };
};

export function ProjectsView({ projects }: { projects: Project[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createProjectAction(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Project created");
      setOpen(false);
      if (result.data?.id) {
        router.push(`/app/projects/${result.data.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted">
            Create workspaces and manage tasks on a live Kanban board.
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4" />
          New project
        </Button>
      </div>

      {open ? (
        <form
          action={onCreate}
          className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Project name</Label>
            <Input id="name" name="name" required placeholder="Website redesign" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="Optional short summary"
            />
          </div>
          <Button type="submit" disabled={pending} className="sm:col-span-2 sm:w-fit">
            {pending ? "Creating…" : "Create project"}
          </Button>
        </form>
      ) : null}

      {projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card/50 px-6 py-16 text-center">
          <p className="text-sm text-muted">No projects yet. Create your first one.</p>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((project) => (
            <li key={project.id}>
              <button
                type="button"
                onClick={() => router.push(`/app/projects/${project.id}`)}
                className="flex w-full flex-col gap-2 rounded-lg border border-border bg-card p-4 text-left transition hover:border-accent/40"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="font-medium">{project.name}</span>
                </div>
                <p className="line-clamp-2 text-sm text-muted">
                  {project.description || "No description"}
                </p>
                <p className="text-xs text-muted">
                  {project._count.tasks} tasks · {project._count.members} members
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
