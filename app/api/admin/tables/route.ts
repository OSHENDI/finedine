import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { createTableQrs } from "@/lib/store";

const schema = z.object({ labels: z.array(z.string().trim().min(1).max(40)).min(1).max(100) });

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(["owner", "manager"]);
  if (auth.error) return auth.error;

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid tables" }, { status: 400 });

  const created = await createTableQrs(auth.session.businessId, parsed.data.labels);
  if (!created) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ created: created.length }, { status: 201 });
}
