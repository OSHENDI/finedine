import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { saveReceipt } from "@/lib/receipts";

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(["owner", "manager"]);
  if (auth.error) return auth.error;

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File) || file.size === 0) return NextResponse.json({ error: "Choose an image" }, { status: 400 });

  try {
    const saved = await saveReceipt(file, "media");
    return NextResponse.json({ url: `/api/media/${saved.storageKey}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Use a JPEG, PNG or WebP image under 5 MB" }, { status: 400 });
  }
}
