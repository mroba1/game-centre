import { requireUser } from "@/lib/currentUser";
import { prisma } from "@/lib/prisma";
import { formatKobo } from "@/lib/money";
import { cn } from "@/lib/utils";

export default async function MatchHistoryPage() {
  const user = await requireUser();

  const games = await prisma.game.findMany({
    where: {
      players: { some: { userId: user.id } },
      status: { in: ["PAID", "REFUNDED"] },
    },
    include: {
      category: true,
      players: { include: { user: { select: { id: true, username: true } } } },
    },
    orderBy: { completedAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Match History</h1>
        <p className="mt-1 text-muted-foreground">Every match you&apos;ve played, win or lose.</p>
      </div>

      {games.length === 0 && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          You haven&apos;t completed any matches yet.
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Opponent</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Stake</th>
              <th className="px-4 py-3">Result</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {games.map((g) => {
              const opponent = g.players.find((p) => p.userId !== user.id)?.user;
              const isDraw = g.status === "REFUNDED" && !g.winnerUserId;
              const won = g.winnerUserId === user.id;
              return (
                <tr key={g.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium">{opponent?.username ?? "Unknown"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{g.category.name}</td>
                  <td className="px-4 py-3">{formatKobo(g.stakeKobo)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-semibold",
                        isDraw
                          ? "bg-muted text-muted-foreground"
                          : won
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-destructive/15 text-destructive"
                      )}
                    >
                      {isDraw ? "Draw" : won ? "Won" : "Lost"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {g.completedAt ? new Date(g.completedAt).toLocaleDateString() : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
