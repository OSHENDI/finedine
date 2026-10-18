import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiSession } from "@/lib/auth";
import { updateOrder } from "@/lib/store";

const schema = z
  .object({
    status: z.enum(["accepted", "preparing", "ready", "completed", "cancelled"]).optional(),
    paymentStatus: z.enum(["verified", "rejected"]).optional(),
    cancelReason: z.string().trim().max(200).optional()
  })
  .refine((value) => value.status || value.paymentStatus);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiSession();
  if (auth.error) return auth.error;
  const { session } = auth;

  const { id } = await context.params;
  if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid update" }, { status: 400 });

  const result = await updateOrder(id, session.businessId, parsed.data, session.userId);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });

  return NextResponse.json({ order: result.order });
}
