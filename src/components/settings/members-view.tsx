"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { inviteMemberAction } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Member = {
  id: string;
  role: string;
  joinedAt: Date | string;
  user: { id: string; name: string | null; email: string; image: string | null };
};

type Invite = {
  id: string;
  email: string;
  role: string;
  token: string;
  expiresAt: Date | string;
};

export function MembersView({
  members,
  invites,
  canInvite,
  appUrl,
}: {
  members: Member[];
  invites: Invite[];
  canInvite: boolean;
  appUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lastInviteUrl, setLastInviteUrl] = useState<string | null>(null);

  function onInvite(formData: FormData) {
    startTransition(async () => {
      const result = await inviteMemberAction(formData);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Invite created");
      if (result.inviteUrl) setLastInviteUrl(result.inviteUrl);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Members</h1>
        <p className="text-sm text-muted">
          Manage who can access this workspace
        </p>
      </div>

      {canInvite ? (
        <form
          action={onInvite}
          className="grid gap-3 rounded-lg border border-border bg-card p-4 sm:grid-cols-[1fr_auto_auto]"
        >
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              placeholder="teammate@company.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              name="role"
              defaultValue="MEMBER"
              className="h-10 rounded-md border border-border bg-background px-2 text-sm"
            >
              <option value="ADMIN">Admin</option>
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={pending}>
              {pending ? "Inviting…" : "Invite"}
            </Button>
          </div>
        </form>
      ) : null}

      {lastInviteUrl ? (
        <div className="rounded-md border border-accent/40 bg-accent/5 px-3 py-2 text-sm">
          Invite link:{" "}
          <button
            type="button"
            className="break-all text-accent underline"
            onClick={async () => {
              await navigator.clipboard.writeText(lastInviteUrl);
              toast.success("Copied");
            }}
          >
            {lastInviteUrl}
          </button>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Active members</h2>
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {members.map((member) => (
            <li
              key={member.id}
              className="flex items-center justify-between gap-3 px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium">
                  {member.user.name || member.user.email}
                </p>
                <p className="text-xs text-muted">{member.user.email}</p>
              </div>
              <span className="rounded-md border border-border px-2 py-0.5 text-xs">
                {member.role}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {canInvite && invites.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold">Pending invites</h2>
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium">{invite.email}</p>
                  <p className="text-xs text-muted">{invite.role}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={async () => {
                    const url = `${appUrl}/invite/${invite.token}`;
                    await navigator.clipboard.writeText(url);
                    toast.success("Invite link copied");
                  }}
                >
                  Copy link
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
