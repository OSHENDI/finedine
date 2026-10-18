import TablesBoard from "@/components/admin/TablesBoard";
import { requireSession } from "@/lib/auth";
import { getFirstBranchForBusiness, listQrCodes } from "@/lib/store";

export default async function TablesPage() {
  const session = await requireSession();
  const [branch, codes] = await Promise.all([getFirstBranchForBusiness(session.businessId), listQrCodes(session.businessId)]);
  if (!branch) return null;

  return <TablesBoard canEdit={session.role !== "staff"} codes={codes} venueName={branch.name} />;
}
