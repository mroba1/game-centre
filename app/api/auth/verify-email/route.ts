import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyEmail, InvalidOrExpiredTokenError } from "@/modules/auth/application/authService";

const schema = z.object({ email: z.string().email(), token: z.string().min(1) });

export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    await verifyEmail(parsed.data.email.toLowerCase(), parsed.data.token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof InvalidOrExpiredTokenError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error(err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
