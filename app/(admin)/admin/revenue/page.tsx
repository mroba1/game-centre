import { requireAdmin } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { formatKobo } from "@/lib/money";

export default async function AdminRevenuePage() {
  await requireAdmin();

  const rows = await prisma.platformRevenue.findMany({
    include: { game: { include: { category: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const total = rows.reduce((sum, r) => sum + r.amountKobo, 0n);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Revenue</h1>
        <p className="mt-1 text-muted-foreground">Platform fee earned from every completed match.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total (last 100 matches)</p>
        <p className="mt-1 text-3xl font-bold text-emerald-400">{formatKobo(total)}</p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Match</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Fee Earned</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.gameId.slice(0, 10)}</td>
                <td className="px-4 py-3">{r.game.category.name}</td>
                <td className="px-4 py-3 font-semibold text-emerald-400">{formatKobo(r.amountKobo)}</td>
                <td className="px-4 py-3 text-muted-foreground">{r.createdAt.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
