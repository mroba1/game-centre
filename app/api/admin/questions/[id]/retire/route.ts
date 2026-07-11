import { NextResponse } from "next/server";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { retireQuestion } from "@/modules/questions/application/questionService";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireApiAdmin();
    const { id } = await params;
    return NextResponse.json(await retireQuestion(id, admin.id));
  } catch (err) {
    return errorResponse(err);
  }
}
