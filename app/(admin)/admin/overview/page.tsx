import { TrendingUp, FileText, Users, Swords, Clock, AlertTriangle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/currentUser";
import { formatKobo } from "@/lib/money";
import { approveDepositAction, rejectDepositAction } from "./actions";
import { Button } from "@/components/ui/button";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [revenueToday, usersOnline, matchesToday, pendingDeposits, pendingMatches, failedPayments, deposits] =
    await Promise.all([
      prisma.platformRevenue.aggregate({ _sum: { amountKobo: true }, where: { createdAt: { gte: startOfDay } } }),
      prisma.session.count({ where: { expires: { gt: new Date() } } }),
      prisma.game.count({ where: { createdAt: { gte: startOfDay } } }),
      prisma.deposit.count({ where: { status: "PENDING" } }),
      prisma.game.count({ where: { status: "WAITING_FOR_ADMIN_APPROVAL" } }),
      prisma.deposit.count({ where: { status: "REJECTED", reviewedAt: { gte: startOfDay } } }),
      prisma.deposit.findMany({
        where: { status: "PENDING" },
        include: { user: { select: { username: true } } },
        orderBy: { createdAt: "asc" },
        take: 5,
      }),
    ]);
  // Withdrawals are a future feature (see docs/architecture.md) — no data source yet.

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Metric icon={TrendingUp} label="Revenue Today" value={formatKobo(revenueToday._sum.amountKobo ?? 0n)} />
        <Metric icon={FileText} label="Platform Earnings (All-Time)" value="—" />
        <Metric icon={Users} label="Users Online" value={String(usersOnline)} />
        <Metric icon={Swords} label="Matches Today" value={String(matchesToday)} />
        <Metric icon={Clock} label="Pending Actions" value={String(pendingDeposits + pendingMatches)} />
        <Metric icon={AlertTriangle} label="Failed Payments" value={String(failedPayments)} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Pending Deposits</h2>
            {deposits.length > 0 && (
              <span className="rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-400">
                {deposits.length} pending
              </span>
            )}
          </div>
          <div className="space-y-3">
            {deposits.length === 0 && <p className="text-sm text-muted-foreground">No pending deposits.</p>}
            {deposits.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-3 rounded-lg bg-muted/30 p-3 text-sm">
                <div>
                  <p className="font-medium">{d.user.username}</p>
                  <p className="text-xs text-muted-foreground">Ref: {d.paymentReference}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{formatKobo(d.amountKobo)}</span>
                  <form action={approveDepositAction.bind(null, d.id)}>
                    <Button size="sm" type="submit">
                      Confirm
                    </Button>
                  </form>
                  <form action={rejectDepositAction.bind(null, d.id)}>
                    <Button size="sm" variant="outline" type="submit" className="text-destructive">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Pending Withdrawals</h2>
          </div>
          <p className="text-sm text-muted-foreground">Withdrawals are not enabled yet (planned future feature).</p>
        </div>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}
