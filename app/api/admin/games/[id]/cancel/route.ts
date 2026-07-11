import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { z } from "zod";
import { cancelMatchByAdmin } from "@/modules/matchmaking/application/matchService";

const schema = z.object({ reason: z.string().min(5).max(500) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const game = await cancelMatchByAdmin({
      gameId: id,
      adminId: admin.id,
      reason: parsed.data.reason,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });
    return NextResponse.json(serializeBigInt(game));
  } catch (err) {
    return errorResponse(err);
  }
}
