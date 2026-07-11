import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireApiAdmin();
    const rows = await prisma.platformRevenue.findMany({ orderBy: { createdAt: "desc" }, take: 90 });

    const byDay = new Map<string, bigint>();
    for (const row of rows) {
      const day = row.createdAt.toISOString().slice(0, 10);
      byDay.set(day, (byDay.get(day) ?? 0n) + row.amountKobo);
    }
    const series = [...byDay.entries()].map(([date, amountKobo]) => ({ date, amountKobo })).reverse();
    return NextResponse.json(serializeBigInt(series));
  } catch (err) {
    return errorResponse(err);
  }
}
