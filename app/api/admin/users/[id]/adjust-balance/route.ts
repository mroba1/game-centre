import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { adjustBalanceSchema } from "@/lib/validation/matches";
import { applyManualAdjustment } from "@/modules/wallet/application/walletService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;
    const parsed = adjustBalanceSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const tx = await applyManualAdjustment({
      userId: id,
      amountKobo: parsed.data.amountKobo,
      reason: parsed.data.reason,
      adminId: admin.id,
      idempotencyKey: `manual:${id}:${Date.now()}`,
    });
    return NextResponse.json(serializeBigInt(tx));
  } catch (err) {
    return errorResponse(err);
  }
}
