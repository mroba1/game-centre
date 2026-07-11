import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { getTransactionHistory } from "@/modules/wallet/application/walletService";

export async function GET(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const cursor = req.nextUrl.searchParams.get("cursor") ?? undefined;
    const transactions = await getTransactionHistory(user.id, { cursor, take: 20 });
    return NextResponse.json(
      transactions.map((t) => ({ ...t, amountKobo: t.amountKobo.toString(), balanceAfterKobo: t.balanceAfterKobo.toString() }))
    );
  } catch (err) {
    return errorResponse(err);
  }
}
