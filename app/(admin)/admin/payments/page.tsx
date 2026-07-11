"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatKobo } from "@/lib/money";

interface Deposit {
  id: string;
  amountKobo: string;
  paymentReference: string;
  createdAt: string;
  user: { username: string; email: string };
}

export default function AdminPaymentsPage() {
  const [deposits, setDeposits] = useState<Deposit[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => fetch("/api/admin/deposits").then((r) => r.json()).then(setDeposits);

  useEffect(() => {
    load();
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/deposits/${id}/approve`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Failed");
    toast.success("Deposit approved and credited.");
    load();
  };

  const reject = async (id: string) => {
    const reason = prompt("Reason for rejecting this deposit:");
    if (!reason) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/deposits/${id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusyId(null);
    if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Failed");
    toast.success("Deposit rejected.");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="mt-1 text-muted-foreground">Every deposit is manually verified before funds are credited.</p>
      </div>

      {deposits.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No pending deposits.
        </div>
      )}

      <div className="space-y-3">
        {deposits.map((d) => (
          <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-semibold">{d.user.username}</p>
              <p className="text-sm text-muted-foreground">{d.user.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Ref: {d.paymentReference} · {new Date(d.createdAt).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold">{formatKobo(d.amountKobo)}</span>
              <Button size="sm" disabled={busyId === d.id} onClick={() => approve(d.id)}>
                Confirm
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" disabled={busyId === d.id} onClick={() => reject(d.id)}>
                Reject
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
