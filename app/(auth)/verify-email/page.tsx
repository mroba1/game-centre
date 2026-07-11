"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AuthCard } from "@/components/shared/AuthCard";
import { Button } from "@/components/ui/button";

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const params = useSearchParams();
  const token = params.get("token");
  const email = params.get("email");
  const justSent = params.get("sent") === "1";

  const [status, setStatus] = useState<"idle" | "verifying" | "success" | "error">(
    token && email ? "verifying" : "idle"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token || !email) return;
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, email }),
    })
      .then(async (res) => {
        if (res.ok) {
          setStatus("success");
        } else {
          const body = await res.json().catch(() => ({}));
          setStatus("error");
          setMessage(body.error ?? "Verification failed");
        }
      })
      .catch(() => setStatus("error"));
  }, [token, email]);

  if (justSent) {
    return (
      <AuthCard title="Check your inbox" subtitle={`We sent a verification link to ${email}.`}>
        <p className="text-sm text-muted-foreground">
          In this dev build, emails are logged to the server console instead of actually sent — check your terminal
          for the verification link.
        </p>
        <Link href="/login" className="mt-6 block text-center text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Email verification" subtitle="Confirming your email address.">
      {status === "verifying" && <p className="text-sm text-muted-foreground">Verifying...</p>}
      {status === "success" && (
        <div className="space-y-4">
          <p className="text-sm text-emerald-400">Your email has been verified.</p>
          <Button className="w-full" render={<Link href="/login" />}>Sign in</Button>
        </div>
      )}
      {status === "error" && <p className="text-sm text-destructive">{message}</p>}
      {status === "idle" && <p className="text-sm text-muted-foreground">No verification token provided.</p>}
    </AuthCard>
  );
}
