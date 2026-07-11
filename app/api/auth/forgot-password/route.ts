import { NextRequest, NextResponse } from "next/server";
import { requestPasswordResetSchema } from "@/lib/validation/auth";
import { requestPasswordReset } from "@/modules/auth/application/authService";

export async function POST(req: NextRequest) {
  const parsed = requestPasswordResetSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  await requestPasswordReset(parsed.data.email.toLowerCase());
  // Always 200 regardless of whether the account exists — don't leak enumeration.
  return NextResponse.json({ ok: true });
}
