import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { itemSchema } from "@/lib/schemas";
import { saveItem } from "@/lib/store";

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(["owner", "manager"]);
  if (auth.error) return auth.error;

  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the item details" }, { status: 400 });

  const result = await saveItem(auth.session.businessId, parsed.data);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id: result.id }, { status: 201 });
}
