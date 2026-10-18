import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/auth";
import { paymentSchema } from "@/lib/schemas";
import { savePaymentMethod } from "@/lib/store";

export async function POST(request: NextRequest) {
  const auth = await requireApiSession(["owner", "manager"]);
  if (auth.error) return auth.error;

  const parsed = paymentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });

  const method = await savePaymentMethod(auth.session.businessId, parsed.data);
  if (!method) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ method }, { status: 201 });
}
