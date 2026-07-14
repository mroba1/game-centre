import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { getDepositBankDetails } from "@/lib/settings";

export async function GET() {
  try {
    await requireApiUser();
    return NextResponse.json(await getDepositBankDetails());
  } catch (err) {
    return errorResponse(err);
  }
}
