import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { joinGame } from "@/modules/matchmaking/application/matchService";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const game = await joinGame({ userId: user.id, gameId: id });
    return NextResponse.json(serializeBigInt(game));
  } catch (err) {
    return errorResponse(err);
  }
}
