import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { raiseDisputeSchema } from "@/lib/validation/matches";
import { raiseDispute } from "@/modules/matchmaking/application/disputeService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const parsed = raiseDisputeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const dispute = await raiseDispute({ gameId: id, userId: user.id, reason: parsed.data.reason });
    return NextResponse.json(dispute, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
