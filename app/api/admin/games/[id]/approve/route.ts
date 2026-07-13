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

    // Self-healing retry: approveMatch() and startMatch() are two separate
    // steps (transition to STARTING, then pick questions and go IN_PROGRESS).
    // If startMatch() previously failed after approveMatch() had already
    // committed — e.g. the category didn't have enough active questions yet —
    // the game is left sitting in STARTING with no way to retry, since
    // approveMatch() only accepts WAITING_FOR_ADMIN_APPROVAL. Detect that and
    // resume from startMatch() instead of re-running approveMatch().
    const current = await prisma.game.findUniqueOrThrow({ where: { id } });
    if (current.status === "WAITING_FOR_ADMIN_APPROVAL") {
      await approveMatch({ gameId: id, adminId: admin.id, ipAddress: req.headers.get("x-forwarded-for") ?? undefined });
      await startMatch(id);
    } else if (current.status === "STARTING") {
      await startMatch(id);
    }
    // Any other status: already started (or terminal) — return as-is, idempotent no-op.

    const game = await prisma.game.findUniqueOrThrow({ where: { id } });
    return NextResponse.json(serializeBigInt(game));
  } catch (err) {
    return errorResponse(err);
  }
}
