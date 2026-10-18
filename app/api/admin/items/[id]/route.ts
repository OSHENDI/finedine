import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { itemSchema } from "@/lib/schemas";
import { deleteItem, saveItem, updateMenuItem } from "@/lib/store";

const schema = z.object({
  isAvailable: z.boolean().optional(),
  priceCents: z.number().int().min(1).max(1_000_000).optional()
});

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;
  const { session } = auth;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || (!("isAvailable" in parsed.data) && !("priceCents" in parsed.data))) {
    return NextResponse.json({ error: "Invalid item update" }, { status: 400 });
  }

  // Staff may mark items sold out; only owner/manager may change prices.
  if ("priceCents" in parsed.data && session.role === "staff") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const item = await updateMenuItem(id, session.businessId, parsed.data);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ item });
}

// Full edit of an item and its options (owner and manager only).
export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["owner", "manager"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = itemSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Check the item details" }, { status: 400 });

  const result = await saveItem(auth.session.businessId, parsed.data, id);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ id: result.id });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["owner", "manager"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await deleteItem(auth.session.businessId, id))) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
