import { NextResponse } from "next/server";
import { initializeAndSeed } from "@/lib/store";

// Plain "is the process up" by default: it does not touch the database, so a keep-awake ping or the
// host's health check never wakes a database that scales to zero. Add ?deep=1 to check the database too.
export async function GET(request: Request) {
  const headers = { "Cache-Control": "no-store" };
  if (new URL(request.url).searchParams.get("deep") !== "1") return NextResponse.json({ ok: true, service: "finedine" }, { headers });
  try {
    await initializeAndSeed();
    return NextResponse.json({ ok: true, service: "finedine", database: "ok" }, { headers });
  } catch {
    return NextResponse.json({ ok: false, service: "finedine", database: "error" }, { status: 503, headers });
  }
}
