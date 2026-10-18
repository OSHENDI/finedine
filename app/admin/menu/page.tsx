import MenuEditor from "@/components/admin/MenuEditor";
import { requireSession } from "@/lib/auth";
import { getMenuAdmin } from "@/lib/store";

export default async function AdminMenuPage() {
  const session = await requireSession();
  const menu = await getMenuAdmin(session.businessId);
  if (!menu) return null;

  return <MenuEditor canEdit={session.role !== "staff"} categories={menu.categories} currency={menu.branch.currency} />;
}
