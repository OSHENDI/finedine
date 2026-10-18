import { NextRequest, NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import QRCode from "qrcode";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { getQrTokenById } from "@/lib/store";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const token = await getQrTokenById(auth.session.businessId, id);
  if (!token) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const origin = publicOrigin(request);
  const svg = await QRCode.toString(`${origin}/t/${token}`, { type: "svg", margin: 2, width: 512, color: { dark: "#171717", light: "#ffffff" } });
  // The image embeds the secret QR token, so it must never be cached by shared caches.
  return new Response(svg, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "private, no-store" } });
}
