import { notFound } from "next/navigation";
import MenuApp from "@/components/menu/MenuApp";
import { customerState } from "@/lib/customer-state";
import { requestLang } from "@/lib/request-lang";
import { getDefaultBranchSlug, getPublicMenu } from "@/lib/store";

// The plain address is the customer menu itself: there is no separate landing page.
export default async function HomePage() {
  const [slug, initialLang] = await Promise.all([getDefaultBranchSlug(), requestLang()]);
  const menu = slug ? await getPublicMenu(slug) : null;
  if (!menu) notFound();
  const state = await customerState(menu.branch.slug);

  return <MenuApp {...state} branch={menu.branch} categories={menu.categories} initialLang={initialLang} paymentMethods={menu.paymentMethods} popularIds={menu.popularIds} qrToken={null} tableLabel={null} />;
}
