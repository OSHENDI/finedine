import { NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { readReceipt } from "@/lib/receipts";
import { getOrderReceipt } from "@/lib/store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const storageKey = await getOrderReceipt(id, auth.session.businessId);
  const receipt = storageKey ? await readReceipt(storageKey) : null;
  if (!receipt) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new Response(new Uint8Array(receipt.bytes), {
    headers: {
      "Content-Type": receipt.mimeType,
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600"
    }
  });
}
