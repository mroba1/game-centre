import { NextRequest, NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    await requireApiAdmin();
    const q = req.nextUrl.searchParams.get("q") ?? undefined;
    const users = await prisma.user.findMany({
      where: q
        ? { OR: [{ username: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] }
        : {},
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        wallet: { select: { balanceKobo: true, lockedKobo: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(serializeBigInt(users));
  } catch (err) {
    return errorResponse(err);
  }
}
