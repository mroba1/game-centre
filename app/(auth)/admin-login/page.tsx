"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn, signOut } from "next-auth/react";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const result = await signIn("credentials", { email, password, redirect: false });
    if (result?.error) {
      setSubmitting(false);
      setError("Invalid email or password.");
      return;
    }

    // Credentials are valid for *some* account — but this page is admin-only,
    // so verify the resulting session actually carries the ADMIN role before
    // letting them in. A direct no-store fetch (rather than next-auth/react's
    // getSession(), which can read a stale client-side cache immediately
    // after signIn()) guarantees we see the just-established session.
    const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
    const session = await sessionRes.json();
    if (session?.user?.role !== "ADMIN") {
      await signOut({ redirect: false });
      setSubmitting(false);
      setError("This login is for administrators only. Regular users should sign in at /login.");
      return;
    }

    window.location.href = "/admin/overview";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(60%_50%_at_50%_0%,rgba(63,63,70,0.35)_0%,transparent_70%)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-zinc-700 text-white">
            <Shield className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight">Admin Console</span>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Wav Workshop</span>
          </span>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-xl">
          <h1 className="text-xl font-semibold">Administrator Sign In</h1>
          <p className="mt-1 text-sm text-muted-foreground">Restricted access — operations staff only.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Not an admin?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Sign in as a player
          </Link>
        </p>
      </div>
    </div>
  );
}
