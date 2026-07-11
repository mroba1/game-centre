"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Code, ShieldCheck, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Category {
  id: string;
  name: string;
  icon: string;
}

const STAKE_TIERS_NAIRA = [500, 1000, 2500, 5000];
const QUESTION_COUNT = 10;
const FEE_PERCENT = 5;
const LOSER_REFUND_PERCENT = 10;

const CATEGORY_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  code: Code,
  shield: ShieldCheck,
};

function nairaFmt(n: number) {
  return `₦${n.toLocaleString("en-NG")}`;
}

export default function CreateMatchPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [stake, setStake] = useState(STAKE_TIERS_NAIRA[1]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data: Category[]) => {
        setCategories(data);
        if (data[0]) setCategoryId(data[0].id);
      });
  }, []);

  const pool = stake * 2;
  const fee = Math.round(pool * (FEE_PERCENT / 100));
  const winnerReceives = pool - fee;
  const loserRefund = Math.round(stake * (LOSER_REFUND_PERCENT / 100));

  const onSubmit = async () => {
    if (!categoryId) return;
    setSubmitting(true);
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId, stakeKobo: String(stake * 100) }),
    });
    setSubmitting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error ?? "Could not create match");
      return;
    }
    const game = await res.json();
    toast.success("Match created — waiting for an opponent to join.");
    router.push(`/games/${game.id}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Create a Match</h1>
        <p className="mt-1 text-muted-foreground">Set your stake and rules. We&apos;ll find you a worthy opponent.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6 rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {categories.map((c) => {
                const Icon = CATEGORY_ICON[c.icon] ?? Code;
                const active = categoryId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCategoryId(c.id)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium transition-colors",
                      active ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 hover:bg-muted/50"
                    )}
                  >
                    <Icon className="size-4" />
                    {c.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stake Amount (₦)</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STAKE_TIERS_NAIRA.map((amount) => (
                <button
                  key={amount}
                  onClick={() => setStake(amount)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-sm font-semibold transition-colors",
                    stake === amount ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted/30 hover:bg-muted/50"
                  )}
                >
                  {nairaFmt(amount)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question Count</p>
            <div className="rounded-xl border border-primary bg-primary/10 px-4 py-3 text-sm font-semibold text-primary w-fit">
              {QUESTION_COUNT} questions
            </div>
          </div>

          <Button onClick={onSubmit} disabled={submitting || !categoryId} className="w-full lg:hidden">
            {submitting ? "Creating..." : "Confirm & Create Match"}
          </Button>
        </div>

        <div className="h-fit space-y-4 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="size-4 text-primary" /> Prize Distribution Preview
          </div>
          <div className="space-y-2 text-sm">
            <Row label="You Stake" value={nairaFmt(stake)} />
            <Row label="Opponent Stakes" value={nairaFmt(stake)} />
          </div>
          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <Row label="Total Pool" value={nairaFmt(pool)} bold />
            <Row label={`Platform Fee (${FEE_PERCENT}%)`} value={nairaFmt(fee)} className="text-amber-400" />
          </div>
          <div className="border-t border-border pt-3 space-y-2 text-sm">
            <Row label="Winner Receives" value={nairaFmt(winnerReceives)} className="text-emerald-400" bold />
            <Row label="Loser Refund" value={nairaFmt(loserRefund)} className="text-muted-foreground" />
          </div>
          <Button onClick={onSubmit} disabled={submitting || !categoryId} className="w-full">
            {submitting ? "Creating..." : "Confirm & Create Match"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, className }: { label: string; value: string; bold?: boolean; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn(bold && "font-semibold", className)}>{value}</span>
    </div>
  );
}
