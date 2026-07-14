import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPEG, PNG, WEBP, or HEIC images are allowed" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 8MB" }, { status: 400 });
    }

    const extension = file.name.split(".").pop() || "jpg";
    const path = `deposit-receipts/${user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;

    const blob = await put(path, file, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({ url: blob.url });
  } catch (err) {
    return errorResponse(err);
  }
}
