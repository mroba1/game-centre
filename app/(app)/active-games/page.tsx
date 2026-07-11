"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatKobo } from "@/lib/money";
import Link from "next/link";

interface Lobby {
  id: string;
  stakeKobo: string;
  questionCount: number;
  createdAt: string;
  category: { id: string; name: string };
  players: Array<{ user: { id: string; username: string } }>;
}
interface Category {
  id: string;
  name: string;
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

export default function ActiveGamesPage() {
  const router = useRouter();
  const [lobbies, setLobbies] = useState<Lobby[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [joiningId, setJoiningId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const qs = filter !== "ALL" ? `?categoryId=${filter}` : "";
    const res = await fetch(`/api/games${qs}`);
    if (res.ok) setLobbies(await res.json());
  }, [filter]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(setCategories);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load() only setStates inside its own async/await chain, not synchronously
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const join = async (id: string) => {
    setJoiningId(id);
    const res = await fetch(`/api/games/${id}/join`, { method: "POST" });
    setJoiningId(null);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Could not join match");
      return;
    }
    toast.success("Joined — waiting for admin approval.");
    router.push(`/games/${id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Active Games</h1>
          <p className="mt-1 text-muted-foreground">Open lobbies from other players. Join one and get matched instantly.</p>
        </div>
        <Button className="gap-2" render={<Link href="/create-match" />}>
          <Plus className="size-4" /> Create Match
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill active={filter === "ALL"} onClick={() => setFilter("ALL")}>
          All Categories
        </FilterPill>
        {categories.map((c) => (
          <FilterPill key={c.id} active={filter === c.id} onClick={() => setFilter(c.id)}>
            {c.name}
          </FilterPill>
        ))}
      </div>

      {lobbies.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          No open lobbies right now. Be the first to create one.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {lobbies.map((lobby) => {
          const stakeKobo = BigInt(lobby.stakeKobo);
          const pool = stakeKobo * 2n;
          const fee = (pool * 5n) / 100n;
          const winner = pool - fee;
          const loserRefund = (stakeKobo * 10n) / 100n;
          const creator = lobby.players[0]?.user;

          return (
            <div key={lobby.id} className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-medium text-violet-300">
                  <span className="size-1.5 rounded-full bg-violet-400" /> {lobby.category.name}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="size-3" /> {timeAgo(lobby.createdAt)}
                </span>
              </div>

              <div className="mb-4 flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                    {creator?.username.slice(0, 2).toUpperCase() ?? "??"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-semibold">{creator?.username ?? "Unknown"}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-y-3 rounded-xl bg-muted/30 p-4 text-xs">
                <Stat label="Stake" value={formatKobo(stakeKobo)} />
                <Stat label="Questions" value={String(lobby.questionCount)} />
                <Stat label="Prize Pool" value={formatKobo(pool)} valueClass="text-emerald-400" />
                <Stat label="Platform Fee" value={formatKobo(fee)} valueClass="text-amber-400" />
                <Stat label="Winner Reward" value={formatKobo(winner)} valueClass="text-emerald-400" />
                <Stat label="Loser Refund" value={formatKobo(loserRefund)} />
              </div>

              <Button
                onClick={() => join(lobby.id)}
                disabled={joiningId === lobby.id}
                className="mt-4 w-full"
              >
                {joiningId === lobby.id ? "Joining..." : "Join Match"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FilterPill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"
      )}
    >
      {children}
    </button>
  );
}

function Stat({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("font-semibold", valueClass)}>{value}</p>
    </div>
  );
}
