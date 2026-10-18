import { NextResponse } from "next/server";
import { initializeAndSeed } from "@/lib/store";

export async function GET() {
  try {
    await initializeAndSeed();
    return NextResponse.json(
      { ok: true, service: "finedine", database: "ok" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { ok: false, service: "finedine", database: "error" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
