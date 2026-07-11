import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/modules/audit/application/auditLog";

const schema = z.object({ reason: z.string().min(5).max(500) });

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const before = await prisma.user.findUniqueOrThrow({ where: { id } });
    const user = await prisma.user.update({ where: { id }, data: { status: "BANNED" } });
    await prisma.session.deleteMany({ where: { userId: id } });

    await recordAuditLog({
      actorUserId: admin.id,
      action: "USER_BANNED",
      targetType: "User",
      targetId: id,
      beforeState: { status: before.status },
      afterState: { status: user.status },
      reason: parsed.data.reason,
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ id: user.id, status: user.status });
  } catch (err) {
    return errorResponse(err);
  }
}
