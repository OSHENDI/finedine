import { notFound } from "next/navigation";
import MenuApp from "@/components/customer/MenuApp";
import { customerState } from "@/lib/customer-state";
import { requestLang } from "@/lib/request-lang";
import { defaultSlug, menuBySlug, menuMetadata } from "@/lib/menu-meta";

export async function generateMetadata() {
  const [slug, lang] = await Promise.all([defaultSlug(), requestLang()]);
  return menuMetadata(slug ? await menuBySlug(slug) : null, lang);
}

// The plain address is the customer menu itself: there is no separate landing page.
export default async function HomePage() {
  const [slug, initialLang] = await Promise.all([defaultSlug(), requestLang()]);
  const menu = slug ? await menuBySlug(slug) : null;
  if (!menu) notFound();
  const state = await customerState(menu.branch.slug);

  return <MenuApp {...state} branch={menu.branch} categories={menu.categories} initialLang={initialLang} paymentMethods={menu.paymentMethods} popularIds={menu.popularIds} qrToken={null} tableLabel={null} />;
}
