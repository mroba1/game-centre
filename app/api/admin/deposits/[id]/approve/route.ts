import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { approveDeposit } from "@/modules/deposits/application/depositService";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;
    const deposit = await approveDeposit({
      depositId: id,
      adminId: admin.id,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });
    return NextResponse.json(serializeBigInt(deposit));
  } catch (err) {
    return errorResponse(err);
  }
}
