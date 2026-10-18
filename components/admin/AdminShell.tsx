"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Icon from "@/components/menu/Icon";
import AdminFrame, { useAdmin } from "./AdminFrame";
import type { Lang } from "@/lib/i18n-admin";

type ShellProps = {
  initialLang: Lang;
  venueName: string;
  venueNameAr: string | null;
  menuHref: string;
  isOwner: boolean;
  children: ReactNode;
};

export default function AdminShell({ initialLang, children, ...props }: ShellProps) {
  return (
    <AdminFrame className="fda" initialLang={initialLang}>
      <Rail {...props} />
      <main className="fda-main">
        <div className="fda-page">{children}</div>
      </main>
    </AdminFrame>
  );
}

function Rail({ venueName, venueNameAr, menuHref, isOwner }: Omit<ShellProps, "initialLang" | "children">) {
  const { t, lang, switchLanguage } = useAdmin();
  const pathname = usePathname();
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // On a phone the tab bar scrolls sideways; keep the current page's tab in view.
  useEffect(() => {
    navRef.current?.querySelector('[aria-current="page"]')?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  const links = [
    { href: "/admin", label: t.nav.dashboard, icon: "chart" },
    { href: "/admin/orders", label: t.nav.orders, icon: "receipt" },
    { href: "/admin/menu", label: t.nav.menu, icon: "cone" },
    { href: "/admin/tables", label: t.nav.tables, icon: "table" },
    { href: "/admin/settings", label: t.nav.settings, icon: "sliders" },
    ...(isOwner ? [{ href: "/admin/staff", label: t.nav.staff, icon: "users" }] : [])
  ];

  async function signOut() {
    setLeaving(true);
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login");
    router.refresh();
  }

  const venue = lang === "ar" && venueNameAr?.trim() ? venueNameAr : venueName;
  const footer = (
    <>
      <button className="fda-btn fda-btn--soft" onClick={switchLanguage} type="button" aria-label={t.switchLabel}>
        <Icon name="globe" size={20} />
        {t.switchTo}
      </button>
      <button className="fda-btn fda-btn--soft" disabled={leaving} onClick={signOut} type="button">
        <Icon className="fd-flip" name="logout" size={20} />
        {t.signOut}
      </button>
    </>
  );

  return (
    <header className="fda-rail">
      <div className="fda-rail-top">
        <div className="fda-brand">
          <span aria-hidden="true" className="fd-logo">
            <Icon name="cone" size={22} />
          </span>
          <span>{venue}</span>
        </div>
        <div className="fda-tools">
          <button aria-label={t.switchLabel} className="fd-pill-btn" onClick={switchLanguage} type="button">
            {t.switchTo}
          </button>
          <button aria-label={t.signOut} className="fd-icon-btn" disabled={leaving} onClick={signOut} type="button">
            <Icon className="fd-flip" name="logout" size={20} />
          </button>
        </div>
      </div>
      <nav aria-label={t.nav.label} className="fda-nav" ref={navRef}>
        {links.map((link) => (
          <Link aria-current={pathname === link.href ? "page" : undefined} href={link.href} key={link.href}>
            <Icon name={link.icon} size={20} />
            {link.label}
          </Link>
        ))}
        <Link href={menuHref} rel="noreferrer" target="_blank">
          <Icon className="fd-flip" name="external" size={20} />
          {t.nav.publicMenu}
        </Link>
      </nav>
      <div className="fda-rail-foot">{footer}</div>
    </header>
  );
}
