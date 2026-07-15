import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { listMyActiveMatches } from "@/modules/matchmaking/application/matchService";

export async function GET() {
  try {
    const user = await requireApiUser();
    const games = await listMyActiveMatches(user.id);
    return NextResponse.json(serializeBigInt(games));
  } catch (err) {
    return errorResponse(err);
  }
}
