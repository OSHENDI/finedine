import DashboardView from "@/components/admin/DashboardView";
import { requireSession } from "@/lib/auth";
import { getDashboard, getFirstBranchForBusiness, getOrders } from "@/lib/store";

export default async function AdminPage() {
  const session = await requireSession();
  const firstBranch = await getFirstBranchForBusiness(session.businessId);
  if (!firstBranch) return null;
  const dashboard = await getDashboard(firstBranch.id, session.businessId);
  if (!dashboard) return null;
  const { branch, orders, todaysOrders } = dashboard;
  const counted = todaysOrders.filter((order) => order.status !== "cancelled");
  const openCount = (await getOrders(firstBranch.id, session.businessId)).filter((order) => order.status !== "completed" && order.status !== "cancelled").length;

  return (
    <DashboardView
      currency={branch.currency}
      openCount={openCount}
      recent={orders.map((order) => ({ id: order.id, number: order.orderNumber, name: order.customerName, totalCents: order.totalCents, status: order.status }))}
      slug={branch.slug}
      todayCents={counted.reduce((sum, order) => sum + order.totalCents, 0)}
      todayCount={counted.length}
    />
  );
}
