import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { listSettingKeys, setSetting } from "@/lib/settings";
import { prisma } from "@/lib/prisma";
import { recordAuditLog } from "@/modules/audit/application/auditLog";

export async function GET() {
  try {
    await requireApiAdmin();
    const keys = listSettingKeys();
    const rows = await prisma.setting.findMany({ where: { key: { in: keys } } });
    const byKey = new Map(rows.map((r) => [r.key, r]));
    return NextResponse.json(keys.map((key) => ({ key, value: byKey.get(key)?.value ?? "", description: byKey.get(key)?.description ?? "" })));
  } catch (err) {
    return errorResponse(err);
  }
}

const schema = z.object({ key: z.string().min(1), value: z.string() });

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireApiAdmin();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const validKeys = listSettingKeys();
    if (!validKeys.includes(parsed.data.key as (typeof validKeys)[number])) {
      return NextResponse.json({ error: "Unknown setting key" }, { status: 400 });
    }

    const before = await prisma.setting.findUnique({ where: { key: parsed.data.key } });
    await setSetting(parsed.data.key as (typeof validKeys)[number], parsed.data.value);

    await recordAuditLog({
      actorUserId: admin.id,
      action: "SETTING_UPDATED",
      targetType: "Setting",
      targetId: parsed.data.key,
      beforeState: { value: before?.value ?? null },
      afterState: { value: parsed.data.value },
      ipAddress: req.headers.get("x-forwarded-for") ?? undefined,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
