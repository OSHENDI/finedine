import { notFound } from "next/navigation";
import MenuApp from "@/components/menu/MenuApp";
import { customerState } from "@/lib/customer-state";
import { requestLang, tableFromQuery } from "@/lib/request-lang";
import { getPublicMenu } from "@/lib/store";

export default async function PublicMenuPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ table?: string | string[] }>;
}) {
  const [{ slug }, query, initialLang] = await Promise.all([params, searchParams, requestLang()]);
  const menu = await getPublicMenu(slug);
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
