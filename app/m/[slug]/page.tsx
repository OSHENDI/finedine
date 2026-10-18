import { notFound } from "next/navigation";
import MenuApp from "@/components/customer/MenuApp";
import { customerState } from "@/lib/customer-state";
import { requestLang, tableFromQuery } from "@/lib/request-lang";
import { menuBySlug, menuMetadata } from "@/lib/menu-meta";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const [{ slug }, lang] = await Promise.all([params, requestLang()]);
  return menuMetadata(await menuBySlug(slug), lang);
}

export default async function PublicMenuPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string | string[] }>;
}) {
  const [{ slug }, query, initialLang] = await Promise.all([params, searchParams, requestLang()]);
  const menu = await menuBySlug(slug);
  if (!menu) notFound();
  const state = await customerState(menu.branch.slug);

  return (
    <MenuApp
      {...state}
      branch={menu.branch}
      categories={menu.categories}
      initialLang={initialLang}
      paymentMethods={menu.paymentMethods}
      popularIds={menu.popularIds}
      qrToken={null}
      tableLabel={tableFromQuery(query.table)}
    />
  );
}
