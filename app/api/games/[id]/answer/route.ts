import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { serializeBigInt } from "@/lib/serialize";
import { submitAnswerSchema } from "@/lib/validation/matches";
import { submitAnswer } from "@/modules/quiz/application/quizEngine";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiUser();
    const { id } = await params;
    const parsed = submitAnswerSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });

    const ip = req.headers.get("x-forwarded-for") ?? undefined;
    const answer = await submitAnswer({
      gameId: id,
      userId: user.id,
      gameQuestionId: parsed.data.gameQuestionId,
      selectedOptionId: parsed.data.selectedOptionId,
      clientNonce: parsed.data.clientNonce,
      ipAddress: ip,
    });
    return NextResponse.json(serializeBigInt(answer));
  } catch (err) {
    return errorResponse(err);
  }
}
