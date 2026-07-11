import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiAdmin } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { listQuestions, createQuestion } from "@/modules/questions/application/questionService";

const schema = z.object({
  categoryId: z.string().min(1),
  topic: z.string().min(1).max(60),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  prompt: z.string().min(5).max(500),
  explanation: z.string().max(1000).optional(),
  tags: z.array(z.string()).default([]),
  options: z.array(z.object({ label: z.string().min(1), isCorrect: z.boolean() })).min(2).max(6),
});

export async function GET(req: NextRequest) {
  try {
    await requireApiAdmin();
    const categoryId = req.nextUrl.searchParams.get("categoryId") ?? undefined;
    return NextResponse.json(await listQuestions({ categoryId }));
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireApiAdmin();
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const question = await createQuestion(parsed.data, admin.id);
    return NextResponse.json(question, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}
