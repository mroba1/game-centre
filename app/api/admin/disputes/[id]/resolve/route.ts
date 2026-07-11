import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { resolveDisputeSchema } from "@/lib/validation/matches";
import { resolveDispute } from "@/modules/matchmaking/application/disputeService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;
    const parsed = resolveDisputeSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const dispute = await resolveDispute({
      disputeId: id,
      adminId: admin.id,
      resolution: parsed.data.resolution,
      reason: parsed.data.reason,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });
    return NextResponse.json(dispute);
  } catch (err) {
    return errorResponse(err);
  }
}
