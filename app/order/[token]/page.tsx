import { notFound } from "next/navigation";
import MenuApp from "@/components/menu/MenuApp";
import { customerState } from "@/lib/customer-state";
import { requestLang } from "@/lib/request-lang";
import { getPublicMenu, getPublicOrderProgress } from "@/lib/store";

// Opening an order link (or refreshing the order screen) shows the same app, on the status screen.
export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, initialLang] = await Promise.all([params, requestLang()]);
  const order = await getPublicOrderProgress(token);
  if (!order) notFound();
  const menu = await getPublicMenu(order.branchSlug);
  if (!menu) notFound();
  const state = await customerState(menu.branch.slug);

  return (
    <MenuApp
      {...state}
      branch={menu.branch}
      categories={menu.categories}
      initialLang={initialLang}
      initialTrack={{
        token,
        order: {
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
            options: [line.selectedVariant?.name, ...line.selectedAddOns.map((addOn) => addOn.name)].filter((value): value is string => Boolean(value)),
            optionsAr: [line.selectedVariant ? (line.selectedVariant.nameAr ?? line.selectedVariant.name) : null, ...line.selectedAddOns.map((addOn) => addOn.nameAr ?? addOn.name)].filter((value): value is string => Boolean(value))
          }))
        }
      }}
      paymentMethods={menu.paymentMethods}
      popularIds={menu.popularIds}
      qrToken={null}
      tableLabel={order.tableLabel}
    />
  );
}
