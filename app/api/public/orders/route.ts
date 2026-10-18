import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { deleteReceipt, saveReceipt } from "@/lib/receipts";
import { createOrder } from "@/lib/store";

const itemSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional(),
  addOnIds: z.array(z.string().uuid()).max(20),
  quantity: z.number().int().min(1).max(25),
});

// Palestinian mobile numbers as people type them: 05 and eight more digits.
const mobile = z
  .string()
  .trim()
  .regex(/^05[0-9]{8}$/);

const orderSchema = z
  .object({
    qrToken: z.string().min(8).nullable().optional(),
    branchSlug: z.string().min(2).max(80),
    idempotencyKey: z.string().uuid().optional(),
    firstName: z.string().trim().min(1).max(60),
    lastName: z.string().trim().max(60).default(""),
    customerPhone: mobile.optional().nullable().or(z.literal("")),
    tableLabel: z.string().max(40).optional().nullable(),
    note: z.string().max(240).optional().nullable(),
    paymentMethodId: z.string().uuid(),
    transferFromPhone: mobile.optional().nullable().or(z.literal("")),
    // The bank or wallet operation number: 8 or 9 digits, and optional when a receipt photo is sent.
    transferReference: z
      .string()
      .trim()
      .regex(/^[0-9]{8,9}$/)
      .optional()
      .nullable()
      .or(z.literal("")),
    items: z.array(itemSchema).min(1).max(50),
  })
  .refine(
    (order) =>
      `${order.firstName}${order.lastName}`.replace(/ /g, "").length >= 3,
    { path: ["firstName"] },
  );

export async function POST(request: NextRequest) {
  const limited = await rateLimit(
    `public-order:${clientIp(request)}`,
    Number(process.env.ORDER_RATE_LIMIT) || 12,
    60_000,
  );
  if (!limited.ok)
    return NextResponse.json(
      { error: "Too many order attempts" },
      { status: 429 },
    );

  const form = await request.formData().catch(() => null);
  if (!form)
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  const rawOrder = form.get("order");
  if (typeof rawOrder !== "string")
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  let json: unknown;
  try {
    json = JSON.parse(rawOrder);
  } catch {
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });
  }
  const parsed = orderSchema.safeParse(json);
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid order" }, { status: 400 });

  const receiptFile = form.get("receipt");
  let receipt = null;
  try {
    receipt =
      receiptFile instanceof File && receiptFile.size > 0
        ? await saveReceipt(receiptFile)
        : null;
  } catch {
    return NextResponse.json(
      { error: "Invalid receipt image" },
      { status: 400 },
    );
  }

  // The stored file is only kept when this request created a new order.
  let result;
  try {
    result = await createOrder({
      ...parsed.data,
      // The number the customer paid from is also the number staff can reach them on.
      customerPhone: parsed.data.customerPhone || parsed.data.transferFromPhone || "",
      receipt,
    });
  } catch (error) {
    if (receipt) await deleteReceipt(receipt.storageKey);
    throw error;
  }
  if (receipt && ("error" in result || result.replayed))
    await deleteReceipt(receipt.storageKey);
  if ("error" in result)
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );

  return NextResponse.json(
    {
      orderNumber: result.order.orderNumber,
      trackingToken: result.trackingToken,
      status: result.order.status,
    },
    { status: result.status },
  );
}
