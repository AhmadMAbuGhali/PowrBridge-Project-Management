"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { acceptInviteAction } from "@/lib/actions/members";
import { Button } from "@/components/ui/button";

export function AcceptInviteButton({ token }: { token: string }) {
  const router = useRouter();
  const { update } = useSession();
  const [pending, startTransition] = useTransition();

  return (
    <Button
      className="w-full"
      disabled={pending}
      onClick={() => {
        startTransition(async () => {
          const result = await acceptInviteAction(token);
          if (result.error) {
            toast.error(result.error);
            return;
          }
          if (result.data?.organizationId) {
            await update({
              activeOrganizationId: result.data.organizationId,
            });
          }
          toast.success(`Joined ${result.data?.organizationName}`);
          router.push("/app");
          router.refresh();
        });
      }}
    >
      {pending ? "Joining…" : "Accept invite"}
    </Button>
  );
}
