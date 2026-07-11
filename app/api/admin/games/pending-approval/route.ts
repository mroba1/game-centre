import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { listPendingApprovals } from "@/modules/matchmaking/application/matchService";

export async function GET() {
  try {
    await requireApiAdmin();
    return NextResponse.json(serializeBigInt(await listPendingApprovals()));
  } catch (err) {
    return errorResponse(err);
  }
}
