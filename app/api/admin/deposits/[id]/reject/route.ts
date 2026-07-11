import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { rejectDepositSchema } from "@/lib/validation/deposits";
import { rejectDeposit } from "@/modules/deposits/application/depositService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;
    const parsed = rejectDepositSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const deposit = await rejectDeposit({
      depositId: id,
      adminId: admin.id,
      reason: parsed.data.reason,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });
    return NextResponse.json(serializeBigInt(deposit));
  } catch (err) {
    return errorResponse(err);
  }
}
