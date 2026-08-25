"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { createTeamAction } from "@/lib/actions/teams";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Team = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count: { members: number; projects: number };
};

export function TeamsView({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function onCreate(formData: FormData) {
    startTransition(async () => {
      const result = await createTeamAction(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Team created");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Teams</h1>
          <p className="text-sm text-muted">
            Group people and projects inside your organization
          </p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>
          <Plus className="h-4 w-4" />
          New team
        </Button>
      </div>

      {open ? (
        <form
          action={onCreate}
          className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-2"
        >
          <div className="space-y-2">
            <Label htmlFor="name">Team name</Label>
            <Input id="name" name="name" required placeholder="Engineering" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input
              id="description"
              name="description"
              placeholder="Optional"
            />
          </div>
          <Button type="submit" disabled={pending} className="sm:col-span-2 sm:w-fit">
            {pending ? "Creating…" : "Create team"}
          </Button>
        </form>
      ) : null}

      {teams.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-16 text-center text-sm text-muted">
          No teams yet. Create one to organize projects.
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {teams.map((team) => (
            <li
              key={team.id}
              className="rounded-lg border border-border bg-card p-4"
            >
              <p className="font-medium">{team.name}</p>
              <p className="mt-1 text-sm text-muted">
                {team.description || "No description"}
              </p>
              <p className="mt-3 text-xs text-muted">
                {team._count.members} members · {team._count.projects} projects
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
