import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { resetPassword, InvalidOrExpiredTokenError } from "@/modules/auth/application/authService";

const schema = resetPasswordSchema.extend({ email: z.string().email() });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });

  try {
    await resetPassword(parsed.data.email.toLowerCase(), parsed.data.token, parsed.data.password);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidOrExpiredTokenError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
