import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await requireApiAdmin();
    const logs = await prisma.auditLog.findMany({
      include: { actor: { select: { username: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(logs);
  } catch (err) {
    return errorResponse(err);
  }
}
