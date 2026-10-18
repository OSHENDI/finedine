import { NextResponse } from "next/server";
import { readReceipt } from "@/lib/receipts";

// Public menu photos. File names are random and never reused, so they can be cached forever.
export async function GET(_: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  const image = await readReceipt(key, "media");
  if (!image) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new Response(new Uint8Array(image.bytes), {
    headers: { "Content-Type": image.mimeType, "Cache-Control": "public, max-age=31536000, immutable" }
  });
}
