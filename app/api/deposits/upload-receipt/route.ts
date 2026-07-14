import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireApiUser } from "@/lib/apiAuth";
import { errorResponse } from "@/lib/apiError";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function POST(req: NextRequest) {
  try {
    const user = await requireApiUser();

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      // Fails loudly with a clear cause instead of a generic 500 — this is
      // an infra setup step (Vercel Storage tab -> create a Blob store),
      // not a code bug, so surface that distinction to the caller.
      console.error("BLOB_READ_WRITE_TOKEN is not set — cannot upload deposit receipts.");
      return NextResponse.json(
        { error: "Receipt uploads aren't configured on the server yet. Contact an admin." },
        { status: 503 }
      );
    }

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
