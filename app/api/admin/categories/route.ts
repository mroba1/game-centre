import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { listCategories, createCategory } from "@/modules/questions/application/questionService";

const schema = z.object({ name: z.string().min(2).max(60), icon: z.string().min(1).max(30) });

export async function GET() {
  try {
    await requireApiAdmin();
    return NextResponse.json(await listCategories());
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireApiAdmin();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    return NextResponse.json(await createCategory(parsed.data), { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
