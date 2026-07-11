import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { createDepositSchema } from "@/lib/validation/deposits";
import { createDeposit } from "@/modules/deposits/application/depositService";
import { nairaToKobo } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const user = await requireApiUser();
    const deposits = await prisma.deposit.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json(deposits.map((d) => ({ ...d, amountKobo: d.amountKobo.toString() })));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();
    const parsed = createDepositSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const deposit = await createDeposit({
      userId: user.id,
      amountKobo: nairaToKobo(parsed.data.amountNaira),
      paymentReference: parsed.data.paymentReference,
    });
    return NextResponse.json({ ...deposit, amountKobo: deposit.amountKobo.toString() }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
