import type { Metadata } from "next";
import "../admin.css";
import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { getSession } from "@/lib/auth";
import { requestLang } from "@/lib/request-lang";
import { getFirstBranchForBusiness } from "@/lib/store";

export const metadata: Metadata = { title: "FineDine | Staff", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const [branch, initialLang] = await Promise.all([getFirstBranchForBusiness(session.businessId), requestLang()]);

  return (
    <AdminShell
      initialLang={initialLang}
      isOwner={session.role === "owner"}
      menuHref={branch ? `/m/${branch.slug}` : "/"}
      venueName={branch?.name ?? "FineDine"}
      venueNameAr={branch?.nameAr ?? null}
    >
      {children}
    </AdminShell>
  );
}
