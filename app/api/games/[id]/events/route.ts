import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";

/**
 * Poll-based realtime fallback (see lib/realtime — GameEvent is the durable
 * source of truth regardless of whether Ably is configured). Clients pass
 * `since` (an event id) and get everything newer, so a reconnect/refresh
 * recovers exactly where it left off without a bespoke protocol.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;

    const game = await prisma.game.findUniqueOrThrow({ where: { id }, select: { players: { select: { userId: true } } } });
    if (!game.players.some((p) => p.userId === user.id)) {
      return NextResponse.json({ error: "Not a player in this match" }, { status: 403 });
    }

    const since = req.nextUrl.searchParams.get("since");
    const events = await prisma.gameEvent.findMany({
      where: { gameId: id, ...(since ? { seq: { gt: Number(since) } } : {}) },
      orderBy: { seq: "asc" },
      take: 100,
    });

    return NextResponse.json(serializeBigInt(events));
  } catch (err) {
    return errorResponse(err);
  }
}
