import { notFound } from "next/navigation";
import MenuApp from "@/components/customer/MenuApp";
import { customerState } from "@/lib/customer-state";
import { requestLang } from "@/lib/request-lang";
import { getPublicMenuByQrToken } from "@/lib/store";

// A table's QR code: /t/k7q3-xm9d-4trb. The code stands for the table; it is short enough to
// print under the QR and cannot be guessed from another table's code.
export default async function TablePage({ params }: { params: Promise<{ token: string }> }) {
  const [{ token }, initialLang] = await Promise.all([params, requestLang()]);
  const menu = await getPublicMenuByQrToken(token);
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
      qrToken={token}
      tableLabel={menu.qr.tableLabel}
    />
  );
}
