import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { listPendingDeposits } from "@/modules/deposits/application/depositService";

export async function GET() {
  try {
    await requireApiAdmin();
    return NextResponse.json(serializeBigInt(await listPendingDeposits()));
  } catch (err) {
    return errorResponse(err);
  }
}
