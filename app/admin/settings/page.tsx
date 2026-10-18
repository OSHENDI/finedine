import SettingsBoard from "@/components/SettingsBoard";
import { requireSession } from "@/lib/auth";
import { getSettings } from "@/lib/store";

export default async function SettingsPage() {
  const session = await requireSession();
  const settings = await getSettings(session.businessId);
  if (!settings) return null;
  const { branch, paymentMethods } = settings;

  return (
    <>
      <SettingsBoard
        canEdit={session.role !== "staff"}
        branch={{ name: branch.name, nameAr: branch.nameAr, address: branch.address, phone: branch.phone, currency: branch.currency, isOpen: branch.isOpen }}
        paymentMethods={paymentMethods.map((method) => ({
          id: method.id,
          label: method.label,
          labelAr: method.labelAr,
          type: method.type,
          accountName: method.accountName,
          phone: method.phone,
          details: method.details,
          detailsAr: method.detailsAr,
          isDefault: method.isDefault,
          isActive: method.isActive
        }))}
      />
    </>
  );
}
