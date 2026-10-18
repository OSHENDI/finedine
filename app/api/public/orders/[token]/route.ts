import { NextResponse } from "next/server";
import { getPublicOrderProgress } from "@/lib/store";

export async function GET(_: Request, context: { params: Promise<{ token: string }> }) {
  const { token } = await context.params;
  const order = await getPublicOrderProgress(token);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(
    {
      orderNumber: order.orderNumber,
      progress: order.progress,
      awaitingPayment: order.awaitingPayment,
      firstName: order.firstName,
      tableLabel: order.tableLabel,
      cancelReason: order.cancelReason,
      totalCents: order.totalCents,
      currency: order.currency,
      note: order.note,
      paymentLabel: order.paymentMethodLabel,
      paymentLabelAr: order.paymentMethodLabelAr,
      items: order.lineItems.map((line) => ({
        name: line.name,
        nameAr: line.nameAr ?? null,
        quantity: line.quantity,
        unitCents: line.unitCents,
        options: [line.selectedVariant?.name, ...line.selectedAddOns.map((addOn) => addOn.name)].filter(Boolean),
        optionsAr: [line.selectedVariant ? (line.selectedVariant.nameAr ?? line.selectedVariant.name) : null, ...line.selectedAddOns.map((addOn) => addOn.nameAr ?? addOn.name)].filter(Boolean)
      }))
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
