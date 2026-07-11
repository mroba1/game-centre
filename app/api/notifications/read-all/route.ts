import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { markAllRead } from "@/modules/notifications/application/notificationService";

export async function POST() {
  try {
    const user = await requireApiUser();
    await markAllRead(user.id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
