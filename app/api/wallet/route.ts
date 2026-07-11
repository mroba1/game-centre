import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { getWalletSummary } from "@/modules/wallet/application/walletService";

export async function GET() {
  try {
    const user = await requireApiUser();
    const summary = await getWalletSummary(user.id);
    return NextResponse.json({
      balanceKobo: summary.balanceKobo.toString(),
      lockedKobo: summary.lockedKobo.toString(),
      availableKobo: summary.availableKobo.toString(),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
