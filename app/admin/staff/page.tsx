import StaffBoard from "@/components/admin/StaffBoard";
import { requireSession } from "@/lib/auth";
import { listStaff } from "@/lib/store";

export default async function StaffPage() {
  const session = await requireSession();
  const isOwner = session.role === "owner";
  const staff = isOwner ? (await listStaff(session.businessId)).map((user) => ({ ...user, createdAt: user.createdAt.toISOString() })) : [];

  return <StaffBoard currentUserId={session.userId} isOwner={isOwner} staff={staff} />;
}
