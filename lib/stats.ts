import { prisma } from "@/lib/prisma";

const RANK_TIERS: Array<{ minWins: number; label: string }> = [
  { minWins: 100, label: "Diamond III" },
  { minWins: 60, label: "Diamond I" },
  { minWins: 35, label: "Platinum II" },
  { minWins: 20, label: "Platinum I" },
  { minWins: 10, label: "Gold II" },
  { minWins: 5, label: "Gold I" },
  { minWins: 1, label: "Silver" },
  { minWins: 0, label: "Bronze" },
];

/**
 * Simple win-count-derived tier used as a placeholder ranking algorithm —
 * no Elo/rating system is in scope yet (see docs/architecture.md roadmap).
 * Swap this for a real rating model without touching callers.
 */
function rankTierForWins(wins: number): string {
  return RANK_TIERS.find((t) => wins >= t.minWins)!.label;
}

export async function getUserStats(userId: string) {
  const players = await prisma.gamePlayer.findMany({
    where: { userId, game: { status: { in: ["PAID", "REFUNDED"] } } },
    select: { gameId: true, game: { select: { status: true, winnerUserId: true } } },
  });

  const completed = players.filter((p) => p.game.status === "PAID");
  const wins = completed.filter((p) => p.game.winnerUserId === userId).length;
  const totalMatches = completed.length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  return { wins, totalMatches, winRate, rankTier: rankTierForWins(wins) };
}

export async function getLeaderboard(take = 50) {
  const players = await prisma.gamePlayer.findMany({
    where: { game: { status: "PAID" } },
    select: { userId: true, game: { select: { winnerUserId: true } } },
  });

  const byUser = new Map<string, { wins: number; matches: number }>();
  for (const p of players) {
    const entry = byUser.get(p.userId) ?? { wins: 0, matches: 0 };
    entry.matches += 1;
    if (p.game.winnerUserId === p.userId) entry.wins += 1;
    byUser.set(p.userId, entry);
  }

  const userIds = [...byUser.keys()];
  const [users, earnings] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, username: true, country: true } }),
    prisma.walletTransaction.groupBy({
      by: ["walletId"],
      where: { type: "PRIZE_WON", wallet: { userId: { in: userIds } } },
      _sum: { amountKobo: true },
    }),
  ]);
  const userById = new Map(users.map((u) => [u.id, u]));
  const wallets = await prisma.wallet.findMany({ where: { userId: { in: userIds } }, select: { id: true, userId: true } });
  const walletToUser = new Map(wallets.map((w) => [w.id, w.userId]));
  const earningsByUser = new Map<string, bigint>();
  for (const e of earnings) {
    const userId = walletToUser.get(e.walletId);
    if (userId) earningsByUser.set(userId, e._sum.amountKobo ?? 0n);
  }

  return [...byUser.entries()]
    .map(([userId, stats]) => ({
      userId,
      username: userById.get(userId)?.username ?? "Unknown",
      country: userById.get(userId)?.country ?? null,
      wins: stats.wins,
      matches: stats.matches,
      winRate: stats.matches > 0 ? Math.round((stats.wins / stats.matches) * 100) : 0,
      rankTier: rankTierForWins(stats.wins),
      earningsKobo: (earningsByUser.get(userId) ?? 0n).toString(),
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
    .slice(0, take);
}
