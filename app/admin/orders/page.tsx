import OrdersBoard from "@/components/OrdersBoard";
import { requireSession } from "@/lib/auth";
import { getFirstBranchForBusiness, getOrders } from "@/lib/store";

export default async function OrdersPage() {
  const session = await requireSession();
  const branch = await getFirstBranchForBusiness(session.businessId);
  if (!branch) return null;
  const orders = await getOrders(branch.id, session.businessId);

  return (
    <OrdersBoard
      currency={branch.currency}
      orders={orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        tableLabel: order.tableLabel,
        note: order.note,
        totalCents: order.totalCents,
        paymentMethodLabel: order.paymentMethodLabel,
        paymentMethodLabelAr: order.paymentMethodLabelAr,
        transferFromPhone: order.transferFromPhone,
        transferReference: order.transferReference,
        hasReceipt: Boolean(order.receiptStorageKey),
        cancelReason: order.cancelReason,
        paymentStatus: order.paymentStatus,
        items: order.lineItems,
        createdAt: order.createdAt.toISOString()
      }))}
    />
  );
}
