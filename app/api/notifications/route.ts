import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { listNotifications } from "@/modules/notifications/application/notificationService";

export async function GET() {
  try {
    const user = await requireApiUser();
    return NextResponse.json(await listNotifications(user.id));
  } catch (err) {
    return errorResponse(err);
  }
}
