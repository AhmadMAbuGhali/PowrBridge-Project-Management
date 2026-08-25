import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(15,118,110,0.18),_transparent_55%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] dark:bg-[radial-gradient(ellipse_at_top,_rgba(45,212,191,0.12),_transparent_55%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)]" />
      <div className="relative w-full max-w-md space-y-6 rounded-xl border border-border bg-card/90 p-8 shadow-sm backdrop-blur">
        <div className="space-y-1 text-center">
          <Link href="/" className="text-xs font-semibold tracking-[0.2em] uppercase text-accent">
            PowrBridge
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="text-sm text-muted">Continue to your workspace</p>
        </div>
        <Suspense fallback={<p className="text-center text-sm text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
