import { NextRequest } from "next/server";
import { publicOrigin } from "@/lib/origin";
import QRCode from "qrcode";
import { findBranchBySlug, getQrTokenForBranch } from "@/lib/store";

export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const branch = await findBranchBySlug(slug);
  if (!branch) return new Response("Not found", { status: 404 });
  const token = await getQrTokenForBranch(slug);
  if (!token) return new Response("QR not found", { status: 404 });

  const origin = publicOrigin(request);
  const svg = await QRCode.toString(`${origin}/t/${token}`, {
    type: "svg",
    margin: 2,
    width: 512,
    color: {
      dark: "#171717",
      light: "#ffffff"
    }
  });

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600"
    }
  });
}
