"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatKobo } from "@/lib/money";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  wallet: { balanceKobo: string } | null;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`).then((r) => r.json()).then(setUsers);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const suspend = async (id: string) => {
    const reason = prompt("Reason for suspending this user:");
    if (!reason) return;
    setBusyId(id);
    await fetch(`/api/admin/users/${id}/suspend`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusyId(null);
    toast.success("User suspended.");
    load();
  };

  const ban = async (id: string) => {
    const reason = prompt("Reason for banning this user:");
    if (!reason) return;
    setBusyId(id);
    await fetch(`/api/admin/users/${id}/ban`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusyId(null);
    toast.success("User banned.");
    load();
  };

  const adjustBalance = async (id: string) => {
    const amountStr = prompt("Adjustment amount in Naira (use negative to deduct):");
    if (!amountStr) return;
    const reason = prompt("Reason for this balance adjustment:");
    if (!reason) return;
    setBusyId(id);
    await fetch(`/api/admin/users/${id}/adjust-balance`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amountKobo: String(Math.round(Number(amountStr) * 100)), reason }),
    });
    setBusyId(null);
    toast.success("Balance adjusted.");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="mt-1 text-muted-foreground">Search, review, and moderate player accounts.</p>
      </div>

      <div className="flex max-w-sm items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
        <Search className="size-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load()}
          placeholder="Search username or email..."
          className="border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{u.username}</p>
                  <p className="text-xs text-muted-foreground">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-semibold",
                      u.status === "ACTIVE" && "bg-emerald-500/15 text-emerald-400",
                      u.status === "SUSPENDED" && "bg-amber-500/15 text-amber-400",
                      u.status === "BANNED" && "bg-destructive/15 text-destructive"
                    )}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3">{u.wallet ? formatKobo(u.wallet.balanceKobo) : "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={busyId === u.id} onClick={() => adjustBalance(u.id)}>
                      Adjust
                    </Button>
                    <Button size="sm" variant="outline" disabled={busyId === u.id || u.status !== "ACTIVE"} onClick={() => suspend(u.id)}>
                      Suspend
                    </Button>
                    <Button size="sm" variant="outline" className="text-destructive" disabled={busyId === u.id || u.status === "BANNED"} onClick={() => ban(u.id)}>
                      Ban
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
