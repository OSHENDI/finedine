"use client";

import type { ReactNode } from "react";
import { useAdmin } from "./AdminFrame";

const titles = {
  dashboard: (t: ReturnType<typeof useAdmin>["t"]) => t.dashboard.title,
  orders: (t: ReturnType<typeof useAdmin>["t"]) => t.orders.title,
  menu: (t: ReturnType<typeof useAdmin>["t"]) => t.menu.title,
  tables: (t: ReturnType<typeof useAdmin>["t"]) => t.tables.title,
  settings: (t: ReturnType<typeof useAdmin>["t"]) => t.settings.title,
  staff: (t: ReturnType<typeof useAdmin>["t"]) => t.staff.title
};

export default function PageHead({ page, children }: { page: keyof typeof titles; children?: ReactNode }) {
  const { t } = useAdmin();
  return (
    <div className="fda-head">
      <h1>{titles[page](t)}</h1>
      {children}
    </div>
  );
}
