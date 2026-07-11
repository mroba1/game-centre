import Link from "next/link";
import { Swords, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { requireUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { getUserStats } from "@/lib/stats";
import { formatKobo } from "@/lib/money";

export default async function DashboardPage() {
  const user = await requireUser();
  const [wallet, stats] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { userId: user.id } }),
    getUserStats(user.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-violet-950/40 via-card to-card p-10">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_60%_at_20%_0%,rgba(139,92,246,0.25),transparent)]" />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-violet-300">
            <Swords className="size-3.5" /> Season 4 — Live Now
          </span>
          <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
            Compete. Win. <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Earn.</span>
          </h1>
          <p className="mt-3 max-w-xl text-muted-foreground">
            Challenge real opponents to head-to-head quiz matches, stake your knowledge, and climb the global
            rankings.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" className="gap-2" render={<Link href="/active-games" />}>
              <Swords className="size-4" /> Join a Match
            </Button>
            <Button size="lg" variant="secondary" className="gap-2" render={<Link href="/create-match" />}>
              <Plus className="size-4" /> Create Match
            </Button>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard label="Wallet Balance" value={formatKobo(wallet.balanceKobo)} accent="text-emerald-400" />
            <StatCard label="Current Rank" value={stats.rankTier} accent="text-violet-300" />
            <StatCard label="Win Rate" value={`${stats.winRate}%`} accent="text-sky-400" />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/60 p-5">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  );
}
