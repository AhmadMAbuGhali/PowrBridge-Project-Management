import Link from "next/link";
import { redirect } from "next/navigation";
import { getInvitePreview } from "@/lib/services/members";
import { getSession } from "@/lib/auth/session";
import { AcceptInviteButton } from "@/components/settings/accept-invite-button";

type PageProps = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: PageProps) {
  const { token } = await params;
  const invite = await getInvitePreview(token);
  const session = await getSession();

  if (!invite) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Invite not found</h1>
          <p className="text-sm text-muted">This link is invalid or expired.</p>
          <Link href="/" className="text-sm text-accent hover:underline">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  if (invite.status !== "PENDING" || invite.expiresAt < new Date()) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Invite unavailable</h1>
          <p className="text-sm text-muted">
            This invite was already used or has expired.
          </p>
        </div>
      </main>
    );
  }

  if (!session?.user) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/invite/${token}`)}`);
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md space-y-4 rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-xs font-semibold tracking-[0.2em] text-accent uppercase">
          PowrBridge
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Join {invite.organization.name}
        </h1>
        <p className="text-sm text-muted">
          You&apos;re invited as <strong>{invite.role}</strong> (
          {invite.email})
        </p>
        <AcceptInviteButton token={token} />
      </div>
    </main>
  );
}
