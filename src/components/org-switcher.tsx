"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

type OrgOption = {
  role: string;
  organization: { id: string; name: string; slug: string };
};

export function OrgSwitcher({
  organizations,
  activeOrganizationId,
}: {
  organizations: OrgOption[];
  activeOrganizationId?: string | null;
}) {
  const { update } = useSession();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (organizations.length <= 1) {
    const only = organizations[0];
    return (
      <p className="hidden truncate text-sm text-muted md:block">
        {only?.organization.name ?? "Workspace"}
      </p>
    );
  }

  return (
    <select
      className="hidden h-8 max-w-[200px] rounded-md border border-border bg-card px-2 text-sm md:block"
      disabled={pending}
      value={activeOrganizationId ?? ""}
      onChange={(e) => {
        const organizationId = e.target.value;
        startTransition(async () => {
          await update({ activeOrganizationId: organizationId });
          toast.success("Workspace switched");
          router.refresh();
        });
      }}
    >
      {organizations.map((item) => (
        <option key={item.organization.id} value={item.organization.id}>
          {item.organization.name} ({item.role})
        </option>
      ))}
    </select>
  );
}
