import { NextResponse } from "next/server";
import { eventStream } from "@/lib/events";
import { getPublicOrderProgress } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const order = await getPublicOrderProgress(token);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return eventStream(request, `order:${order.id}`);
}
