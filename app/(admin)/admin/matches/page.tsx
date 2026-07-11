"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { formatKobo } from "@/lib/money";

interface PendingGame {
  id: string;
  stakeKobo: string;
  questionCount: number;
  category: { name: string };
  players: Array<{ user: { username: string } }>;
  approvalDeadline: string | null;
}

export default function AdminMatchesPage() {
  const [games, setGames] = useState<PendingGame[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = () => fetch("/api/admin/games/pending-approval").then((r) => r.json()).then(setGames);

  useEffect(() => {
    load();
    const i = setInterval(load, 8000);
    return () => clearInterval(i);
  }, []);

  const approve = async (id: string) => {
    setBusyId(id);
    const res = await fetch(`/api/admin/games/${id}/approve`, { method: "POST" });
    setBusyId(null);
    if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Failed");
    toast.success("Match approved and started.");
    load();
  };

  const cancel = async (id: string) => {
    const reason = prompt("Reason for cancelling this match:");
    if (!reason) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/games/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setBusyId(null);
    if (!res.ok) return toast.error((await res.json().catch(() => ({}))).error ?? "Failed");
    toast.success("Match cancelled and refunded.");
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Matches</h1>
        <p className="mt-1 text-muted-foreground">Approve matches once both stakes and players check out.</p>
      </div>

      {games.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No matches waiting for approval.
        </div>
      )}

      <div className="space-y-3">
        {games.map((g) => (
          <div key={g.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
            <div>
              <p className="font-semibold">{g.category.name}</p>
              <p className="text-sm text-muted-foreground">{g.players.map((p) => p.user.username).join(" vs ")}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Stake {formatKobo(g.stakeKobo)} · {g.questionCount} questions
                {g.approvalDeadline && ` · expires ${new Date(g.approvalDeadline).toLocaleTimeString()}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" disabled={busyId === g.id} onClick={() => approve(g.id)}>
                Approve & Start
              </Button>
              <Button size="sm" variant="outline" className="text-destructive" disabled={busyId === g.id} onClick={() => cancel(g.id)}>
                Cancel
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
