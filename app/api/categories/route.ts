import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";
import { listCategories } from "@/modules/questions/application/questionService";

export async function GET() {
  try {
    await requireApiUser();
    const categories = await listCategories(true);
    return NextResponse.json(categories);
  } catch (err) {
    return errorResponse(err);
  }
}
