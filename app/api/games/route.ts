import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { createGameSchema } from "@/lib/validation/matches";
import { createGame, listOpenLobbies } from "@/modules/matchmaking/application/matchService";
import { serializeBigInt } from "@/lib/serialize";

export async function GET(req: NextRequest) {
  try {
    await requireApiUser();
    const categoryId = req.nextUrl.searchParams.get("categoryId") ?? undefined;
    const games = await listOpenLobbies({ categoryId });
    return NextResponse.json(serializeBigInt(games));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const parsed = createGameSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const game = await createGame({ userId: user.id, categoryId: parsed.data.categoryId, stakeKobo: parsed.data.stakeKobo });
    return NextResponse.json(serializeBigInt(game), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
