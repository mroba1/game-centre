import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { approveMatch } from "@/modules/matchmaking/application/matchService";
import { startMatch } from "@/modules/quiz/application/quizEngine";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;
    await approveMatch({ gameId: id, adminId: admin.id, ipAddress: req.headers.get("x-forwarded-for") ?? undefined });
    await startMatch(id);
    const game = await prisma.game.findUniqueOrThrow({ where: { id } });
    return NextResponse.json(serializeBigInt(game));
  } catch (err) {
    return errorResponse(err);
  }
}
