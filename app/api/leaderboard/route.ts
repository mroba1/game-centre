import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { getLeaderboard } from "@/lib/stats";

export async function GET() {
  try {
    await requireApiUser();
    return NextResponse.json(await getLeaderboard());
  } catch (err) {
    return errorResponse(err);
  }
}
