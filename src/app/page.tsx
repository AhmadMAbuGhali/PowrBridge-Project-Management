import Link from "next/link";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(15,118,110,0.22),_transparent_45%),radial-gradient(ellipse_at_bottom_right,_rgba(14,165,233,0.12),_transparent_40%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] dark:bg-[radial-gradient(ellipse_at_top_left,_rgba(45,212,191,0.14),_transparent_45%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-8 px-6 py-24">
        <p className="text-sm font-semibold tracking-[0.25em] text-accent uppercase">
          PowrBridge
        </p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-foreground sm:text-6xl">
          Project management built for speed
        </h1>
        <p className="max-w-xl text-lg text-muted">
          Keyboard-first workflows, real-time collaboration, and multi-tenant
          workspaces for modern B2B teams.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90"
          >
            Start free
          </Link>
          <Link
            href="/login"
            className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-medium text-foreground hover:bg-background"
          >
            Sign in
          </Link>
        </div>
        <div className="rounded-lg border border-border bg-card/80 px-4 py-3 text-sm text-muted backdrop-blur">
          Demo login after <code className="text-foreground">npm run db:seed</code>:
          <div className="mt-1 font-medium text-foreground">
            demo@powrbridge.app / Demo1234!
          </div>
        </div>
      </div>
    </main>
  );
}
