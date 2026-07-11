import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";
import { expireIfPastSla } from "@/modules/matchmaking/application/matchService";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireApiUser();
    const { id } = await params;
    await expireIfPastSla(id);

    const game = await prisma.game.findUniqueOrThrow({
      where: { id },
      include: {
        category: true,
        players: { include: { user: { select: { id: true, username: true } } } },
        gameQuestions: { orderBy: { sequence: "asc" } },
        dispute: true,
      },
    });
    return NextResponse.json(serializeBigInt(game));
  } catch (err) {
    return errorResponse(err);
  }
}
