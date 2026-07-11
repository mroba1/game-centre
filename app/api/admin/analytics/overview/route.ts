import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireApiAdmin();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [revenueToday, allTimeRevenue, usersOnline, matchesToday, pendingDeposits, pendingMatches, failedPayments] =
      await Promise.all([
        prisma.platformRevenue.aggregate({ _sum: { amountKobo: true }, where: { createdAt: { gte: startOfDay } } }),
        prisma.platformRevenue.aggregate({ _sum: { amountKobo: true } }),
        prisma.session.count({ where: { expires: { gt: new Date() } } }),
        prisma.game.count({ where: { createdAt: { gte: startOfDay } } }),
        prisma.deposit.count({ where: { status: "PENDING" } }),
        prisma.game.count({ where: { status: "WAITING_FOR_ADMIN_APPROVAL" } }),
        prisma.deposit.count({ where: { status: "REJECTED", reviewedAt: { gte: startOfDay } } }),
      ]);

    return NextResponse.json(
      serializeBigInt({
        revenueTodayKobo: revenueToday._sum.amountKobo ?? 0n,
        allTimeRevenueKobo: allTimeRevenue._sum.amountKobo ?? 0n,
        usersOnline,
        matchesToday,
        pendingActions: pendingDeposits + pendingMatches,
        failedPayments,
      })
    );
  } catch (err) {
    return errorResponse(err);
  }
}
