import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { paymentSchema } from "@/lib/schemas";
import { savePaymentMethod } from "@/lib/store";

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession(["owner", "manager"]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = paymentSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success || Object.keys(parsed.data).length === 0) return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });

  const method = await savePaymentMethod(auth.session.businessId, parsed.data, id);
  if (!method) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ method });
}
